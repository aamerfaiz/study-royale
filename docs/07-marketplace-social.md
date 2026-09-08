# Marketplace & Social Layer

A social-media-style layer for sharing courses, built on top of the
courses/roadmaps system.

## Visibility
- `roadmaps.visibility`: `private` (default) or `public`.
- Users have a unique `username` (in `users`/`profiles`) shown as a byline
  on public courses (`@username`).

## Forking / importing
- "Import" on a public course = **fork** it: clone into the importing
  user's own `roadmaps`, with `forked_from_id` set to the original — credits
  the original creator and lets the new owner freely customize their copy
  without touching the source.

## Ranking signals
- **Completion count** — how many groups have actually finished the course
  end-to-end. Primary ranking signal — reflects real value, not just
  attention.
- **Likes** — `roadmap_likes` (roadmap_id, user_id, created_at) — secondary
  signal.
- Marketplace/browse page: filter by subject, sort by trending / most
  completed / newest.

## Open questions (not yet decided, revisit before building this layer)
- Comments/reviews on public courses, or keep it to likes + completion count?
- Moderation/reporting for low-quality or inappropriate public courses.
- Any creator reputation/level system separate from the study XP system?
