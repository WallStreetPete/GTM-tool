// Core domain types for OutboundAuto

export type LeadStatus =
  | "pending" // imported, nothing generated yet
  | "enriched" // background dossier gathered
  | "generated" // AI wrote a personalization line
  | "edited" // user hand-edited the line
  | "error"; // generation/enrichment failed

export type DossierSource =
  | "linkedin" // Fresh LinkedIn Profile Data (full profile)
  | "apollo"
  | "exa"
  | "serper"
  | "heuristic";

export type ProfileExperience = {
  title?: string;
  company?: string;
  dateRange?: string;
  location?: string;
  description?: string; // the free-text they wrote about the role
};

export type ProfileEducation = {
  school?: string;
  degree?: string;
  field?: string;
  dateRange?: string;
};

/** The full, structured profile captured from enrichment (for viewing). */
export type Profile = {
  headline?: string;
  about?: string; // full LinkedIn bio, untruncated
  location?: string;
  followerCount?: number;
  linkedinUrl?: string;
  experiences?: ProfileExperience[];
  educations?: ProfileEducation[];
  skills?: string[];
};

/** A compact, AI-summarized background profile for a lead. */
export type Dossier = {
  summary: string;
  signals: string[]; // recent / public signals worth referencing
  pastRoles?: string[];
  interests?: string[];
  profile?: Profile; // full structured detail (work history, education, bio)
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
  model: string; // which Claude model generates the opener
  theme: string; // optional light context (the tool does not pitch it)
  style: string; // tone + format instructions
  opening: string; // the opening style — what the first line leads with
  maxChars: number; // hard character limit for the opener
  personalityAware: boolean; // adapt tone to inferred personality
};

/** Models the user can pick for opener generation (shown in the brief). */
export const MODEL_OPTIONS = [
  { id: "claude-opus-4-8", label: "Opus 4.8", hint: "best quality (default)" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", hint: "balanced, faster" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", hint: "fastest, cheapest" },
] as const;

export type GenerateResult = { id: string; line: string };

export type GenerationMode = "anthropic" | "gateway" | "mock";
