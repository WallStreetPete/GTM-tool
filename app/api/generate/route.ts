import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { resolveModel, GEN_MODEL_ID } from "@/lib/model";
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
    "You write ONLY the opening line(s) of a cold outbound email — a short, personalized hook about the recipient. The pitch/offer is handled elsewhere; never pitch or sell.",
    "",
    "The user's two instruction blocks below are BOTH mandatory. Honor the HOW-TO-OPEN approach AND the TONE & STYLE together — they override your own default writing habits, not each other.",
    "",
    "## HOW TO OPEN (how the first line should approach the person):",
    config.opening?.trim() ||
      "Lead with one specific, genuine observation about the person, drawn from their background.",
    "",
    "## TONE & STYLE (the voice — always obey this):",
    config.style || "Warm, specific, and human.",
    "",
    "## RULES:",
    "- The example lines above show the intended TONE and approach — they are NOT scripts. Write each opener fresh in your own words; vary the wording so different leads never get the same opening phrase. Do not copy an example sentence verbatim.",
    "- If the instructions say to react to their background a certain way (impressive, inspiring), convey that genuinely and specifically, anchored to ONE concrete real detail — phrased naturally, never as a canned compliment.",
    "- Use only ONE specific, true hook from their real Background / Signals — don't cram a list of facts. Do NOT invent anything (funding, figures, headcounts, awards, news) that isn't in the provided background.",
    "- If little or no real background is provided for a person, keep it short and grounded in their actual role/company instead of faking specifics or gushing.",
    `- Hard length limit: at most ${config.maxChars} characters. Count characters and never exceed it.`,
    "- Output the opener only: no greeting, no sign-off, no pitch.",
    config.personalityAware
      ? "- Match the person's likely communication style, inferred from their role and background."
      : "",
    config.theme?.trim()
      ? `- Loose context (do NOT pitch it): ${config.theme.trim()}`
      : "",
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
    return NextResponse.json({ results: [], mode: "mock", failed: 0 });
  }

  const { model, mode } = resolveModel(config.model?.trim() || GEN_MODEL_ID);

  // No key configured -> deterministic demo lines.
  if (!model) {
    const results: GenerateResult[] = leads.map((l) => ({
      id: l.id,
      line: mockLine(l as unknown as Lead, config),
    }));
    return NextResponse.json({ results, mode: "mock", failed: 0 });
  }

  const system = buildSystem(config);
  const batches = chunk(leads, 18);
  let failed = 0;

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
        // Cap the output budget (default was the model max, ~128k) so each
        // request is lighter and less likely to be throttled/overloaded.
        maxOutputTokens: Math.min(8000, Math.ceil(config.maxChars / 3) * batch.length + 400),
        // Retry transient 429/529 (overloaded) errors with backoff.
        maxRetries: 4,
      });
      const byId = new Map(object.results.map((r) => [r.id, r.line]));
      // Only keep leads the model actually wrote a line for — never a mock
      // placeholder when a real model is configured. Dropped leads count as failed.
      const out = batch
        .filter((l) => byId.get(l.id)?.trim())
        .map((l) => ({ id: l.id, line: byId.get(l.id)!.trim() }));
      failed += batch.length - out.length;
      return out;
    } catch (err) {
      console.error("[generate] chunk failed:", err);
      failed += batch.length;
      return [] as GenerateResult[];
    }
  });

  const results = batchResults.flat();
  return NextResponse.json({ results, mode, failed });
}
