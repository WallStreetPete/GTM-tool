import { NextResponse } from "next/server";
import { enrichLead, enrichmentProvider, type EnrichInput } from "@/lib/enrich";
import type { Dossier } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { leads: EnrichInput[] };

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
  if (!leads.length) {
    return NextResponse.json({ results: [], provider: enrichmentProvider() });
  }

  const results = await runPool(leads, 4, async (lead): Promise<{ id: string; dossier: Dossier }> => {
    const dossier = await enrichLead(lead);
    return { id: lead.id, dossier };
  });

  return NextResponse.json({ results, provider: enrichmentProvider() });
}
