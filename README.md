# AI KDP Publishing Studio

AI-assisted book production studio for Amazon KDP — take a book from idea to a
publishing-ready package (manuscript, illustrations, cover, exports, KDP listing).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS 4
- **Supabase** — Postgres, Auth, Storage, Row-Level Security
- **AI providers** — pluggable adapters: OpenAI, Anthropic, Google (text);
  OpenAI Images, Stability AI, Replicate (images). Configure any subset via env.

## Setup

1. **Install deps**
   ```bash
   pnpm install
   ```

2. **Supabase**
   ```bash
   # Option A: local dev
   pnpm dlx supabase start
   pnpm dlx supabase db push

   # Option B: link a cloud project
   pnpm dlx supabase link --project-ref <ref>
   pnpm dlx supabase db push
   ```
   Copy the URL + anon + service-role keys into `.env.local` (see `env.example`).

3. **Environment**
   ```bash
   cp env.example .env.local
   # fill in Supabase keys + whichever AI provider keys you have
   ```

4. **Run**
   ```bash
   pnpm dev
   ```

## Project structure

```
app/                  # routes (auth, dashboard, create wizard, project workspace)
components/           # UI primitives + app components
lib/
  ai/                 # provider abstraction, adapters, fallback dispatcher, usage logging
  kdp/                # trim sizes, cover math, category presets
  supabase/           # browser/server/service clients
  actions/            # server actions (auth, projects)
  types.ts            # domain types
supabase/migrations/  # database schema + RLS
proxy.ts              # auth session refresh + route protection
```

## AI provider configuration

Set keys for any subset of providers — the dispatcher tries them in the order
defined by `AI_TEXT_PROVIDERS` / `AI_IMAGE_PROVIDERS` and falls back on failure.

| Capability | Providers | Env key |
|---|---|---|
| Text | OpenAI, Anthropic, Google | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` |
| Images | OpenAI (gpt-image/DALL·E), Stability, Replicate | `OPENAI_API_KEY`, `STABILITY_API_KEY`, `REPLICATE_API_TOKEN` |

Economy / standard / premium modes map to different model tiers per provider.
Every generation is logged to `usage_events` with token/image counts and
estimated cost (visible in Settings → Usage & cost).

## Status

- **Phase 1 (Foundation)** — complete: auth, schema, dashboard, creation wizard,
  project workspace shells, provider layer.
- Phases 2–6 (writing engine, visual studio, publishing engine, market
  intelligence, finalization) are scaffolded as workspace tabs and activate
  progressively.
