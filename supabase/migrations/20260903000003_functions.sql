-- Study Royale — server-side RPCs
-- Anything that awards XP, advances the group, or touches quiz answers lives
-- here as security definer so the client cannot forge it.
--
-- Tunable constants (docs/10 flagged these as open; confirmed defaults):
--   session XP        round(10 * sqrt(minutes))     docs/03
--   daily bonus       +20, first session of the day docs/03
--   quiz pass bonus   +30, first pass only          docs/09  <- app_config
--   passing threshold 70%                           section_quizzes.passing_score_pct

create table public.app_config (
  key text primary key,
  value integer not null,
  description text
);

insert into public.app_config (key, value, description) values
  ('daily_bonus_xp', 20, 'Flat XP for a user''s first qualifying session each day'),
  ('quiz_pass_xp',   30, 'Flat XP for the first pass of a section quiz');

alter table public.app_config enable row level security;
create policy "app_config: readable by all" on public.app_config
  for select to authenticated using (true);

create or replace function public.config_value(p_key text)
returns integer language sql stable security definer set search_path = public as $$
  select value from public.app_config where key = p_key;
$$;

-- XP formulas (docs/03-gamification-engine.md) ------------------------------
create or replace function public.session_xp(p_minutes integer)
returns integer language sql immutable as $$
  select round(10 * sqrt(greatest(p_minutes, 0)))::integer;
$$;

create or replace function public.level_for_xp(p_total_xp integer)
returns integer language sql immutable as $$
  select floor(sqrt(greatest(p_total_xp, 0) / 100.0))::integer;
$$;

-- Recompute a user's cached total_xp/level from xp_events (single source of truth).
create or replace function public.refresh_user_xp(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  total integer;
begin
  select coalesce(sum(xp_earned), 0) into total from public.xp_events where user_id = p_user_id;
  update public.users
     set total_xp = total,
         level = public.level_for_xp(total)
   where id = p_user_id;
end;
$$;

-- The calendar day a timestamp falls on, in a group's local timezone (docs/10:
-- day boundary resolved as per-group local time, not UTC).
create or replace function public.group_local_date(p_group_id uuid, p_at timestamptz)
returns date language sql stable security definer set search_path = public as $$
  select (p_at at time zone coalesce(
    (select timezone from public.groups where id = p_group_id), 'UTC'
  ))::date;
$$;

-- GROUPS --------------------------------------------------------------------
create or replace function public.create_group(
  p_name text,
  p_daily_goal_minutes integer default 30,
  p_timezone text default 'UTC'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.groups (name, type, daily_goal_minutes, timezone, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'My Study Group'),
          'solo', greatest(p_daily_goal_minutes, 1), coalesce(p_timezone, 'UTC'), auth.uid())
  returning id into new_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

-- Group type is derived from headcount (solo/duo/trio/squad, docs/00).
create or replace function public.sync_group_type()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gid uuid := coalesce(new.group_id, old.group_id);
  n integer;
begin
  select count(*) into n from public.group_members where group_id = gid;
  update public.groups
     set type = case n when 0 then 'solo' when 1 then 'solo' when 2 then 'duo' when 3 then 'trio' else 'squad' end
   where id = gid;
  return null;
end;
$$;

create trigger group_members_sync_type
  after insert or delete on public.group_members
  for each row execute function public.sync_group_type();

create or replace function public.join_group_by_invite(p_invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select id into gid from public.groups
   where invite_code = upper(trim(p_invite_code));

  if gid is null then
    raise exception 'No group found for that invite code' using errcode = 'no_data_found';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return gid;
end;
$$;

-- Look up a group by invite code without joining it (join screen preview).
create or replace function public.preview_group_by_invite(p_invite_code text)
returns table (id uuid, name text, member_count bigint, max_members integer, daily_goal_minutes integer)
language sql stable security definer set search_path = public as $$
  select g.id, g.name,
         (select count(*) from public.group_members m where m.group_id = g.id),
         g.max_members, g.daily_goal_minutes
    from public.groups g
   where g.invite_code = upper(trim(p_invite_code));
$$;

-- STUDY SESSIONS + XP -------------------------------------------------------
create or replace function public.log_study_session(
  p_group_id uuid,
  p_duration_minutes integer,
  p_subject text default null,
  p_roadmap_node_id uuid default null,
  p_started_at timestamptz default now()
)
returns table (session_id uuid, xp_awarded integer, daily_bonus integer, new_total_xp integer, new_level integer)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  base_xp integer;
  bonus integer := 0;
  local_day date;
  already_today boolean;
  totals record;
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

  -- First qualifying session of the local day? (docs/03 daily consistency bonus)
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

  -- A tagged session moves that node to in_progress for this member.
  if p_roadmap_node_id is not null and p_group_id is not null then
    insert into public.member_node_progress (group_roadmap_id, roadmap_node_id, user_id, status)
    select gr.id, p_roadmap_node_id, uid, 'in_progress'
      from public.group_roadmaps gr
      join public.roadmap_sections s on s.roadmap_id = gr.roadmap_id
      join public.roadmap_nodes n on n.section_id = s.id
     where gr.group_id = p_group_id and n.id = p_roadmap_node_id
    on conflict (group_roadmap_id, roadmap_node_id, user_id) do nothing;
  end if;

  perform public.refresh_user_xp(uid);
  select total_xp, level into totals from public.users where id = uid;

  return query select sid, base_xp, bonus, totals.total_xp, totals.level;
end;
$$;

-- QUIZZES -------------------------------------------------------------------
-- Questions without the answer key. This is the only path a client may use.
create or replace function public.get_quiz_questions(p_quiz_id uuid)
returns table (id uuid, order_index integer, question_text text, options jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, q.order_index, q.question_text, q.options
    from public.quiz_questions q
    join public.section_quizzes sq on sq.id = q.quiz_id
   where q.quiz_id = p_quiz_id
     and public.section_is_readable(sq.section_id)
   order by q.order_index;
$$;

-- Grade a submitted attempt. p_answers is {"<question_id>": <option_index>, ...}.
-- Returns the score plus per-question correctness and explanations — the answer
-- key is only ever revealed after submission (docs/09).
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

  select passing_score_pct into threshold from public.section_quizzes where id = p_quiz_id;
  if threshold is null then
    raise exception 'Quiz not found' using errcode = 'no_data_found';
  end if;

  select count(*) into total_q from public.quiz_questions where quiz_id = p_quiz_id;
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

  select coalesce(bool_or(passed), false), coalesce(max(attempt_number), 0)
    into had_passed, attempt
    from public.quiz_attempts where quiz_id = p_quiz_id and user_id = uid;

  insert into public.quiz_attempts (quiz_id, group_roadmap_id, user_id, attempt_number, score_pct, passed, completed_at)
  values (p_quiz_id, p_group_roadmap_id, uid, attempt + 1, pct, did_pass, now())
  returning id into aid;

  -- Retakes are unlimited and free, but XP is granted once (docs/09).
  if did_pass and not had_passed then
    awarded := public.config_value('quiz_pass_xp');
    insert into public.xp_events (user_id, xp_earned, reason) values (uid, awarded, 'quiz_pass');
    perform public.refresh_user_xp(uid);
  end if;

  return query select aid, pct, did_pass, (did_pass and not had_passed), awarded, detail;
end;
$$;

-- Lock down execute: these are the client's only write path.
revoke all on function public.refresh_user_xp(uuid) from public, anon, authenticated;
revoke all on function public.config_value(text) from public, anon;
