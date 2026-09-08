# Groups & Streaks

## Group formation
- Start solo (no group needed to use the app at all).
- Invite others via a shareable invite code/link to grow to duo/trio/squad.
- Hard cap of **4 members** for MVP (`max_members` column — raising the cap
  later is a config change, not a migration).
- Group owner sets a **shared daily goal** (default suggestion: 30
  minutes/day) — one goal per group, not per member, to keep streak logic
  simple. Per-member overrides can be added later.

## The core loop (async, not live)
- No requirement to be online at the same time.
- Each member logs their own study session(s) on their own schedule.
- A user "shows up" for the day if they log **any** session that day — no
  minimum duration required for the *streak* (XP still scales with actual
  time via the formula in `03-gamification-engine.md`).

## Group streak rule
- The group's streak continues only if **every active member** shows up
  (logs any session) that day.
- Breaks on a **full miss** — a day where a member logs nothing at all.

## Grace period (streak freezes)
- Each member gets **1 automatic streak freeze per rolling 7-day window**.
- If a member misses a day and has a freeze available, it's auto-consumed
  and the group streak survives.
- If no freeze is available, the group streak breaks.
- `streak_freezes_remaining` resets weekly (calendar week, Monday reset —
  simplest for MVP; can move to earned-freezes later as a gamification hook).

## Live layer (optional, not core)
- Supabase Realtime subscription on `study_sessions` inserts powers a live
  activity feed ("Sam just logged 30 min 🔥") — makes the app feel alive
  without requiring synchronous presence.
