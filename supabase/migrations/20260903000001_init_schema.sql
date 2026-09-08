-- Study Royale — consolidated v1 schema
-- Source: docs/10-mvp-build-plan.md, amended by docs/09 (quizzes) and docs/11 (node content).
-- Decisions applied here (docs/10 "Open decisions"):
--   * streak day boundary = per-group local timezone -> groups.timezone
--   * quiz passing threshold default 70% -> section_quizzes.passing_score_pct

-- USERS (extends auth.users — one row per authenticated user)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  username text unique,
  total_xp integer not null default 0,
  level integer not null default 0,
  current_streak integer not null default 0,
  streak_freezes_remaining integer not null default 1,
  created_at timestamptz not null default now()
);

-- GROUPS
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'solo' check (type in ('solo','duo','trio','squad')),
  max_members integer not null default 4 check (max_members between 1 and 4),
  daily_goal_minutes integer not null default 30 check (daily_goal_minutes > 0),
  timezone text not null default 'UTC',
  created_by uuid not null references public.users(id),
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  role text not null default 'member' check (role in ('owner','member')),
  primary key (group_id, user_id)
);

-- ROADMAPS / COURSES
create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  description text,
  is_template boolean not null default false,
  created_by uuid references public.users(id),
  source_type text not null check (source_type in ('official','user_created','ai_generated','imported')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  forked_from_id uuid references public.roadmaps(id),
  slug text unique,
  created_at timestamptz not null default now()
);

create table public.roadmap_sections (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  order_index integer not null,
  title text not null,
  unique (roadmap_id, order_index)
);

create table public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.roadmap_sections(id) on delete cascade,
  order_index integer not null,
  title text not null,
  description text,
  resource_url text,
  -- In-app lesson body (markdown): the PRIMARY study material rendered in the
  -- node detail panel (docs/11-node-content-model.md). resource_url is only a
  -- secondary "go deeper" link.
  content text,
  is_optional boolean not null default false,
  requirement_type text not null check (requirement_type in ('time','checkoff','quiz')),
  requirement_value integer,
  unique (section_id, order_index)
);

create table public.group_roadmaps (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id),
  current_section_index integer not null default 0,
  started_at timestamptz not null default now(),
  unique (group_id, roadmap_id)
);

create table public.member_node_progress (
  id uuid primary key default gen_random_uuid(),
  group_roadmap_id uuid not null references public.group_roadmaps(id) on delete cascade,
  roadmap_node_id uuid not null references public.roadmap_nodes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  completed_at timestamptz,
  unique (group_roadmap_id, roadmap_node_id, user_id)
);

-- STUDY SESSIONS / XP
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  -- Optional tag linking a session to the node being studied. Required for the
  -- time to count toward node progress and the phase leaderboard (docs/09).
  roadmap_node_id uuid references public.roadmap_nodes(id) on delete set null,
  started_at timestamptz not null default now(),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  subject text,
  completed_at timestamptz
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.study_sessions(id) on delete cascade,
  xp_earned integer not null,
  reason text not null check (reason in ('session','daily_bonus','quiz_pass','achievement')),
  created_at timestamptz not null default now()
);

-- STREAKS
create table public.group_streaks (
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  hit_goal boolean not null default false,
  primary key (group_id, date)
);

-- ACHIEVEMENTS
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  icon text
);

create table public.user_achievements (
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- QUIZZES (docs/09-quizzes-and-leaderboards.md)
create table public.section_quizzes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.roadmap_sections(id) on delete cascade,
  title text not null,
  passing_score_pct integer not null default 70 check (passing_score_pct between 1 and 100),
  created_at timestamptz not null default now(),
  unique (section_id)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.section_quizzes(id) on delete cascade,
  order_index integer not null,
  question_text text not null,
  options jsonb not null,
  correct_option_index integer not null,
  explanation text,
  unique (quiz_id, order_index)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.section_quizzes(id) on delete cascade,
  group_roadmap_id uuid not null references public.group_roadmaps(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  attempt_number integer not null,
  score_pct integer not null check (score_pct between 0 and 100),
  passed boolean not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (quiz_id, user_id, attempt_number)
);

-- Indexes
create index study_sessions_user_node_idx on public.study_sessions (user_id, roadmap_node_id);
create index study_sessions_group_started_idx on public.study_sessions (group_id, started_at);
create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at);
create index xp_events_user_idx on public.xp_events (user_id);
create index xp_events_session_idx on public.xp_events (session_id);
create index member_node_progress_group_user_idx on public.member_node_progress (group_roadmap_id, user_id);
create index quiz_attempts_quiz_user_idx on public.quiz_attempts (quiz_id, user_id);
create index group_members_user_idx on public.group_members (user_id);
create index roadmap_sections_roadmap_idx on public.roadmap_sections (roadmap_id, order_index);
create index roadmap_nodes_section_idx on public.roadmap_nodes (section_id, order_index);

-- Mirror new auth.users into public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'student'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
