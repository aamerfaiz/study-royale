# Pair Study App — Overview

## Purpose
The main purpose of this app is to **motivate people to study** — to help
people rebuild attention span, make learning easier to start and stick with,
and fight the daily pull of laziness/procrastination. The core promise is
simple: **study a little, together, every day** (default goal: ~30 minutes/day).

## Core idea
Studying alone is easy to skip. Studying with 1–3 other people you're
accountable to is much harder to skip. This app is built around **shared,
async accountability** rather than live/synchronous study sessions — no one
has to be online at the same time, but everyone has to show up *that day* or
the group's streak is at risk.

## Group sizes (MVP)
- Solo (1)
- Duo (2)
- Trio (3)
- Squad (4) — hard cap for now, `max_members` is a config column so this can
  be raised later without a schema change.

## Pillars
1. **Accountability** — shared daily goals, shared streaks, visible group
   activity feed.
2. **Gamification** — XP, levels, streaks, achievements — tuned to reward
   *consistency* over marathon cramming.
3. **Structured learning** — courses/roadmaps (roadmap.sh-style) that break
   subjects into Introduction → Core → Advanced sections, gated so the whole
   group progresses together.
4. **Extensibility** — users can eventually generate their own courses via AI
   (BYOK) and share them in a marketplace.

## Companion docs
- `01-tech-stack.md` — stack decisions
- `02-data-model.md` — full schema (consolidated)
- `03-gamification-engine.md` — XP/level/streak formulas
- `04-groups-and-streaks.md` — group formation, streak rules, grace periods
- `05-courses-and-roadmaps.md` — course structure, visual roadmap UI
- `06-ai-generation-byok.md` — AI course generation, BYOK key handling
- `07-marketplace-social.md` — public courses, forking, ranking
- `08-mvp-scope-phasing.md` — what ships in v1 vs later
- `courses/001-placeholder-course.md` — placeholder for the first default course
