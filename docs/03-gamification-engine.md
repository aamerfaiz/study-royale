# Gamification Engine

Gamification is built around **XP from focus time**, tuned to reward
*consistency* (showing up daily) over *marathon sessions* (cramming once and
disappearing) — this directly serves the app's core purpose: motivating
regular study and fighting laziness/avoidance.

## XP formula (diminishing returns)
```
session_xp = round(10 * sqrt(minutes))
```
- A 25-minute session ≈ 50 XP.
- A 100-minute session ≈ 100 XP (4x the time, only 2x the reward).
- This actively discourages "grind for hours once a week" in favor of short,
  regular sessions.

## Daily consistency bonus
- Flat **+20 XP** for a user's *first* qualifying session logged each day.
- Rewards showing up over anything else — even a short session gets this
  bonus, which is the point.

## Levels
```
level = floor(sqrt(total_xp / 100))
```
- Smooth curve, no hardcoded level table to maintain, growth slows naturally
  at higher levels.

## Achievements (badges)
- Milestone-based (e.g. "7-day streak", "First course completed", "50 hours
  studied").
- Stored in `achievements` / `user_achievements` — simple unlock-on-condition
  model, can grow over time without schema changes.

## Open for later
- Should achievements grant bonus XP, or be purely cosmetic/status?
- Should streak length itself multiply XP (not currently in the formula —
  diminishing returns was chosen instead of a streak multiplier)?
