# Tech Stack

## Frontend / App
- **Next.js (App Router)** — server components for fast loads, API routes /
  Edge Functions for anything requiring secrets (e.g. BYOK AI calls).
- **React Flow (`@xyflow/react`)** — for the visual roadmap/flowchart UI.

## Backend / Data
- **Supabase**
  - **Postgres** — primary database.
  - **Auth** — Google OAuth as the login method.
  - **Realtime** — used sparingly (live activity feed: "Sam just logged 30
    min 🔥"). Not required for the core study loop, which is async.
  - **Row Level Security (RLS)** — group-scoped data access; a user should
    only read/write their own group's data.
  - **Edge Functions** — for anything that needs a server-held secret:
    - Decrypting/using BYOK API keys to call AI providers.
    - Daily cron job (`pg_cron` + Edge Function) to evaluate streaks at day
      rollover.
  - **Vault (pgsodium)** — for encrypting user-supplied API keys at rest
    (BYOK), or app-level encryption with a server secret as a fallback.

## AI generation (BYOK)
- No fixed model — the app calls whichever provider/model the user configures
  with their own key. See `06-ai-generation-byok.md`.

## Why this stack
- Supabase gives auth + DB + realtime + serverless functions in one place —
  minimal infra to stand up an MVP.
- Next.js + Supabase is a very well-trodden combination with mature tooling,
  good docs, and low friction for a solo/small team build.
