# OutboundAuto

Turn a raw lead list into **hyper-personalized cold-email openers**, then export a
SmartLead-ready CSV. Upload Excel/CSV → review leads in a clean table → generate a
sharp first line for each (steered by your theme / ICP / offer / voice) → edit →
export.

Built with Next.js + Tailwind + shadcn/ui. Runs end-to-end with **zero config**
(demo mode), and gets smarter as you add API keys.

```
Upload  →  Enrich (optional)  →  Generate openers  →  Edit  →  Export to SmartLead
```

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

Click **Try with sample data** to see the whole flow immediately — no keys needed.
In demo mode the openers are deterministic placeholders; add an AI key for real ones.

## Going live (API keys)

Copy `.env.example` → `.env.local`, fill in what you have, and restart.

| Key | What it unlocks | Where |
|---|---|---|
| `ANTHROPIC_API_KEY` | Real AI-written openers (default model: `claude-sonnet-4-6`) | https://console.anthropic.com |
| `RAPIDAPI_KEY` | LinkedIn enrichment **with recent posts** (best personalization) | [Fresh LinkedIn Profile Data](https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data) |
| `PDL_API_KEY` | Structured career enrichment from email / name+company | https://www.peopledatalabs.com/signup |
| `APOLLO_API_KEY` / `EXA_API_KEY` | Alternate enrichment sources | Apollo / Exa |

The header shows a **Demo mode** / **Live AI** badge so you always know which you're in.
See **[ENRICHMENT.md](./ENRICHMENT.md)** for the full enrichment strategy and the
(important) note on LinkedIn scraping.

## How it works

- **Upload** — `lib/parse.ts` reads `.xlsx`/`.csv` (SheetJS + PapaParse) and
  auto-detects email / name / title / company / LinkedIn columns from any layout.
- **Store** — leads + your campaign brief persist in the browser (`localStorage` via
  Zustand), so a refresh won't lose your work.
- **Enrich** — `POST /api/enrich` runs the provider waterfall (LinkedIn → PDL → Apollo
  → web → heuristic) and returns a compact dossier per lead.
- **Generate** — `POST /api/generate` writes openers with the AI SDK, batched and with
  a per-batch mock fallback so partial failures never break a run.
- **Export** — `lib/export.ts` builds a CSV: every original column preserved, plus a
  `personalization` field you reference as `{{personalization}}` in SmartLead.

## Using the output in SmartLead

1. **Export CSV** from the toolbar.
2. In SmartLead, create/choose a campaign → **Import leads** → upload the CSV.
3. The `personalization` column becomes a variable. In your email body, open with
   `{{personalization}}` and write the rest of your sequence underneath.

## Project layout

```
app/
  page.tsx              # dashboard: upload → table → generate → export
  api/generate/route.ts # AI opener generation (batched, mock fallback)
  api/enrich/route.ts   # enrichment waterfall
  api/status/route.ts   # demo-vs-live + provider info for the UI
components/              # app UI + shadcn/ui primitives
lib/
  parse.ts  store.ts  model.ts  enrich.ts  export.ts  generate-mock.ts  sample-data.ts
```

## Notes

- Tech: Next.js 16, React 19, Tailwind v4, shadcn/ui, Vercel AI SDK v6, Zustand.
- Everything is client-side state + stateless API routes — no database to run.
- Cold outreach carries compliance obligations (CAN-SPAM / GDPR). Keep lists opt-in
  where required and honor unsubscribes.
