# 11 — Node content model (in-app lesson content)

## Why this doc exists

The original design docs (00-08) and the first version of the MVP build plan (10) treated a roadmap node as a pointer: a title, a short description, and a `resource_url` to an external article/video/doc. Studying meant leaving the app, reading something elsewhere, coming back, and logging time against it.

That's a timer app with a checklist attached. It is not what this product is.

**The app itself has to teach.** A member opens a node, reads the actual lesson in the node detail panel, and *then* logs a study session against it (or, for checkoff nodes, marks it done; for quiz nodes, takes the quiz). `resource_url` doesn't go away — it stays as an optional "go deeper" link for members who want the original source or a longer treatment — but it is no longer the primary material. The primary material is in-app text, authored (for the first course) by Claude and shipped as part of this handover package.

This doc is the amendment: one new schema field, one UI change, and the authoring conventions used so future courses (hand-authored or AI-generated in v2) stay consistent.

## Schema change

Add one column to `roadmap_nodes` (already defined in `10-mvp-build-plan.md`):

```sql
alter table roadmap_nodes add column content text;
```

- Nullable at the DB level (so `checkoff` "Build" nodes without a concept lesson, and any legacy/placeholder node, don't break), but for v1's shipped course every `time` and `checkoff` node has non-null `content`. Quiz-gating nodes don't carry a `content` field of their own — their material lives in `section_quizzes` / `quiz_questions`, already in doc 10.
- `content` is markdown text (matches the format already used in the Course Export Schema and in `courses/001-course-ai-fullstack-engineer.md`'s `## Lesson content (node bodies)` section). Render it client-side with a standard markdown renderer that supports fenced code blocks — lessons include short code samples throughout.
- No length cap is enforced at the schema level; lessons in the shipped course run roughly 120-220 words, project-brief nodes a bit longer. Treat that as the target size for future authoring, not a hard limit.

### Course Export Schema

The portable JSON schema (doc 00/02, wherever it's formally defined) gains one optional field per node:

```json
{
  "title": "FastAPI",
  "description": "...",
  "resource_url": "...",
  "content": "FastAPI is the backend framework this course builds every service in...",
  "is_optional": false,
  "requirement_type": "time",
  "requirement_value": 45
}
```

When importing `courses/001-course-ai-fullstack-engineer.md`: the roadmap JSON block defines the node shape (title/description/resource_url/requirement), and the **separate** `## Lesson content (node bodies)` JSON block at the end of that file maps `content` onto nodes by `(section_order, node_title)`. Claude Code's import step should merge the two — either by pre-merging into one `roadmap_nodes` insert per node, or by running a second `update roadmap_nodes set content = ... where section_order = ... and title = ...` pass after the initial import. They were kept as separate JSON blocks in the source doc for authoring clarity, not because they belong in separate app-side tables.

## UI implication

The node detail panel (bottom sheet in the prototype) changes shape:

- **Primary content area**: the rendered `content` markdown — this is what a member reads before doing anything else. It should be the visually dominant part of the panel, not a collapsed/secondary section.
- **`resource_url`**, when present, becomes a smaller "Go deeper" / "Read the original source" link below the lesson content — clearly secondary, not the thing the member is being sent away to read first.
- The action button (start session / mark done / take quiz) stays below the content, as today.
- For nodes with no `content` (shouldn't happen in the shipped course, but possible for a future partial import), fall back to showing `description` alone rather than an empty panel — don't block node interaction on missing content.

This is a real UI change from what the earlier prototype iterations showed (which only ever rendered `description` in the sheet) — flagging it explicitly so Claude Code doesn't treat it as optional polish.

## Authoring conventions (for future courses)

The voice/format used for the first course, to keep consistency if more courses are hand-authored later:

- Direct technical writing, no filler. Roughly 120-220 words for a standard topic lesson.
- A short code example where it earns its place — not every node needs one (comparison/orientation nodes usually don't).
- A closing line tying the topic back to why it matters for the course's end goal — gives each lesson a "so what," not just a definition.
- Checkoff "Build" nodes use a **project brief** shape instead of a concept lesson: **Project brief** intro line, **Goal**, **Requirements**, **Stack**. There's nothing to "read up on" for a build node beyond what to build and what it needs to demonstrate.
- Short orientation/comparison nodes (e.g. alternatives being contrasted against the recommended default) stay intentionally brief — a paragraph, not a full lesson — since their job is positioning, not teaching a concept from scratch.

## v2 tie-in (amendment to `06-ai-generation-byok.md`)

`06-ai-generation-byok.md` describes a v2 "detail pass" where AI generation fills in richer node detail using the member's own API key (BYOK). That detail pass must now generate `content` (the lesson body) per node, not just `description` and `resource_url` as originally scoped — otherwise an AI-generated course would ship as a pointer-only course while the official first course is a full content course, which is an inconsistent experience. Treat this as a required update to that doc's generation prompt/spec when v2 is built, not a new v1 obligation — v1's only course (`001-course-ai-fullstack-engineer.md`) already ships fully authored content.
