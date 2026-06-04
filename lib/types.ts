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
  theme: string; // what the campaign is about
  icp: string; // who you're targeting
  offer: string; // what you're pitching / the value prop
  style: string; // tone + format instructions
  opening: string; // what to lead with / say at the very start
  maxChars: number; // hard character limit for the opener
  personalityAware: boolean; // adapt tone to inferred personality
};

export type GenerateResult = { id: string; line: string };

export type GenerationMode = "anthropic" | "gateway" | "mock";
