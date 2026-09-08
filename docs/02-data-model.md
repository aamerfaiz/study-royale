# Data Model (consolidated)

This is the full schema as discussed — not final SQL/RLS yet (see
`08-mvp-scope-phasing.md` for when that gets written), just the agreed shape.

## Users & Groups
```
users                 id, display_name, avatar_url, username (unique),
                      total_xp, level, current_streak, streak_freezes_remaining

groups                id, name, type (solo/duo/trio/squad), max_members=4,
                      daily_goal_minutes, created_by, invite_code

group_members         group_id, user_id, joined_at, role
```

## Study sessions & XP
```
study_sessions        id, user_id, group_id (nullable), started_at,
                      duration_minutes, subject, completed_at

xp_events             id, user_id, session_id, xp_earned, reason, created_at
```

## Streaks
```
group_streaks         group_id, date, hit_goal (bool)
                      -- one row per group per day; current_streak is derived
```

## Achievements
```
achievements           id, key, name, description, icon
user_achievements       user_id, achievement_id, earned_at
```

## Courses / Roadmaps
```
roadmaps               id, title, subject, description, is_template,
                       created_by, source_type
                       ('official' | 'user_created' | 'ai_generated' | 'imported'),
                       visibility ('private' | 'public'),
                       forked_from_id (nullable FK -> roadmaps.id)

roadmap_sections        id, roadmap_id, order_index, title
                       -- e.g. "Introduction", "Core Concepts", "Advanced"

roadmap_nodes            id, section_id, order_index, title, description,
                       resource_url, is_optional,
                       requirement_type ('time' | 'checkoff' | 'quiz'),
                       requirement_value

group_roadmaps           id, group_id, roadmap_id, current_section_index,
                       started_at

member_node_progress      id, group_roadmap_id, roadmap_node_id, user_id,
                       status ('not_started' | 'in_progress' | 'done'),
                       completed_at
```

## Marketplace / social
```
roadmap_likes            roadmap_id, user_id, created_at
-- ranking derived from: completion count (groups that finished it) + likes
```

## BYOK / AI
```
user_api_keys             id, user_id, provider
                       ('anthropic' | 'openai' | 'gemini' | 'deepseek' |
                        'openrouter' | 'custom'),
                       provider_type ('llm' | 'mcp_agent'),  -- future-proofing
                       label, base_url (nullable), default_model,
                       encrypted_key, created_at
```

## Notes
- `roadmaps.forked_from_id` credits the original creator when a user
  imports/forks a public course.
- `provider_type` on `user_api_keys` is reserved now so MCP-based course
  generation can slot in later without a migration.
