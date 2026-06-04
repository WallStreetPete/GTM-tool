import { NextResponse } from "next/server";
import { aiAvailable, resolveModel } from "@/lib/model";
import { enrichmentProvider } from "@/lib/enrich";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    aiAvailable: aiAvailable(),
    mode: resolveModel().mode,
    enrichment: enrichmentProvider(),
    model: process.env.AI_MODEL || "claude-sonnet-4-6",
  });
}
