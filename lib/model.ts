// Server-side model resolution. Falls back to "mock" mode when no key is set,
// so the app runs end-to-end with zero configuration.
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { GenerationMode } from "./types";

const MODEL_ID = process.env.AI_MODEL || "claude-sonnet-4-6";

export function resolveModel(): { model: LanguageModel | null; mode: GenerationMode } {
  // Direct Anthropic API key takes priority (simplest local setup).
  if (process.env.ANTHROPIC_API_KEY) {
    return { model: anthropic(MODEL_ID), mode: "anthropic" };
  }
  // Vercel AI Gateway: pass a "creator/model" string, resolved by the default provider.
  if (process.env.AI_GATEWAY_API_KEY) {
    return { model: `anthropic/${MODEL_ID}`, mode: "gateway" };
  }
  return { model: null, mode: "mock" };
}

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY);
}
