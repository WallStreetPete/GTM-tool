// Core domain types for OutboundAuto

export type LeadStatus =
  | "pending" // imported, nothing generated yet
  | "enriched" // background dossier gathered
  | "generated" // AI wrote a personalization line
  | "edited" // user hand-edited the line
  | "error"; // generation/enrichment failed

export type DossierSource =
  | "linkedin" // Fresh LinkedIn Profile Data (profile + posts)
  | "pdl" // People Data Labs (structured DB)
  | "apollo"
  | "exa"
  | "serper"
  | "heuristic";

/** A compact, AI-summarized background profile for a lead. */
export type Dossier = {
  summary: string;
  signals: string[]; // recent / public signals worth referencing
  pastRoles?: string[];
  interests?: string[];
  source: DossierSource;
};

export type Lead = {
  id: string;
  // Best-effort normalized fields (auto-detected from arbitrary spreadsheets)
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  title?: string;
  company?: string;
  linkedin?: string;
  website?: string;
  location?: string;
  // Every original column from the uploaded row, preserved verbatim for export
  raw: Record<string, string>;
  // Generated output
  personalization?: string;
  dossier?: Dossier;
  status: LeadStatus;
};

/** The "campaign brief" that steers generation across all leads. */
export type GenerateConfig = {
  theme: string; // what the campaign is about
  icp: string; // who you're targeting
  offer: string; // what you're pitching / the value prop
  style: string; // tone + format instructions
  lines: 1 | 2; // length of the opener
  personalityAware: boolean; // adapt tone to inferred personality
};

export type GenerateResult = { id: string; line: string };

export type GenerationMode = "anthropic" | "gateway" | "mock";
