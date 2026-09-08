# Courses & Roadmaps

Reference: [roadmap.sh](https://roadmap.sh/) — sectioned, hierarchical,
basics-to-advanced structure, visual tree/flowchart presentation. This app
adapts that model with a **group-must-complete-together** gating layer that
roadmap.sh (a solo tool) doesn't have.

## Structure: Sections → Nodes
- A **roadmap/course** is broken into ordered **sections** — e.g.
  "Introduction", "Core Concepts", "Advanced" / "Important Stuff".
- Each section contains **nodes** (individual topics/tasks).
- Sections are **sequential and gated**: the whole group must clear one
  before the next unlocks.
- Nodes within a section can be tackled in any order by each member.
  **Optional** nodes don't block the group from advancing — only required
  nodes do.

## Node completion
Each node has a `requirement_type`:
- `time` — must log a certain amount of study time on that topic.
- `checkoff` — manual "I finished this" self-report.
- `quiz` — must pass a quiz/test (future scope beyond MVP structure, but
  reserved in the schema now).

## Group progression
- Individually, members can keep studying/earning XP freely even if
  "ahead" of the group.
- The **roadmap node/section stays visually locked for the group** until
  every member has cleared it — this is the "waiting on Sam" accountability
  moment, made visible in the UI (not a hard block on studying, just on
  advancing the shared map).

## Visual UI
- **React Flow**-based flowchart, matching the roadmap.sh feel:
  - Locked nodes: greyed out, non-interactive.
  - Unlocked/in-progress: highlighted, shows "X of N members done".
  - Done: checkmark/glow.
  - Optional: dashed border.
- Auto-layout per section (top-to-bottom or left-to-right chains) rather
  than hand-placed node positions — templates shouldn't require manual
  positioning.
- Clicking a node opens a panel: description, resource link, requirement
  type, and each member's individual status on it.

## Course sourcing
- `source_type`: `official` (app-provided defaults), `user_created`,
  `ai_generated`, `imported`.
- See `06-ai-generation-byok.md` for AI-assisted authoring, and
  `07-marketplace-social.md` for sharing.
