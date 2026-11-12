import { createServiceClient } from "@/lib/supabase/server";
import type { UsageRecord } from "./types";

/** Rough per-unit cost table (USD). Update as provider pricing changes. */
const COSTS: Record<string, { inputPer1M?: number; outputPer1M?: number; perImage?: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "claude-3-5-haiku-latest": { inputPer1M: 0.8, outputPer1M: 4 },
  "claude-sonnet-4-5": { inputPer1M: 3, outputPer1M: 15 },
  "claude-opus-4-1": { inputPer1M: 15, outputPer1M: 75 },
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10 },
  "gpt-image-1-mini": { perImage: 0.02 },
  "gpt-image-1": { perImage: 0.04 },
  "dall-e-3": { perImage: 0.08 },
  "stable-image-core": { perImage: 0.03 },
  "stable-image-ultra": { perImage: 0.08 },
};

function estimateCost(u: UsageRecord): number | undefined {
  const table = COSTS[u.model];
  if (!table) return undefined;
  if (u.kind === "image") {
    return table.perImage != null ? table.perImage * (u.imageCount ?? 1) : undefined;
  }
  const input = ((u.promptTokens ?? 0) / 1_000_000) * (table.inputPer1M ?? 0);
  const output = ((u.completionTokens ?? 0) / 1_000_000) * (table.outputPer1M ?? 0);
  return input + output;
}

/** Persist a usage event. Uses service role so it works inside generation pipelines. */
export async function logUsage(
  userId: string,
  projectId: string | null,
  record: UsageRecord,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("usage_events").insert({
      user_id: userId,
      project_id: projectId,
      kind: record.kind,
      provider: record.provider,
      model: record.model,
      prompt_tokens: record.promptTokens ?? null,
      completion_tokens: record.completionTokens ?? null,
      image_count: record.imageCount ?? null,
      estimated_cost_usd: estimateCost(record) ?? null,
      mode: record.mode,
    });
  } catch (err) {
    // Never let cost logging break generation.
    console.error("[usage] failed to log event:", err);
  }
}
