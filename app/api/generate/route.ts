import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/model";
import { mockLine } from "@/lib/generate-mock";
import type { GenerateConfig, GenerateResult, Lead } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type LeadPayload = {
  id: string;
  firstName?: string;
  fullName?: string;
  title?: string;
  company?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  dossier?: { summary: string; signals: string[] } | null;
};

type Body = { leads: LeadPayload[]; config: GenerateConfig };

const resultSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().describe("The exact lead id provided in the input."),
      line: z.string().describe("The personalized opening line for this lead."),
    }),
  ),
});

function describeLead(l: LeadPayload): string {
  const parts = [
    `[id:${l.id}]`,
    l.fullName || l.firstName || "Unknown name",
    l.title ? `— ${l.title}` : "",
    l.company ? `at ${l.company}` : "",
    l.location ? `(${l.location})` : "",
  ].filter(Boolean);
  let s = parts.join(" ");
  if (l.website) s += ` | site: ${l.website}`;
  if (l.dossier?.summary) s += `\n   Background: ${l.dossier.summary}`;
  if (l.dossier?.signals?.length) s += `\n   Signals: ${l.dossier.signals.join("; ")}`;
  return s;
}

function buildSystem(config: GenerateConfig): string {
  return [
    "You write the OPENING line(s) of cold outbound emails — the personalized hook that comes before any pitch.",
    "",
    "Hard rules:",
    "- Reference something specific and true-sounding about the person or their company. Use the provided Background/Signals when present; otherwise infer tastefully from role + company.",
    "- NEVER invent verifiable specifics (funding rounds, dollar figures, headcounts, press, awards) unless they appear in the provided background.",
    `- Length: at most ${config.lines} sentence${config.lines > 1 ? "s" : ""}, under ~30 words per sentence.`,
    "- No greeting, no sign-off, no pitch — just the hook.",
    "- Banned clichés: \"I hope this finds you well\", \"I came across your profile\", \"As a {title}\", \"In today's fast-paced world\", \"I wanted to reach out\".",
    "- It must read like one sharp human wrote it to another — not a template.",
    config.personalityAware
      ? "- Infer each person's communication style from their role/background and match the tone."
      : "",
    "",
    "Style instructions from the user:",
    config.style || "(none)",
    "",
    "Campaign context:",
    `- Theme: ${config.theme || "(not specified)"}`,
    `- Target ICP: ${config.icp || "(not specified)"}`,
    `- What we offer: ${config.offer || "(not specified)"}`,
    "",
    "Return exactly one result per lead, echoing each lead's id verbatim.",
  ]
    .filter(Boolean)
    .join("\n");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const leads = body.leads ?? [];
  const config = body.config;
  if (!leads.length) {
    return NextResponse.json({ results: [], mode: "mock", degraded: 0 });
  }

  const { model, mode } = resolveModel();

  // No key configured -> deterministic demo lines.
  if (!model) {
    const results: GenerateResult[] = leads.map((l) => ({
      id: l.id,
      line: mockLine(l as unknown as Lead, config),
    }));
    return NextResponse.json({ results, mode: "mock", degraded: 0 });
  }

  const system = buildSystem(config);
  const batches = chunk(leads, 18);
  let degraded = 0;

  const batchResults = await runPool(batches, 4, async (batch): Promise<GenerateResult[]> => {
    const prompt =
      "Write the opening line for each of these leads:\n\n" +
      batch.map(describeLead).join("\n\n");
    try {
      const { object } = await generateObject({
        model,
        schema: resultSchema,
        system,
        prompt,
        temperature: 0.7,
      });
      const byId = new Map(object.results.map((r) => [r.id, r.line]));
      // Ensure every lead gets a line even if the model dropped one.
      return batch.map((l) => ({
        id: l.id,
        line: byId.get(l.id) ?? mockLine(l as unknown as Lead, config),
      }));
    } catch {
      degraded += batch.length;
      return batch.map((l) => ({ id: l.id, line: mockLine(l as unknown as Lead, config) }));
    }
  });

  const results = batchResults.flat();
  return NextResponse.json({ results, mode, degraded });
}
