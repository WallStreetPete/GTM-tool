import { NextResponse } from "next/server";
import { aiAvailable, resolveModel, GEN_MODEL_ID } from "@/lib/model";
import { enrichmentProvider } from "@/lib/enrich";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    aiAvailable: aiAvailable(),
    mode: resolveModel().mode,
    enrichment: enrichmentProvider(),
    model: GEN_MODEL_ID,
  });
}
