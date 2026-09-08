# MVP Scope & Phasing

The full design (docs 00–07) is large. This doc defines what actually ships
first vs. what's designed-for-but-deferred.

## v1 — Core loop (MVP)
- Auth: Google login via Supabase Auth.
- Groups: create/join (solo → duo → trio → squad, max 4), invite codes.
- Study sessions: manual log/timer, per-user.
- XP + levels (formulas in `03-gamification-engine.md`).
- Group streaks + grace period (rules in `04-groups-and-streaks.md`).
- **One official, hardcoded default course** (the roadmap the user will
  provide — see `courses/001-placeholder-course.md`), rendered with the
  visual flowchart UI (React Flow).
- No AI generation yet. No BYOK yet. No marketplace yet.

## v2 — AI-assisted authoring
- BYOK: API key management (Anthropic/OpenAI/Gemini/DeepSeek/OpenRouter/
  custom).
- Guided AI course generation (outline → review → detail → publish).
- Course export/import via the portable JSON schema.

## v3 — Marketplace / social
- Usernames, public visibility toggle.
- Forking, likes, completion-count ranking.
- Browse/discover page.

## Rationale
Building the core accountability + gamification loop first means there's a
provably working product before investing in AI generation and social
features — both of which are meaningfully more build effort and depend on
the core loop already being solid.
