# Study Royale

Study a little, together, every day.

A small-group study accountability app: form a group of up to four, log study
sessions, earn XP tuned to reward consistency over cramming, and keep a shared
streak alive. Learning is structured as roadmap-style courses whose lessons are
read **in the app**, with a quiz gating the end of every section.

The full product design lives in [`docs/`](./docs) — start with
[`docs/10-mvp-build-plan.md`](./docs/10-mvp-build-plan.md).

## Stack

- **Next.js** (App Router, TypeScript, Tailwind)
- **Supabase** — Postgres, Google OAuth, RLS, Edge Functions
- **React Flow** (`@xyflow/react`) for the roadmap canvas

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the service-role key
npm run dev
```

### Supabase setup

The schema in `supabase/migrations/` is already applied to the project. To point
at a different project, run the migrations in filename order.

Google sign-in needs the provider enabled once in the Supabase dashboard
(Authentication → Providers → Google) with these redirect URLs allow-listed:

- `http://localhost:3000/auth/callback`
- `https://<your-domain>/auth/callback`

## Seeding the official course

The v1 course ships as content, not a stub:
`docs/courses/001-course-ai-fullstack-engineer.md` holds the roadmap, the
section quizzes, and a lesson body for every topic. `npm run export:course`
merges those three blocks into `supabase/seed/`, and `npm run seed:course`
writes them to the database (needs `SUPABASE_SERVICE_ROLE_KEY`; pass
`--sql-out <dir>` to emit SQL to run from the dashboard instead).

Seeding is idempotent — sections, nodes and questions are keyed on their
natural keys, so re-running an edited course updates in place.

As seeded: 8 sections, 53 nodes (50 with full lesson bodies), 6 quizzes,
35 questions.

## What's built

All of v1 per `docs/10-mvp-build-plan.md`: Google auth, groups with invite
codes, session logging with XP, group streaks with weekly freezes, the seeded
official course, the roadmap with in-app lessons, phase quizzes, per-phase
leaderboards, and achievements.

Not built, and deliberately out of scope for v1: BYOK AI course generation
(`docs/06`) and the marketplace (`docs/07`).

## Decisions

Three questions `docs/10-mvp-build-plan.md` left open, resolved for v1:

| Question | Decision | Where it lives |
| --- | --- | --- |
| Streak day boundary | Per-group local timezone, not UTC | `groups.timezone`, `group_local_date()` |
| Quiz-pass XP bonus | +30, first pass only | `app_config.quiz_pass_xp` |
| Quiz passing threshold | 70% | `section_quizzes.passing_score_pct` |
| Member leaves mid-roadmap | Progress kept as history, stops gating the group | `advance_group_section()` |
| Achievements grant XP? | No — status only, so the consistency-tuned curve isn't distorted | `evaluate_achievements()` |

Both XP constants are rows in `app_config`, so changing either is an UPDATE
rather than a code change.

## Security model

XP, group membership, and quiz grading are never written directly by the client.
They go through `SECURITY DEFINER` RPCs (`log_study_session`,
`join_group_by_invite`, `submit_quiz_attempt`) so the values cannot be forged.

`quiz_questions` has RLS enabled with **no policy** — that is deliberate. It is
what keeps `correct_option_index` away from the browser. Questions reach the
client through `get_quiz_questions()`, which omits the answer key; the key is
only revealed by `submit_quiz_attempt()` after an attempt is graded.
