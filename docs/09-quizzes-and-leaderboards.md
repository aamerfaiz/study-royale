# Quizzes & Phase Leaderboards

Extends `03-gamification-engine.md` and `05-courses-and-roadmaps.md`. Adds a
graded checkpoint at the end of every section ("phase"), and a
group-scoped leaderboard ranking members by XP earned within that phase.

## Why this shape
The existing model already gates section advancement on the group ("every
member clears the section"), but "cleared" only meant checkoffs/time
logged — no verification anyone actually retained anything. A phase-end
quiz turns section completion into a real checkpoint, and ties naturally
into the app's existing pillars: it's still async (no live event), still
group-scoped (no cross-group competition, consistent with the rest of the
design), and still rewards consistency over cramming (the leaderboard uses
the same diminishing-returns XP formula already in `03-gamification-engine.md`,
not a separate scoring system).

## Data model additions (extends `02-data-model.md`)

```
section_quizzes        id, section_id (FK roadmap_sections), title,
                        passing_score_pct (default 70), created_at

quiz_questions          id, quiz_id (FK section_quizzes), order_index,
                        question_text, options (jsonb array of strings),
                        correct_option_index, explanation (nullable,
                        shown after answering — reinforces the concept
                        whether right or wrong)

quiz_attempts           id, quiz_id, group_roadmap_id, user_id,
                        attempt_number, score_pct, passed (bool),
                        started_at, completed_at

study_sessions          + roadmap_node_id (nullable FK -> roadmap_nodes)
                        -- NEW column. Lets a session optionally be tagged
                        to the node it was studying. This was actually a
                        gap in the original model: nothing linked a
                        session to node progress for `requirement_type:
                        'time'` nodes. Tagging is optional (a session can
                        still be logged untagged, e.g. general study that
                        keeps the daily streak alive without advancing the
                        roadmap) but is required for that session's time
                        to count toward a node AND toward the phase
                        leaderboard.
```

No changes to `roadmap_nodes.requirement_type` — the existing `'quiz'`
option there stays reserved for a future *per-node* quiz if you want that
later; this feature is a single quiz per **section**, referenced by
`section_quizzes.section_id`, not by node.

## Quiz flow
1. A member becomes quiz-eligible for a section once all of that section's
   non-optional nodes show `status: 'done'` for them individually (same
   per-member completion as today — no change there).
2. They take the section's quiz: multiple choice, one `quiz_attempts` row
   per attempt, `passed = score_pct >= passing_score_pct`.
3. Unlimited retakes, no cooldown, no XP penalty for retrying — consistent
   with the "retake until passed" decision. Retrying doesn't re-grant XP
   (see below), so there's no incentive to spam attempts either way.
4. A member has "cleared" the section once: all required nodes done **and**
   at least one passed `quiz_attempts` row exists for them on that section.
5. The section (and the next one) unlocks for the **whole group** only once
   every active member has cleared it by that definition — this replaces
   the current node-only clearing rule in `05-courses-and-roadmaps.md`,
   it doesn't add a second gate on top of it.

## XP for passing
Suggest a flat **+30 XP** on a member's *first* passing attempt of a given
section's quiz (not repeatable on retakes after already passing) — same
"flat bonus for a milestone" pattern as the existing daily +20 XP and
achievement unlocks, so it doesn't need a new formula. Open call: confirm
this before building, since it wasn't part of the original clarifying
questions — easy to drop if you'd rather quizzes stay ungraded for XP
purposes and only gate advancement.

## Leaderboard (per group, per phase)
- Scope: **within one group only** — no cross-group or global leaderboard.
  Keeps the app's existing async, non-competitive-between-strangers design
  intact; the only competition is friendly, inside the accountability unit
  that's already studying together.
- Ranking metric: sum of `xp_events.xp_earned` for that member, restricted
  to `xp_events` whose `study_sessions.roadmap_node_id` falls within that
  section — i.e. **XP earned specifically studying that phase's nodes**,
  not total XP. A member who's way ahead overall doesn't automatically top
  every phase's board; it resets each phase, which keeps latecomers to the
  group able to compete on the current phase.
- Untagged sessions (no `roadmap_node_id`) don't count toward any phase
  leaderboard, but still count toward total XP/level and the daily streak
  as they do today.
- Tie-break (needed since XP can tie exactly): most recent node/quiz
  completion timestamp wins the tie — i.e. whoever *finished* the phase
  first among tied members ranks higher. Simple, no new field needed
  (derivable from existing timestamps).
- Display: shown on the section's node-detail panel or a dedicated
  "Phase Leaderboard" tab — ranked list of the group's members with XP and
  a small quiz-passed checkmark, refreshed live via the same Realtime
  channel already used for the activity feed (`04-groups-and-streaks.md`),
  since it's the same kind of lightweight, non-critical live layer.

## Content authoring for v1
Quiz questions for the official AI Full-Stack Engineer course are
**hand-authored**, not AI-generated — consistent with the phasing decision
that AI generation is v2/BYOK scope. This means before v1 ships, someone
authors one `section_quizzes` row + a handful of `quiz_questions` for each
of the 8 sections in `001-course-ai-fullstack-engineer.md`. I can draft
that question content next if useful — happy to write real MCQs per phase
(e.g. 5-8 questions per section) as a follow-up pass.

For v2 (AI-generated courses), quiz generation should be folded into the
existing guided generation flow in `06-ai-generation-byok.md` as an
additional step after the detail pass — the AI proposes quiz questions per
section, user reviews/edits them just like node descriptions, before
publish. Not required for v1.

## Scope/phasing update (amends `08-mvp-scope-phasing.md`)
This feature moves into **v1**, since it changes how section gating works
for the one official course v1 ships with:
- v1 adds: `section_quizzes` / `quiz_questions` / `quiz_attempts` tables,
  `study_sessions.roadmap_node_id`, quiz-taking UI, per-phase leaderboard UI,
  updated section-clearing rule (nodes done + quiz passed).
- Still deferred to v2: AI-generated quiz content (hand-authored only for
  v1's one official course).
- Still deferred to v3: nothing here affects marketplace/social scope,
  though a public course that includes quizzes would carry its
  `section_quizzes` along when forked, same as its nodes.

## Open questions to confirm before building
- Flat +30 XP on first quiz pass — keep, drop, or scale by section length?
- Passing threshold default of 70% — fine, or should it vary per section?
- Should the quiz-eligibility check also require it be attempted only
  *after* all required nodes are done, or should members be allowed to
  attempt the quiz early (e.g. to self-test) without it counting as
  "cleared" until nodes are also done? (Current draft: nodes-first, but
  either order is a small implementation detail either way.)
