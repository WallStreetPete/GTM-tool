// Thin client-side wrappers around the API routes.
import type { Dossier, GenerateConfig, GenerateResult, Lead } from "./types";

function genPayload(l: Lead) {
  return {
    id: l.id,
    firstName: l.firstName,
    fullName: l.fullName,
    title: l.title,
    company: l.company,
    location: l.location,
    website: l.website,
    linkedin: l.linkedin,
    dossier: l.dossier ? { summary: l.dossier.summary, signals: l.dossier.signals } : null,
  };
}

export async function generateLines(leads: Lead[], config: GenerateConfig) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leads: leads.map(genPayload), config }),
  });
  if (!res.ok) throw new Error("Generation request failed");
  return (await res.json()) as { results: GenerateResult[]; mode: string; failed: number };
}

export async function enrichLeads(leads: Lead[]) {
  const res = await fetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leads: leads.map((l) => ({
        id: l.id,
        firstName: l.firstName,
        lastName: l.lastName,
        fullName: l.fullName,
        title: l.title,
        company: l.company,
        website: l.website,
        linkedin: l.linkedin,
        location: l.location,
        email: l.email,
      })),
    }),
  });
  if (!res.ok) throw new Error("Enrichment request failed");
  return (await res.json()) as { results: { id: string; dossier: Dossier }[]; provider: string };
}

export async function getStatus() {
  const res = await fetch("/api/status", { cache: "no-store" });
  return (await res.json()) as {
    aiAvailable: boolean;
    mode: string;
    enrichment: string;
    model: string;
  };
}
