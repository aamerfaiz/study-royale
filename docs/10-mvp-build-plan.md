# MVP Build Plan — Handover to Claude Code

This is the entry point for this handover package. Read this file first —
it tells you what to build, in what order, and which of the other files in
this folder to read for detail on each piece. It supersedes nothing in the
other docs; it consolidates and sequences them into something buildable.

## Package contents
```
00-overview.md                       product vision, pillars, group sizes
01-tech-stack.md                     Next.js + Supabase decisions
02-data-model.md                     original full schema (all phases)
03-gamification-engine.md            XP/level formulas
04-groups-and-streaks.md             group formation, streak/grace rules
05-courses-and-roadmaps.md           course structure, gating, React Flow UI
06-ai-generation-byok.md             v2 scope — not building yet
07-marketplace-social.md             v3 scope — not building yet
08-mvp-scope-phasing.md              v1/v2/v3 phasing (original)
09-quizzes-and-leaderboards.md       phase-quiz + leaderboard design (added to v1)
10-mvp-build-plan.md                 THIS FILE — build order + consolidated schema
11-node-content-model.md             in-app lesson content — the app is a content
                                     platform, not a timer pointing at links
courses/001-course-ai-fullstack-engineer.md   the official v1 course, fully
                                     seed-ready: roadmap JSON + quiz JSON + lesson
                                     content JSON (node bodies)
```

## What v1 actually is
Per `08-mvp-scope-phasing.md`, amended by `09-quizzes-and-leaderboards.md`:
Google auth, groups (solo→squad, invite codes), manual study session
logging, XP + levels, group streaks + grace period, one hardcoded official
course rendered as a React Flow roadmap, phase-end quizzes gating section
advancement, and a per-group per-phase XP leaderboard. **No AI generation,
no BYOK, no marketplace** — those stay v2/v3 and nothing here should block
on them (the schema below reserves the columns/fields v2 needs, per the
original docs, but v2 tables like `user_api_keys` and v3 tables like
`roadmap_likes` are out of scope for this build and omitted from the DDL
below — add them when those phases start).

The one official course ships **with real content, not a stub**: the full
roadmap (8 sections, ~50 nodes), 6 section quizzes (30 real MCQs total),
and full in-app lesson content for every topic/build node are already
written in `courses/001-course-ai-fullstack-engineer.md`. Seed that data —
don't placeholder it.

**Important scope point, easy to miss if you only skim the schema:**
this app is not a timer pointed at outside links. A member studies *in
the app* — the node detail panel renders real lesson content (the
`content` field below), and `resource_url` is just an optional "go
deeper" link, not the primary material. See `11-node-content-model.md`
for the schema addition, the UI implication, and why this is core v1
scope rather than a v2 nice-to-have.

## Consolidated v1 schema (Postgres / Supabase)

This merges `02-data-model.md`'s v1-relevant tables with the additions
from `09-quizzes-and-leaderboards.md` (`section_quizzes`, `quiz_questions`,
`quiz_attempts`, and `study_sessions.roadmap_node_id`) into one migration.
Treat this as a first draft — review types/constraints against your actual
Supabase project before applying, and add RLS (see below) in the same
migration or immediately after.

```sql
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
  type text not null check (type in ('solo','duo','trio','squad')),
  max_members integer not null default 4,
  daily_goal_minutes integer not null default 30,
  created_by uuid not null references public.users(id),
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
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
  content text, -- NEW: in-app lesson body (markdown), the primary study
                -- material rendered in the node detail panel — see
                -- 11-node-content-model.md. resource_url stays as a
                -- secondary "go deeper" link, not the primary source.
  is_optional boolean not null default false,
  requirement_type text not null check (requirement_type in ('time','checkoff','quiz')),
  requirement_value integer, -- minutes, when requirement_type = 'time'
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
  group_id uuid references public.groups(id),
  roadmap_node_id uuid references public.roadmap_nodes(id), -- NEW: optional tag,
                                            -- links a session to the node it
                                            -- was studying; required for that
                                            -- time to count toward node
                                            -- progress and the phase leaderboard
  started_at timestamptz not null default now(),
  duration_minutes integer not null check (duration_minutes > 0),
  subject text,
  completed_at timestamptz
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.study_sessions(id),
  xp_earned integer not null,
  reason text not null, -- 'session' | 'daily_bonus' | 'quiz_pass' | 'achievement'
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

-- QUIZZES (new in v1 per 09-quizzes-and-leaderboards.md)
create table public.section_quizzes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.roadmap_sections(id) on delete cascade,
  title text not null,
  passing_score_pct integer not null default 70,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.section_quizzes(id) on delete cascade,
  order_index integer not null,
  question_text text not null,
  options jsonb not null, -- array of option strings
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
  score_pct integer not null,
  passed boolean not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Helpful indexes
create index on public.study_sessions (user_id, roadmap_node_id);
create index on public.study_sessions (group_id, started_at);
create index on public.xp_events (user_id);
create index on public.member_node_progress (group_roadmap_id, user_id);
create index on public.quiz_attempts (quiz_id, user_id);
create index on public.group_members (user_id);
```

## RLS (Row Level Security)
Every table above holds group-scoped or user-scoped data — enable RLS on
all of them (`alter table ... enable row level security;`) before this
touches real users. Principle: a user can always read/write their own
rows; a user can read (not write) rows belonging to a group they're a
member of. Two representative policies to start from — write the rest
following the same pattern:

```sql
alter table public.study_sessions enable row level security;

create policy "own sessions: full access"
on public.study_sessions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "group sessions: read-only for groupmates"
on public.study_sessions for select
using (
  group_id in (select group_id from public.group_members where user_id = auth.uid())
);
```

`roadmaps`/`roadmap_sections`/`roadmap_nodes`/`section_quizzes`/
`quiz_questions` for `visibility = 'public'` or `source_type = 'official'`
should be readable by any authenticated user (no group scoping needed —
there's only one official course in v1, and it's meant to be visible to
everyone before they even join a group).

`quiz_questions.correct_option_index` is sensitive — don't expose it in
any client-facing "take quiz" query; only return it (server-side) when
grading a submitted attempt, or gate it behind a view/RPC that strips it
until after submission.

## Edge Functions
- **`evaluate-streaks`** — nightly, triggered by `pg_cron`. For each
  active group, checks whether every member logged a session "yesterday"
  (see open question on day-boundary below); writes `group_streaks` row;
  consumes a `streak_freezes_remaining` for anyone who missed but had one
  available; resets `streak_freezes_remaining` to 1 on the Monday
  calendar-week boundary. See `04-groups-and-streaks.md` for the exact
  rules.
- No other Edge Functions are needed for v1 — BYOK/AI-generation
  functions (`06-ai-generation-byok.md`) are v2 scope, don't build them
  now.

## Build order (milestones)
1. **Project setup** — Supabase project, Google OAuth, this schema
   migration + RLS, Next.js app scaffold.
2. **Groups** — create group (defaults to solo), join via invite code,
   member list, group settings (daily goal, name).
3. **Study sessions + XP** — manual log/timer UI, `xp_events` insert on
   session save (formula in `03-gamification-engine.md`: `round(10 *
   sqrt(minutes))` + flat `+20` first-session-of-day bonus), level
   recompute (`floor(sqrt(total_xp / 100))`).
4. **Streaks** — `evaluate-streaks` Edge Function + `pg_cron` schedule,
   streak display in UI.
5. **Seed the official course** — insert
   `courses/001-course-ai-fullstack-engineer.md`'s roadmap JSON, quiz
   JSON, and lesson-content JSON into `roadmaps`/`roadmap_sections`/
   `roadmap_nodes`/`section_quizzes`/`quiz_questions` as
   `source_type: 'official'`, `visibility: 'public'`. The file has three
   JSON blocks — roadmap, quizzes, and `## Lesson content (node bodies)`
   — the third maps onto `roadmap_nodes.content` by `(section_order,
   node_title)`; see `11-node-content-model.md` for the merge approach.
   A one-off seed script reading all three blocks is the simplest
   approach — the JSON is already shaped to match the tables 1:1.
6. **Roadmap UI** — React Flow rendering per `05-courses-and-roadmaps.md`
   (locked/unlocked/done/optional node states, auto-layout per section,
   node detail panel with per-member status), group joins the course
   (`group_roadmaps` row), session logging can tag `roadmap_node_id`.
   **Node detail panel renders `content` as the primary, dominant
   element** — this is the actual lesson a member reads before logging a
   session, not an afterthought; `resource_url`, when present, renders
   as a smaller secondary link below it. See `11-node-content-model.md`.
7. **Section-clearing logic** — a member "clears" a section when all
   required nodes are `done` **and** they have a passing `quiz_attempts`
   row for that section's quiz (skip the quiz check for sections with no
   `section_quizzes` row — Orientation and Portfolio Projects have none).
   Group advances `current_section_index` when every active member has
   cleared.
8. **Quiz UI** — take-quiz flow, scoring, `+30 XP` flat bonus on first
   pass (reason: `'quiz_pass'`) — confirm this bonus amount before
   building, it's flagged open in `09-quizzes-and-leaderboards.md`.
9. **Phase leaderboard** — per-group, per-section ranking by summed
   `xp_events.xp_earned` where the underlying session's `roadmap_node_id`
   falls in that section; tie-break by most recent completion timestamp.
10. **Achievements** — unlock conditions, `user_achievements` insert,
    simple notification/toast.
11. **Activity feed (optional layer)** — Supabase Realtime subscription on
    `study_sessions` inserts, per `04-groups-and-streaks.md`.
12. **QA pass** — RLS audit (try reading another group's data as a
    non-member), empty states (no group yet, no sessions yet, quiz never
    attempted), streak/freeze edge cases, mobile layout check on the
    React Flow canvas.

## Open decisions Claude Code should confirm before building (not yet settled)
- **Day boundary for streaks**: use UTC calendar day for v1 simplicity, or
  each group's local timezone? Original docs don't specify; UTC is the
  simpler default but can feel wrong to users in other timezones ("it's
  still today for me"). Flag this rather than guessing silently.
- **Quiz-pass XP bonus**: build with the suggested flat `+30 XP`, but
  it's explicitly unconfirmed — easy to make it a named constant so it's
  a one-line change either way.
- **Passing threshold**: all six quizzes are seeded at 70%; confirm that's
  fine before launch rather than per-section tuning now.
- **What happens to `member_node_progress` for a member who leaves a
  group mid-roadmap**: original docs don't cover this; simplest v1
  behavior is to leave the rows as historical record and just stop
  counting that user in the "every active member" gating check.
