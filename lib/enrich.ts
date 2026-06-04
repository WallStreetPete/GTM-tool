// Pluggable lead enrichment with a provider waterfall.
//
// Priority (first one that resolves for a given lead wins):
//   1. RAPIDAPI_KEY  -> Fresh LinkedIn Profile Data (/enrich-lead): full profile —
//                       headline, "about", complete work history, education, skills.
//                       This is the primary source: who they are and what they do.
//   2. APOLLO_API_KEY-> Apollo people/match, used as a fallback for leads that have
//                       no LinkedIn URL (matches on email / name + company).
//   3. EXA_API_KEY   -> public web search, summarized by the model.
//   4. (none)        -> heuristic dossier from the row itself.
//
// We deliberately do NOT drive the user's own LinkedIn session (PhantomBuster/TexAu
// style) — that gets accounts banned. See ENRICHMENT.md for the rationale.
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

/* ------------------------- 1. Fresh LinkedIn Profile -------------------- */

type FreshExperience = {
  title?: string;
  company?: string;
  date_range?: string;
  is_current?: boolean;
  location?: string;
  description?: string;
};
type FreshEducation = {
  school?: string;
  degree?: string;
  field_of_study?: string;
  date_range?: string;
};
type FreshProfile = {
  full_name?: string;
  headline?: string;
  job_title?: string;
  company?: string;
  company_industry?: string;
  about?: string;
  location?: string;
  follower_count?: number;
  is_creator?: boolean;
  skills?: string; // pipe-delimited string, e.g. "Sales|Finance|Python"
  experiences?: FreshExperience[];
  educations?: FreshEducation[];
};

async function linkedinFresh(input: EnrichInput): Promise<Dossier | null> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key || !input.linkedin) return null;

  const host = process.env.RAPIDAPI_LINKEDIN_HOST || "fresh-linkedin-profile-data.p.rapidapi.com";
  const params = new URLSearchParams({
    linkedin_url: input.linkedin,
    include_skills: "true",
    include_certifications: "false",
    include_profile_status: "false",
    include_company_public_url: "false",
  });

  const res = await fetch(`https://${host}/enrich-lead?${params}`, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": host },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { data?: FreshProfile };
  const d = json.data;
  if (!d) return null;

  const experiences = d.experiences ?? [];
  const pastRoles = experiences
    .slice(0, 6)
    .map((e) => `${e.title || "Role"} at ${e.company || "?"}${e.date_range ? ` (${e.date_range})` : ""}`);

  const eduLines = (d.educations ?? [])
    .slice(0, 2)
    .map((e) => [e.degree, e.field_of_study, e.school].filter(Boolean).join(", "))
    .filter(Boolean);

  const skills =
    typeof d.skills === "string"
      ? d.skills.split("|").map((s) => s.trim()).filter(Boolean)
      : [];

  const signals: string[] = [];
  if (d.headline) signals.push(d.headline);
  if (pastRoles.length) signals.push(`Career: ${pastRoles.slice(0, 4).join("; ")}`);
  if (eduLines.length) signals.push(`Education: ${eduLines.join("; ")}`);
  if (d.company_industry) signals.push(`Industry: ${d.company_industry}`);
  if (d.is_creator || (d.follower_count ?? 0) > 5000) {
    signals.push(`Active on LinkedIn — ${d.follower_count ?? 0} followers`);
  }

  const about = (d.about || "").replace(/\s+/g, " ").trim().slice(0, 600);
  const summary = [
    d.job_title && d.company ? `${d.job_title} at ${d.company}.` : d.headline ? `${d.headline}.` : "",
    d.location ? `Based in ${d.location}.` : "",
    about ? `About: ${about}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary: summary || `${d.full_name || "Profile"} on LinkedIn.`,
    signals: signals.slice(0, 6),
    pastRoles,
    interests: skills.slice(0, 8),
    profile: {
      headline: d.headline,
      about: d.about,
      location: d.location,
      followerCount: d.follower_count,
      linkedinUrl: input.linkedin,
      experiences: experiences.map((e) => ({
        title: e.title,
        company: e.company,
        dateRange: e.date_range,
        location: e.location,
        description: e.description,
      })),
      educations: (d.educations ?? []).map((e) => ({
        school: e.school,
        degree: e.degree,
        field: e.field_of_study,
        dateRange: e.date_range,
      })),
      skills,
    },
    source: "linkedin",
  };
}

/* ------------------------------- 2. Apollo ------------------------------ */

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

/* ----------------------------- 3. Web (Exa) ----------------------------- */

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
        schema: z.object({
          summary: z.string(),
          signals: z.array(z.string()),
          interests: z.array(z.string()).optional(),
        }),
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

/* ----------------------------- 4. Heuristic ----------------------------- */

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
    () => linkedinFresh(input),
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

export function enrichmentProvider(): "linkedin" | "apollo" | "exa" | "heuristic" {
  if (process.env.RAPIDAPI_KEY) return "linkedin";
  if (process.env.APOLLO_API_KEY) return "apollo";
  if (process.env.EXA_API_KEY) return "exa";
  return "heuristic";
}
