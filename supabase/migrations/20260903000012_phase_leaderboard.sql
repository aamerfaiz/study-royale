-- Per-group, per-phase XP leaderboard (docs/09, docs/10 step 9).
--
-- Ranks members by the XP they earned *inside a phase*: session XP whose
-- underlying session was tagged to a node in that section, plus the quiz-pass
-- bonus for that section's quiz. Untagged general study still keeps the streak
-- alive but doesn't move the phase leaderboard — the distinction docs/09 draws.
--
-- xp_events only pointed at a session, so a 'quiz_pass' row had nothing tying it
-- to the phase it came from. Rather than infer the link from timestamps, give it
-- a real foreign key.
alter table public.xp_events
  add column quiz_attempt_id uuid references public.quiz_attempts(id) on delete cascade;

create index xp_events_quiz_attempt_idx on public.xp_events (quiz_attempt_id);

-- Record the attempt the bonus came from.
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
    insert into public.xp_events (user_id, xp_earned, reason, quiz_attempt_id)
    values (uid, awarded, 'quiz_pass', aid);
    perform public.refresh_user_xp(uid);
  end if;

  if did_pass then
    perform public.advance_group_section(p_group_roadmap_id);
  end if;

  return query select aid, pct, did_pass, (did_pass and not had_passed), awarded, detail;
end;
$$;

create or replace function public.phase_leaderboard(
  p_group_id uuid,
  p_section_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  xp integer,
  minutes integer,
  last_earned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select e.user_id, e.xp_earned, e.created_at
      from public.xp_events e
      join public.study_sessions s on s.id = e.session_id
      join public.roadmap_nodes n on n.id = s.roadmap_node_id
     where s.group_id = p_group_id
       and n.section_id = p_section_id
    union all
    select e.user_id, e.xp_earned, e.created_at
      from public.xp_events e
      join public.quiz_attempts a on a.id = e.quiz_attempt_id
      join public.section_quizzes q on q.id = a.quiz_id
     where q.section_id = p_section_id
       and a.group_roadmap_id in (
         select gr.id from public.group_roadmaps gr where gr.group_id = p_group_id
       )
  ),
  member_minutes as (
    select s.user_id, coalesce(sum(s.duration_minutes), 0)::integer as minutes
      from public.study_sessions s
      join public.roadmap_nodes n on n.id = s.roadmap_node_id
     where s.group_id = p_group_id and n.section_id = p_section_id
     group by s.user_id
  )
  select
    gm.user_id,
    u.display_name,
    u.avatar_url,
    coalesce(sum(sc.xp_earned), 0)::integer as xp,
    coalesce(max(mm.minutes), 0) as minutes,
    max(sc.created_at) as last_earned_at
  from public.group_members gm
  join public.users u on u.id = gm.user_id
  left join scoped sc on sc.user_id = gm.user_id
  left join member_minutes mm on mm.user_id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id)
  group by gm.user_id, u.display_name, u.avatar_url
  -- Ties break on who got there first (docs/10).
  order by xp desc, last_earned_at asc nulls last, u.display_name asc;
$$;

revoke all on function public.phase_leaderboard(uuid, uuid) from public, anon;
grant execute on function public.phase_leaderboard(uuid, uuid) to authenticated;
