# Enrichment strategy — getting deep background on every lead

The goal: for each lead, gather enough real background (role, career history, and
ideally their **recent posts**) that the model can write an opener referencing
something specific and true — and even adapt to *how that person communicates and
executes*. Posts are the single best signal for personality/execution style.

This is the strategy baked into `lib/enrich.ts`. It runs as a **waterfall**: the
first provider that resolves for a given lead wins, falling back automatically.

```
RAPIDAPI_KEY  → Fresh LinkedIn Profile Data (full profile from a LinkedIn URL)  ← primary
APOLLO_API_KEY→ Apollo people/match — fallback when a lead has no LinkedIn URL
EXA_API_KEY   → public web search, summarized by the model
(none)        → heuristic dossier from the row itself
```

The model then condenses whatever a provider returns into a compact **dossier**
(summary + signals + past roles + interests), which is fed into the opener
generator. You can see each lead's dossier in the app via the **Dossier** popover.

---

## ⚠️ The LinkedIn-scraping reality (read this first)

You asked about "scraping their entire LinkedIn." Important context as of 2026:

- **Don't drive your own LinkedIn session** (PhantomBuster / TexAu style). LinkedIn's
  2025–2026 detection got aggressive; automating your logged-in account risks
  **permanent account bans** (reports of ~80 profiles/day ceilings and a sharp rise
  in restrictions). Not worth it for an automated tool.
- **Proxycurl — the old go-to LinkedIn API — is dead.** It shut down in **July 2025**
  after LinkedIn (Microsoft) sued its parent (Nubela) over fake-account scraping; the
  settlement forced permanent deletion of all LinkedIn-derived data. Don't build on it.
- The legal bright line now is **public / logged-out data vs. authenticated /
  fake-account access**. Providers that sell their **own aggregated dataset** (you
  never touch LinkedIn) or that scrape only **public, logged-out** pages are the
  defensible posture. Bright Data, notably, *won* its scraping suits on that basis.

So this tool uses **compliant enrichment providers + the public web**, never your
LinkedIn cookie.

---

## Provider cheat-sheet (2026)

| Provider | Input | Depth | Recent posts? | Env var | Notes |
|---|---|---|---|---|---|
| **Fresh LinkedIn Profile Data** (RapidAPI) | LinkedIn URL/handle | Full profile | ✅ **Yes** (`/user/posts`) | `RAPIDAPI_KEY` | **Primary.** Best posts coverage for the price (~$50/mo to start). |
| **People Data Labs** | LinkedIn URL, **email**, or name+company | Full career/edu/skills | ❌ No | `PDL_API_KEY` | **Backup.** Works when you only have an email. Own dataset → low risk. ~$0.28/match. |
| **Apollo.io** | email, name+company, URL | Title + firmographics | ❌ No | `APOLLO_API_KEY` | Contact/firmographic tool, thin on history. |
| **Exa** | name+company (web) | Public web | ⚠️ If public | `EXA_API_KEY` | Compliant fallback; great for press/posts that are publicly indexed. |
| **Bright Data** | URL | Full + posts | ✅ Yes | *(not wired)* | Most litigation-proof for posts at scale, but async snapshot model. Add later if needed. |

(Avoid: Proxycurl — dead. PhantomBuster/TexAu — ban your account. Clay/FullEnrich/
Prospeo — built to find emails, not deep profiles.)

---

## Recommended setup

**You really only need one enrichment key:**

1. **`RAPIDAPI_KEY`** → [Fresh LinkedIn Profile Data](https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data)
   — full profile (headline, about, work history, education, skills) from each lead's
   LinkedIn URL. This is the primary and usually the only source you need.
2. *(optional)* **`APOLLO_API_KEY`** → fallback that matches on **email** or
   **name + company** for the occasional lead with no LinkedIn URL.

Plus **`ANTHROPIC_API_KEY`** for the model that writes the openers. Drop them in
`.env.local` (see `.env.example`) and restart.

## The end-to-end pipeline

1. **Import** leads (Excel/CSV) → columns auto-detected.
2. **Enrich** (button) → waterfall above builds a dossier per lead.
3. **Generate** → opener written from the dossier + your campaign brief (theme / ICP /
   offer / style), optionally personality-aware.
4. **Review & edit** inline in the table.
5. **Export** → SmartLead-ready CSV with a `{{personalization}}` column.

## Adding another provider

Each provider in `lib/enrich.ts` is just an `async (input) => Dossier | null`. Add a
function, slot it into the `providers` array in `enrichLead()`, and add its key to
`.env.example` + `enrichmentProvider()`. That's it.
