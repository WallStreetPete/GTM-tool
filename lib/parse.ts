// Parse arbitrary Excel/CSV lead lists and auto-detect common fields.
import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { Lead } from "./types";

export type ParsedFile = { leads: Lead[]; columns: string[] };

type Canonical =
  | "email"
  | "firstName"
  | "lastName"
  | "fullName"
  | "title"
  | "company"
  | "linkedin"
  | "website"
  | "location";

// Aliases are matched against normalized headers (lowercase, alphanumeric, single-spaced).
const FIELD_ALIASES: Record<Canonical, string[]> = {
  email: ["email", "email address", "e mail", "work email", "emailaddress", "primary email", "email 1"],
  firstName: ["first name", "firstname", "first", "fname", "given name", "first nm"],
  lastName: ["last name", "lastname", "last", "lname", "surname", "family name"],
  fullName: ["full name", "name", "fullname", "contact name", "contact", "lead name", "prospect name"],
  title: ["title", "job title", "position", "role", "headline", "designation", "job"],
  company: ["company", "company name", "organization", "organisation", "account", "employer", "company name for emails", "org", "business"],
  linkedin: ["linkedin", "linkedin url", "linkedin profile", "li url", "linkedin profile url", "person linkedin url", "linkedin link"],
  website: ["website", "company website", "url", "domain", "company domain", "web", "site"],
  location: ["location", "city", "country", "region", "geo", "address", "city state", "based in"],
};

function normalize(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Map each canonical field to the best-matching original column header. */
function detectFields(columns: string[]): Partial<Record<Canonical, string>> {
  const normalized = columns.map((c) => ({ original: c, norm: normalize(c) }));
  const claimed = new Set<string>();
  const result: Partial<Record<Canonical, string>> = {};

  // Pass 1: exact matches (most reliable).
  for (const field of Object.keys(FIELD_ALIASES) as Canonical[]) {
    const aliases = FIELD_ALIASES[field];
    const hit = normalized.find((c) => !claimed.has(c.original) && aliases.includes(c.norm));
    if (hit) {
      result[field] = hit.original;
      claimed.add(hit.original);
    }
  }

  // Pass 2: substring matches for anything still unmapped (longest alias wins).
  for (const field of Object.keys(FIELD_ALIASES) as Canonical[]) {
    if (result[field]) continue;
    const aliases = [...FIELD_ALIASES[field]].sort((a, b) => b.length - a.length);
    const hit = normalized.find(
      (c) => !claimed.has(c.original) && aliases.some((a) => c.norm.includes(a)),
    );
    if (hit) {
      result[field] = hit.original;
      claimed.add(hit.original);
    }
  }

  return result;
}

function rowToLead(raw: Record<string, string>, fields: Partial<Record<Canonical, string>>): Lead {
  const get = (f: Canonical) => {
    const col = fields[f];
    const v = col ? raw[col] : undefined;
    return v?.trim() ? v.trim() : undefined;
  };

  let firstName = get("firstName");
  let lastName = get("lastName");
  let fullName = get("fullName");

  // Explicit first/last columns are authoritative — rebuild fullName from them
  // so a fuzzy "name" match (e.g. Apollo's "Company Name for Emails") can't win.
  if (firstName || lastName) {
    fullName = [firstName, lastName].filter(Boolean).join(" ");
  } else if (fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0];
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
  }

  return {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    fullName,
    email: get("email"),
    title: get("title"),
    company: get("company"),
    linkedin: get("linkedin"),
    website: get("website"),
    location: get("location"),
    raw,
    status: "pending",
  };
}

function rowsToLeads(headers: string[], records: Record<string, string>[]): ParsedFile {
  const fields = detectFields(headers);
  const leads = records
    .filter((r) => Object.values(r).some((v) => v && v.trim() !== ""))
    .map((r) => rowToLead(r, fields));
  return { leads, columns: headers };
}

export function parseCsvText(text: string): ParsedFile {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const headers = (res.meta.fields ?? []).filter(Boolean);
  return rowsToLeads(headers, res.data);
}

function parseWorkbook(buf: ArrayBuffer): ParsedFile {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { leads: [], columns: [] };

  // header:1 gives a 2D array so we keep exact column order and handle blank headers.
  const matrix = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (matrix.length === 0) return { leads: [], columns: [] };

  const seen = new Map<string, number>();
  const headers = (matrix[0] as unknown[]).map((h, i) => {
    let name = String(h ?? "").trim() || `Column ${i + 1}`;
    if (seen.has(name)) {
      const n = seen.get(name)! + 1;
      seen.set(name, n);
      name = `${name} ${n}`;
    } else {
      seen.set(name, 1);
    }
    return name;
  });

  const records: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] as unknown[];
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = String(row[i] ?? "").trim();
    });
    records.push(rec);
  }

  return rowsToLeads(headers, records);
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return parseCsvText(await file.text());
  }
  return parseWorkbook(await file.arrayBuffer());
}

export type ManualLeadValues = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  company?: string;
  email?: string;
  linkedin?: string;
  website?: string;
  location?: string;
};

const STANDARD_COLUMN: Record<Canonical, string> = {
  email: "Email",
  firstName: "First Name",
  lastName: "Last Name",
  fullName: "Full Name",
  title: "Title",
  company: "Company",
  linkedin: "LinkedIn",
  website: "Website",
  location: "Location",
};

/**
 * Build a `raw` row for a manually-added lead. Aligns each value to the file's
 * existing column when one is detected (so a person added to an Apollo export
 * lands in the right Apollo columns), and appends a standard column otherwise.
 */
export function leadValuesToRaw(
  values: ManualLeadValues,
  columns: string[],
): { raw: Record<string, string>; columns: string[] } {
  const fields = detectFields(columns);
  const raw: Record<string, string> = {};
  for (const c of columns) raw[c] = "";
  const outColumns = [...columns];

  (Object.keys(values) as Canonical[]).forEach((key) => {
    const val = (values as Record<Canonical, string | undefined>)[key]?.trim();
    if (!val) return;
    const existing = fields[key];
    if (existing) {
      raw[existing] = val;
    } else {
      const std = STANDARD_COLUMN[key];
      if (!outColumns.includes(std)) outColumns.push(std);
      raw[std] = val;
    }
  });

  return { raw, columns: outColumns };
}
