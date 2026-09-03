# AI Course Generation & BYOK

## Why BYOK
Users bring their own API key rather than the app footing AI costs — keeps
the app's operating cost low and gives users choice of provider/model.

## Supported providers (extensible via adapter pattern)
- **Anthropic**, **OpenAI**, **Gemini** — dedicated thin adapters.
- **DeepSeek**, **OpenRouter**, and similar — covered by a single
  OpenAI-compatible chat adapter (most of these speak that same API shape).
- **Custom** — a generic OpenAI-compatible endpoint + `base_url`, covers
  self-hosted/local models or anything else not explicitly listed.
- `provider_type` field (`llm` | `mcp_agent`) is reserved on `user_api_keys`
  now so **future MCP-based course creation** can slot in later without a
  schema migration.

## Key storage & security
- Key is entered once in settings, encrypted before it touches the database
  (Supabase Vault / pgsodium, or app-level encryption with a server secret).
- Decryption happens only inside a Supabase Edge Function at generation
  time — the raw key should never round-trip back to the browser after the
  initial save.

## Generation flow — guided, not one-shot
1. **Outline pass**: user gives a subject/topic → AI proposes a lightweight
   outline (section titles + node titles only, no full descriptions yet).
2. **Review/edit**: outline shown in an editable UI — reorder, rename,
   add/delete sections and nodes. Saved as `status: 'draft'` so it doesn't
   pollute real data mid-edit.
3. **Detail pass**: on approval, a second AI pass fleshes out each node's
   description, resource link suggestion, and requirement type — still
   editable by the user.
4. **Publish**: final save flips to `status: 'published'`,
   `source_type: 'ai_generated'`.

## Portable Course Export Schema
This is the canonical shape any course — official, user-made, or
AI-generated — must conform to. Export serializes a roadmap into this JSON;
import validates against it and inserts into `roadmaps` /
`roadmap_sections` / `roadmap_nodes`.

```json
{
  "version": 1,
  "title": "Organic Chemistry Basics",
  "subject": "chemistry",
  "description": "...",
  "sections": [
    {
      "title": "Introduction",
      "order": 0,
      "nodes": [
        {
          "title": "What is Organic Chemistry",
          "description": "...",
          "resource_url": "https://...",
          "is_optional": false,
          "requirement_type": "checkoff",
          "requirement_value": null
        }
      ]
    }
  ]
}
```
