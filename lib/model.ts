// Server-side model resolution. Falls back to "mock" mode when no key is set,
// so the app runs end-to-end with zero configuration.
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { GenerationMode } from "./types";

// The email opener is generated with the most capable model by default (Opus 4.8).
export const GEN_MODEL_ID = process.env.GEN_MODEL || "claude-opus-4-8";
// Other, cheaper model uses (e.g. enrichment web-summary) default to Sonnet.
const DEFAULT_MODEL_ID = process.env.AI_MODEL || "claude-sonnet-4-6";

export function resolveModel(modelId: string = DEFAULT_MODEL_ID): {
  model: LanguageModel | null;
  mode: GenerationMode;
} {
  // Direct Anthropic API key takes priority (simplest local setup).
  if (process.env.ANTHROPIC_API_KEY) {
    return { model: anthropic(modelId), mode: "anthropic" };
  }
  // Vercel AI Gateway: pass a "creator/model" string, resolved by the default provider.
  if (process.env.AI_GATEWAY_API_KEY) {
    return { model: `anthropic/${modelId}`, mode: "gateway" };
  }
  return { model: null, mode: "mock" };
}

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY);
}
