-- Close the loop between logging time and roadmap progress.
--
-- docs/09 flagged this as a real gap in the original model: nothing connected a
-- session to node progress for requirement_type 'time' nodes. Now a tagged
-- session accumulates against the node's requirement_value and marks it done
-- once met, and passing a section quiz re-checks whether the group can advance.

create or replace function public.log_study_session(
  p_group_id uuid,
  p_duration_minutes integer,
  p_subject text default null,
  p_roadmap_node_id uuid default null,
  p_started_at timestamptz default now()
)
returns table (
  session_id uuid,
  xp_awarded integer,
  daily_bonus integer,
  new_total_xp integer,
  new_level integer,
  node_completed boolean
)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  base_xp integer;
  bonus integer := 0;
  local_day date;
  already_today boolean;
  totals record;
  gr_id uuid;
  req_type text;
  req_value integer;
  total_minutes integer;
  completed boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_duration_minutes is null or p_duration_minutes <= 0 then
    raise exception 'duration_minutes must be positive';
  end if;
  if p_group_id is not null and not public.is_group_member(p_group_id) then
    raise exception 'Not a member of that group' using errcode = '42501';
  end if;

  local_day := public.group_local_date(p_group_id, p_started_at);

  select exists (
    select 1 from public.study_sessions s
     where s.user_id = uid
       and public.group_local_date(p_group_id, s.started_at) = local_day
  ) into already_today;

  insert into public.study_sessions (user_id, group_id, roadmap_node_id, started_at, duration_minutes, subject, completed_at)
  values (uid, p_group_id, p_roadmap_node_id, p_started_at, p_duration_minutes, p_subject, now())
  returning id into sid;

  base_xp := public.session_xp(p_duration_minutes);
  insert into public.xp_events (user_id, session_id, xp_earned, reason)
  values (uid, sid, base_xp, 'session');

  if not already_today then
    bonus := public.config_value('daily_bonus_xp');
    insert into public.xp_events (user_id, session_id, xp_earned, reason)
    values (uid, sid, bonus, 'daily_bonus');
  end if;

  if p_roadmap_node_id is not null and p_group_id is not null then
    select gr.id, n.requirement_type, n.requirement_value
      into gr_id, req_type, req_value
      from public.group_roadmaps gr
      join public.roadmap_sections s on s.roadmap_id = gr.roadmap_id
      join public.roadmap_nodes n on n.section_id = s.id
     where gr.group_id = p_group_id and n.id = p_roadmap_node_id;

    if gr_id is not null then
      insert into public.member_node_progress (group_roadmap_id, roadmap_node_id, user_id, status)
      values (gr_id, p_roadmap_node_id, uid, 'in_progress')
      on conflict (group_roadmap_id, roadmap_node_id, user_id) do nothing;

      -- A 'time' node completes itself once the logged minutes meet its target.
      if req_type = 'time' and req_value is not null then
        select coalesce(sum(s.duration_minutes), 0) into total_minutes
          from public.study_sessions s
         where s.user_id = uid and s.roadmap_node_id = p_roadmap_node_id;

        if total_minutes >= req_value then
          update public.member_node_progress
             set status = 'done', completed_at = coalesce(completed_at, now())
           where group_roadmap_id = gr_id
             and roadmap_node_id = p_roadmap_node_id
             and user_id = uid
             and status <> 'done';
          completed := true;
          perform public.advance_group_section(gr_id);
        end if;
      end if;
    end if;
  end if;

  perform public.refresh_user_xp(uid);
  select u.total_xp, u.level into totals from public.users u where u.id = uid;

  return query select sid, base_xp, bonus, totals.total_xp, totals.level, completed;
end;
$$;

-- Passing a quiz can clear the last requirement on a section, so re-check.
create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_group_roadmap_id uuid,
  p_answers jsonb
)
returns table (
  attempt_id uuid,
  score_pct integer,
  passed boolean,
  first_pass boolean,
  xp_awarded integer,
  results jsonb
)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  threshold integer;
  total_q integer;
  correct_q integer := 0;
  pct integer;
  did_pass boolean;
  had_passed boolean;
  attempt integer;
  aid uuid;
  awarded integer := 0;
  detail jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can_access_group_roadmap(p_group_roadmap_id) then
    raise exception 'Not a member of that group' using errcode = '42501';
  end if;

  select sq.passing_score_pct into threshold from public.section_quizzes sq where sq.id = p_quiz_id;
  if threshold is null then
    raise exception 'Quiz not found' using errcode = 'no_data_found';
  end if;

  select count(*) into total_q from public.quiz_questions q where q.quiz_id = p_quiz_id;
  if total_q = 0 then
    raise exception 'Quiz has no questions';
  end if;

  select
    count(*) filter (where (p_answers ->> q.id::text)::integer is not distinct from q.correct_option_index),
    jsonb_agg(jsonb_build_object(
      'question_id', q.id,
      'order_index', q.order_index,
      'selected_option_index', (p_answers ->> q.id::text)::integer,
      'correct_option_index', q.correct_option_index,
      'correct', (p_answers ->> q.id::text)::integer is not distinct from q.correct_option_index,
      'explanation', q.explanation
    ) order by q.order_index)
  into correct_q, detail
  from public.quiz_questions q
  where q.quiz_id = p_quiz_id;

  pct := round(correct_q * 100.0 / total_q)::integer;
  did_pass := pct >= threshold;

  select coalesce(bool_or(a.passed), false), coalesce(max(a.attempt_number), 0)
    into had_passed, attempt
    from public.quiz_attempts a where a.quiz_id = p_quiz_id and a.user_id = uid;

  insert into public.quiz_attempts (quiz_id, group_roadmap_id, user_id, attempt_number, score_pct, passed, completed_at)
  values (p_quiz_id, p_group_roadmap_id, uid, attempt + 1, pct, did_pass, now())
  returning id into aid;

  -- Retakes are unlimited and free, but XP is granted once (docs/09).
  if did_pass and not had_passed then
    awarded := public.config_value('quiz_pass_xp');
    insert into public.xp_events (user_id, xp_earned, reason) values (uid, awarded, 'quiz_pass');
    perform public.refresh_user_xp(uid);
  end if;

  if did_pass then
    perform public.advance_group_section(p_group_roadmap_id);
  end if;

  return query select aid, pct, did_pass, (did_pass and not had_passed), awarded, detail;
end;
$$;

revoke all on function public.log_study_session(uuid, integer, text, uuid, timestamptz) from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, uuid, jsonb) from public, anon;
grant execute on function public.log_study_session(uuid, integer, text, uuid, timestamptz) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, uuid, jsonb) to authenticated;
