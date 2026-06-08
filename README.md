# OutboundAuto

Turn a raw lead list into **hyper-personalized cold-email openers**, then export a
SmartLead-ready CSV.

Auto-loads your Apollo/CRM export → review leads in a clean table → enrich each lead
with their real **LinkedIn background** → generate a sharp, personal first line for
every lead (steered by your brief) → edit inline → export. Built to be **stupid-simple**
and to run end-to-end with **zero config** (demo mode), getting sharper as you add keys.

```
Load leads  →  Enrich (LinkedIn)  →  Generate openers (Claude)  →  Edit  →  Export to SmartLead
```

Stack: Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui (Base UI) ·
Vercel AI SDK v6 + Anthropic · Zustand + IndexedDB. No database to run — just
client-side state and stateless API routes.

## Quick start

```bash
npm install
npm run dev
# http://localhost:3000
```

On first run the app auto-loads a leads file from the project root — set `SEED_CSV`
(defaults to `SemisExecs.csv`). No file there? Drop an `.xlsx`/`.csv` on the import
screen. With no API keys it runs in **demo mode** (deterministic placeholder openers);
the header shows a **Demo mode** / **Live AI** badge so you always know which you're in.

## Going live (API keys)

Copy `.env.example` → `.env.local`, fill in what you have, and restart.

| Key | What it unlocks |
|---|---|
| `ANTHROPIC_API_KEY` | Real AI-written openers. Default model **Claude Opus 4.8** (best quality); switch per run from the Model dropdown. |
| `RAPIDAPI_KEY` | **LinkedIn enrichment** — full profile, work history, education, skills. The main one. ([Fresh LinkedIn Profile Data](https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data)) |
| `APOLLO_API_KEY` | Fallback enrichment for leads with no LinkedIn URL (matches on email or name + company). |
| `EXA_API_KEY` | Public-web fallback, summarized by the model. |

Optional overrides: `GEN_MODEL` (opener model), `AI_MODEL` (the enrichment web-summary
model), and `AI_GATEWAY_API_KEY` (route through Vercel AI Gateway instead of a direct
key). Generation is **Anthropic-only** — there is no OpenAI dependency.

## The campaign brief

One brief steers every opener (collapsible panel up top, persisted across refresh):

- **How to open** — what the first line leads with (seeded with example openers you can edit).
- **Style & tone** — the voice.
- **Theme / angle** — optional light context that is never pitched.
- **Model** — Opus 4.8 / Sonnet 4.6 / Haiku 4.5.
- **Max characters** — a hard cap on opener length.
- **Personality-aware** — adapt tone to the lead's inferred communication style.

Every opener honors the **How-to-open** and the **Style/tone** together.

## The leads table

- **Auto-loaded** Apollo/CSV export, or add people / import files anytime.
- **Search**, **pagination** (20–100 per page), and **Select first N** (100/200/300/500/All or a custom count) for fast bulk actions.
- **Resizable columns** that **persist** across refresh.
- **Per-row**: Enrich, Generate, copy line, view full profile, remove.
- **Bulk**: Enrich (skips anyone already enriched), Generate (the N selected, or all), Export, Clear all.
- Inline-edit any opener; a status chip tracks New → Enriched → Written → Edited.
- **Dossier viewer** shows the captured profile: summary, About, full experience with descriptions, education, and skills.

## Enrichment

`POST /api/enrich` runs a provider **waterfall** — the first that resolves for a lead wins:

1. **LinkedIn** (Fresh LinkedIn Profile Data `/enrich-lead`) — headline, About, complete work history, education, skills, follower count. The primary source.
2. **Apollo** people-match — for leads with no LinkedIn URL.
3. **Exa** web search — model-summarized public info.
4. **Heuristic** — a dossier built from the row itself (demo mode / no keys).

Each provider returns a compact dossier (summary + signals) used for generation, plus
the full structured profile for the viewer. The tool **never drives your own LinkedIn
session** (PhantomBuster / TexAu style) — that gets accounts banned; it uses official
data APIs only.

## Generation

`POST /api/generate` writes openers with the AI SDK, batched and concurrency-limited.
It retries transient `429`/`529` (model-overloaded) errors and caps the output budget
per request. When a real model is configured it **never substitutes placeholder text** —
if a batch fails it reports a `failed` count and leaves those leads untouched so you can
re-run just them. With no key, openers are deterministic demo placeholders.

## Export → SmartLead

1. **Export CSV** from the toolbar — every original column is preserved, plus a `personalization` field.
2. In SmartLead: open a campaign → **Import leads** → upload the CSV.
3. Open your email body with `{{personalization}}` and write the rest of the sequence underneath.

## Persistence

Leads, the brief, and column sizes live in your browser via Zustand persist, backed by
**IndexedDB** (`idb-keyval`). Large lead sets with full profiles blow past
`localStorage`'s ~5 MB cap, so IndexedDB is used instead. A refresh never loses your work.

## Project layout

```
app/
  page.tsx                # dashboard: load → table → enrich → generate → export
  api/seed/route.ts       # auto-load the project-root leads file on first run
  api/enrich/route.ts     # enrichment waterfall
  api/generate/route.ts   # AI opener generation (batched, retried)
  api/status/route.ts     # demo-vs-live mode + provider/model for the header
components/                # app UI + shadcn/ui (Base UI) primitives
lib/
  parse.ts   # .xlsx/.csv parsing + column auto-detection
  enrich.ts  # provider waterfall + dossier shaping
  model.ts   # model selection (Anthropic / gateway / mock)
  store.ts   # Zustand store + IndexedDB persistence
  export.ts  # SmartLead CSV builder
  types.ts   # domain types
```

## Notes

- Everything is client-side state + stateless API routes — no database to provision.
- This repo pins a specific Next.js build; read `AGENTS.md` before changing framework code.
- Cold outreach carries compliance obligations (CAN-SPAM / GDPR). Keep lists opt-in where required and honor unsubscribes.
