-- Study Royale — Row Level Security
-- Principle (docs/10): a user has full access to their own rows, read-only
-- access to rows belonging to a group they are a member of, and read access to
-- official/public course content. Writes that award XP or advance the group are
-- funnelled through security-definer RPCs, not direct table writes.

-- ---------------------------------------------------------------------------
-- Helpers. security definer so they bypass RLS and cannot recurse into the
-- policies that call them (group_members policies query group_members).
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.shares_group_with(p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select p_user_id = auth.uid() or exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

-- Is auth.uid() a member of the group that owns this group_roadmap row?
create or replace function public.can_access_group_roadmap(p_group_roadmap_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.group_roadmaps gr
    join public.group_members gm on gm.group_id = gr.group_id
    where gr.id = p_group_roadmap_id and gm.user_id = auth.uid()
  );
$$;

-- Course content is readable by any authenticated user when it is official or
-- public — a user must be able to browse the course before joining a group.
create or replace function public.roadmap_is_readable(p_roadmap_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.roadmaps r
    where r.id = p_roadmap_id
      and (r.visibility = 'public' or r.source_type = 'official' or r.created_by = auth.uid())
  );
$$;

create or replace function public.section_is_readable(p_section_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.roadmap_sections s
    where s.id = p_section_id and public.roadmap_is_readable(s.roadmap_id)
  );
$$;

-- Group capacity: never let a group exceed max_members.
create or replace function public.enforce_group_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  member_count integer;
  cap integer;
begin
  select max_members into cap from public.groups where id = new.group_id for update;
  select count(*) into member_count from public.group_members where group_id = new.group_id;
  if member_count >= cap then
    raise exception 'Group is full (max % members)', cap using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger group_members_capacity
  before insert on public.group_members
  for each row execute function public.enforce_group_capacity();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_sections enable row level security;
alter table public.roadmap_nodes enable row level security;
alter table public.group_roadmaps enable row level security;
alter table public.member_node_progress enable row level security;
alter table public.study_sessions enable row level security;
alter table public.xp_events enable row level security;
alter table public.group_streaks enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.section_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- USERS ---------------------------------------------------------------------
create policy "users: read self and groupmates" on public.users
  for select to authenticated using (public.shares_group_with(id));

create policy "users: update self" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- GROUPS --------------------------------------------------------------------
create policy "groups: members read" on public.groups
  for select to authenticated using (public.is_group_member(id));

create policy "groups: creator inserts" on public.groups
  for insert to authenticated with check (created_by = auth.uid());

create policy "groups: owner updates" on public.groups
  for update to authenticated using (public.is_group_owner(id)) with check (public.is_group_owner(id));

create policy "groups: owner deletes" on public.groups
  for delete to authenticated using (public.is_group_owner(id));

-- GROUP MEMBERS -------------------------------------------------------------
create policy "group_members: members read" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

-- Joining by invite code goes through join_group_by_invite(); this covers the
-- owner row written when a group is created.
create policy "group_members: join self" on public.group_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "group_members: leave self or owner removes" on public.group_members
  for delete to authenticated using (user_id = auth.uid() or public.is_group_owner(group_id));

-- COURSE CONTENT (read-only to clients; seeded with the service role) --------
create policy "roadmaps: read official/public/own" on public.roadmaps
  for select to authenticated
  using (visibility = 'public' or source_type = 'official' or created_by = auth.uid());

create policy "roadmap_sections: read readable roadmaps" on public.roadmap_sections
  for select to authenticated using (public.roadmap_is_readable(roadmap_id));

create policy "roadmap_nodes: read readable sections" on public.roadmap_nodes
  for select to authenticated using (public.section_is_readable(section_id));

create policy "section_quizzes: read readable sections" on public.section_quizzes
  for select to authenticated using (public.section_is_readable(section_id));

-- quiz_questions deliberately has NO policy: correct_option_index must never
-- reach a client (docs/10). RLS with no policy denies every client read; the
-- take-quiz and grading paths use get_quiz_questions()/submit_quiz_attempt().

-- GROUP ROADMAPS ------------------------------------------------------------
create policy "group_roadmaps: members read" on public.group_roadmaps
  for select to authenticated using (public.is_group_member(group_id));

create policy "group_roadmaps: owner starts a course" on public.group_roadmaps
  for insert to authenticated with check (public.is_group_owner(group_id));

create policy "group_roadmaps: owner updates" on public.group_roadmaps
  for update to authenticated using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

-- MEMBER NODE PROGRESS ------------------------------------------------------
create policy "progress: group reads" on public.member_node_progress
  for select to authenticated using (public.can_access_group_roadmap(group_roadmap_id));

create policy "progress: write own" on public.member_node_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_group_roadmap(group_roadmap_id));

create policy "progress: update own" on public.member_node_progress
  for update to authenticated
  using (user_id = auth.uid() and public.can_access_group_roadmap(group_roadmap_id))
  with check (user_id = auth.uid());

-- STUDY SESSIONS ------------------------------------------------------------
create policy "sessions: own full access" on public.study_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sessions: groupmates read" on public.study_sessions
  for select to authenticated using (group_id is not null and public.is_group_member(group_id));

-- XP EVENTS (written only by log_study_session/submit_quiz_attempt) ----------
create policy "xp_events: read self and groupmates" on public.xp_events
  for select to authenticated using (public.shares_group_with(user_id));

-- STREAKS (written only by the evaluate-streaks function) --------------------
create policy "group_streaks: members read" on public.group_streaks
  for select to authenticated using (public.is_group_member(group_id));

-- ACHIEVEMENTS --------------------------------------------------------------
create policy "achievements: readable by all" on public.achievements
  for select to authenticated using (true);

create policy "user_achievements: read self and groupmates" on public.user_achievements
  for select to authenticated using (public.shares_group_with(user_id));

-- QUIZ ATTEMPTS (written only by submit_quiz_attempt) -----------------------
create policy "quiz_attempts: read self and groupmates" on public.quiz_attempts
  for select to authenticated using (public.shares_group_with(user_id));
