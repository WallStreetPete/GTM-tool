// Pluggable lead enrichment with a provider waterfall.
//
// Priority (first one that resolves for a given lead wins):
//   1. RAPIDAPI_KEY  -> Fresh LinkedIn Profile Data: full profile + RECENT POSTS,
//                       summarized by the model into a personality/execution dossier.
//                       (Best signal for "how they communicate / how they execute".)
//   2. PDL_API_KEY   -> People Data Labs: structured career history / firmographics.
//                       Accepts LinkedIn URL, work email, OR name + company.
//   3. APOLLO_API_KEY-> Apollo people/match (firmographics + title).
//   4. EXA_API_KEY   -> public web search, summarized by the model.
//   5. (none)        -> heuristic dossier from the row itself.
//
// We deliberately do NOT drive the user's own LinkedIn session (PhantomBuster/TexAu
// style) — that gets accounts banned. See ENRICHMENT.md for the full rationale.
import { generateObject } from "ai";
import { z } from "zod";
import { resolveModel } from "./model";
import type { Dossier } from "./types";

type Model = ReturnType<typeof resolveModel>["model"];

export type EnrichInput = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  company?: string;
  website?: string;
  linkedin?: string;
  location?: string;
  email?: string;
};

const dossierSchema = z.object({
  summary: z.string(),
  signals: z.array(z.string()),
  interests: z.array(z.string()).optional(),
  pastRoles: z.array(z.string()).optional(),
});

/* ----------------------------- 1. LinkedIn ------------------------------ */

function linkedinHandle(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

async function linkedinFresh(input: EnrichInput, model: Model): Promise<Dossier | null> {
  const key = process.env.RAPIDAPI_KEY;
  const handle = linkedinHandle(input.linkedin);
  if (!key || !handle) return null;

  const host = process.env.RAPIDAPI_LINKEDIN_HOST || "fresh-linkedin-scraper-api.p.rapidapi.com";
  const base = `https://${host}/api/v1`;
  const headers = { "x-rapidapi-key": key, "x-rapidapi-host": host };

  const profileRes = await fetch(`${base}/user/profile?username=${encodeURIComponent(handle)}`, { headers });
  if (!profileRes.ok) return null;
  const profile = await profileRes.json();

  // Posts are the gold signal for personality; best-effort, never fatal.
  let posts: unknown = null;
  try {
    const postsRes = await fetch(`${base}/user/posts?username=${encodeURIComponent(handle)}`, { headers });
    if (postsRes.ok) posts = await postsRes.json();
  } catch {
    /* posts optional */
  }

  if (!model) return null; // need the model to turn raw JSON into a usable dossier

  const corpus =
    `PROFILE:\n${JSON.stringify(profile).slice(0, 4500)}` +
    (posts ? `\n\nRECENT POSTS:\n${JSON.stringify(posts).slice(0, 2500)}` : "");

  const { object } = await generateObject({
    model,
    schema: dossierSchema,
    system:
      "You build a concise dossier on a person from their LinkedIn profile and recent posts, for cold-email personalization. Be strictly factual — only use what's in the data, never invent. 'summary' = who they are + what they focus on + how they communicate/execute (infer tone/values ONLY from their own posts). 'signals' = specific, referenceable facts (recent posts, launches, talks, role changes) — max 6. 'pastRoles' = notable prior roles. 'interests' = topics they post about.",
    prompt: `Person: ${[input.fullName, input.title, input.company].filter(Boolean).join(" — ")}\n\n${corpus}`,
  });

  return {
    summary: object.summary,
    signals: object.signals.slice(0, 6),
    interests: object.interests,
    pastRoles: object.pastRoles,
    source: "linkedin",
  };
}

/* --------------------------- 2. People Data Labs ------------------------ */

async function pdlEnrich(input: EnrichInput): Promise<Dossier | null> {
  const key = process.env.PDL_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({ min_likelihood: "2", titlecase: "true" });
  if (input.linkedin) params.set("profile", input.linkedin);
  else if (input.email) params.set("email", input.email);
  else if ((input.firstName || input.fullName) && input.company) {
    params.set("name", input.fullName || `${input.firstName} ${input.lastName ?? ""}`.trim());
    params.set("company", input.company);
  } else {
    return null;
  }

  const res = await fetch(`https://api.peopledatalabs.com/v5/person/enrich?${params}`, {
    headers: { "X-Api-Key": key },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { status?: number; data?: Record<string, unknown> };
  const d = json.data;
  if (!d) return null;

  type Exp = { title?: { name?: string }; company?: { name?: string } };
  const experience = (d.experience as Exp[] | undefined) ?? [];
  const pastRoles = experience
    .filter((e) => e.company?.name)
    .slice(0, 6)
    .map((e) => `${e.title?.name || "Role"} at ${e.company?.name}`);

  const skills = (d.skills as string[] | undefined) ?? [];
  const signals: string[] = [];
  if (d.industry) signals.push(`Industry: ${d.industry}`);
  if (skills.length) signals.push(`Skills: ${skills.slice(0, 6).join(", ")}`);
  if (d.summary) signals.push(String(d.summary).slice(0, 200));

  const summary = [
    d.job_title && d.job_company_name ? `${d.job_title} at ${d.job_company_name}.` : "",
    d.location_name ? `Based in ${d.location_name}.` : "",
    pastRoles.length ? `Career: ${pastRoles.slice(0, 3).join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary: summary || "People Data Labs profile matched.",
    signals: signals.slice(0, 5),
    pastRoles,
    source: "pdl",
  };
}

/* ------------------------------- 3. Apollo ------------------------------ */

type ApolloEmployment = { title?: string; organization_name?: string; current?: boolean };

async function apolloMatch(input: EnrichInput): Promise<Dossier | null> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": key },
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      organization_name: input.company,
      linkedin_url: input.linkedin,
      reveal_personal_emails: false,
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { person?: Record<string, unknown> };
  const p = data.person;
  if (!p) return null;

  const org = (p.organization ?? {}) as Record<string, unknown>;
  const employment = (p.employment_history as ApolloEmployment[] | undefined) ?? [];
  const pastRoles = employment
    .filter((e) => e.organization_name)
    .slice(0, 6)
    .map((e) => `${e.title || "Role"} at ${e.organization_name}${e.current ? " (current)" : ""}`);

  const signals: string[] = [];
  if (org.short_description) signals.push(String(org.short_description));
  if (org.industry) signals.push(`Industry: ${org.industry}`);
  if (p.headline) signals.push(String(p.headline));

  const summary = [
    p.title && org.name ? `${p.title} at ${org.name}.` : "",
    p.city || p.state ? `Based in ${[p.city, p.state].filter(Boolean).join(", ")}.` : "",
    pastRoles.length ? `Career: ${pastRoles.slice(0, 3).join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary: summary || "Apollo profile matched.",
    signals: signals.slice(0, 5),
    pastRoles,
    source: "apollo",
  };
}

/* ----------------------------- 4. Web (Exa) ----------------------------- */

type ExaResult = { title?: string; url?: string; text?: string };

async function exaSearch(input: EnrichInput, model: Model): Promise<Dossier | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) return null;

  const query = [input.fullName, input.title, input.company].filter(Boolean).join(" ");
  if (!query.trim()) return null;

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ query, numResults: 5, type: "auto", contents: { text: { maxCharacters: 1000 } } }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { results?: ExaResult[] };
  const results = data.results ?? [];
  if (!results.length) return null;

  if (model) {
    const sources = results
      .map((r, i) => `(${i + 1}) ${r.title ?? ""}\n${r.url ?? ""}\n${(r.text ?? "").slice(0, 800)}`)
      .join("\n\n");
    try {
      const { object } = await generateObject({
        model,
        schema: dossierSchema,
        system:
          "Summarize public info about a person for cold-email personalization. Strictly factual — only use the sources. 'signals' = specific, referenceable facts (talks, posts, launches, role changes), max 5.",
        prompt: `Person: ${query}\n\nSources:\n${sources}`,
      });
      return { summary: object.summary, signals: object.signals.slice(0, 5), interests: object.interests, source: "exa" };
    } catch {
      /* fall through to snippet dossier */
    }
  }

  return {
    summary: (results[0].text || results[0].title || "Public profile found.").slice(0, 300),
    signals: results.map((r) => r.title).filter((t): t is string => Boolean(t)).slice(0, 5),
    source: "exa",
  };
}

/* ----------------------------- 5. Heuristic ----------------------------- */

function heuristic(input: EnrichInput): Dossier {
  const bits: string[] = [];
  if (input.title && input.company) bits.push(`${input.title} at ${input.company}.`);
  else if (input.company) bits.push(`Works at ${input.company}.`);
  if (input.location) bits.push(`Based in ${input.location}.`);
  return {
    summary: bits.join(" ") || "Limited public data — personalize from role and company.",
    signals: [],
    source: "heuristic",
  };
}

/* ------------------------------- waterfall ------------------------------ */

export async function enrichLead(input: EnrichInput): Promise<Dossier> {
  const { model } = resolveModel();
  const providers: Array<() => Promise<Dossier | null>> = [
    () => linkedinFresh(input, model),
    () => pdlEnrich(input),
    () => apolloMatch(input),
    () => exaSearch(input, model),
  ];
  for (const run of providers) {
    try {
      const dossier = await run();
      if (dossier) return dossier;
    } catch {
      /* try the next provider */
    }
  }
  return heuristic(input);
}

export function enrichmentProvider(): "linkedin" | "pdl" | "apollo" | "exa" | "heuristic" {
  if (process.env.RAPIDAPI_KEY) return "linkedin";
  if (process.env.PDL_API_KEY) return "pdl";
  if (process.env.APOLLO_API_KEY) return "apollo";
  if (process.env.EXA_API_KEY) return "exa";
  return "heuristic";
}
