import type {
  TextProvider,
  ImageProvider,
  TextRequest,
  TextResponse,
  ImageRequest,
  ImageResponse,
  UsageRecord,
} from "./types";
import { OpenAITextProvider } from "./providers/openai-text";
import { AnthropicTextProvider } from "./providers/anthropic-text";
import { GoogleTextProvider } from "./providers/google-text";
import { OpenAIImageProvider } from "./providers/openai-image";
import { StabilityImageProvider } from "./providers/stability-image";
import { ReplicateImageProvider } from "./providers/replicate-image";

/**
 * Provider registry + fallback dispatcher.
 *
 * Providers are tried in the order defined by AI_TEXT_PROVIDERS /
 * AI_IMAGE_PROVIDERS env vars (comma-separated). Unconfigured providers
 * are skipped. The first successful response wins; failures are collected
 * and thrown only if every provider fails.
 */

const textProviders: Record<string, () => TextProvider> = {
  openai: () => new OpenAITextProvider(),
  anthropic: () => new AnthropicTextProvider(),
  google: () => new GoogleTextProvider(),
};

const imageProviders: Record<string, () => ImageProvider> = {
  openai: () => new OpenAIImageProvider(),
  stability: () => new StabilityImageProvider(),
  replicate: () => new ReplicateImageProvider(),
};

function order(envVar: string, available: string[]): string[] {
  const configured = (process.env[envVar] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = configured.length ? configured : available;
  return list.filter((id) => available.includes(id));
}

/**
 * Convert raw provider error messages (HTTP status codes, JSON blobs,
 * billing errors) into short human-readable explanations.
 */
function humanizeProviderError(raw: string): string {
  const msg = raw.toLowerCase();

  // Billing / credits
  if (msg.includes("no credits remaining") || msg.includes("credit balance is too low") || msg.includes("insufficient_quota") || msg.includes("billing")) {
    return "out of API credits — add credits in the provider's billing settings";
  }
  // Rate limits
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("too many requests")) {
    return "rate limited — too many requests, try again shortly";
  }
  // Auth
  if (msg.includes("401") || msg.includes("403") || msg.includes("invalid api key") || msg.includes("unauthorized") || msg.includes("authentication")) {
    return "authentication failed — check the API key";
  }
  // Provider overload / 5xx
  if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("unavailable") || msg.includes("500") || msg.includes("502") || msg.includes("504")) {
    return "temporarily unavailable — the provider is overloaded, try again later";
  }
  // Model issues
  if (msg.includes("model") && (msg.includes("not found") || msg.includes("does not exist") || msg.includes("not supported"))) {
    return "requested model is not available on this provider";
  }
  // Context / token limits
  if (msg.includes("context length") || msg.includes("maximum context") || msg.includes("token limit") || msg.includes("too long")) {
    return "request too large — the prompt exceeds the model's context limit";
  }
  // Content policy
  if (msg.includes("content policy") || msg.includes("content_filter") || msg.includes("safety") || msg.includes("blocked")) {
    return "request blocked by the provider's content policy";
  }

  // Fallback: strip JSON noise and truncate
  const cleaned = raw
    .replace(/\{[\s\S]*\}/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned || "unknown error";
}

export function listTextProviders(): { id: string; displayName: string; configured: boolean }[] {
  return order("AI_TEXT_PROVIDERS", Object.keys(textProviders)).map((id) => {
    const p = textProviders[id]();
    return { id, displayName: p.displayName, configured: p.isConfigured() };
  });
}

export function listImageProviders(): { id: string; displayName: string; configured: boolean }[] {
  return order("AI_IMAGE_PROVIDERS", Object.keys(imageProviders)).map((id) => {
    const p = imageProviders[id]();
    return { id, displayName: p.displayName, configured: p.isConfigured() };
  });
}

export async function generateTextWithFallback(
  req: TextRequest,
): Promise<{ response: TextResponse; usage: UsageRecord }> {
  const errors: string[] = [];
  for (const id of order("AI_TEXT_PROVIDERS", Object.keys(textProviders))) {
    const provider = textProviders[id]();
    if (!provider.isConfigured()) continue;
    try {
      const response = await provider.generateText(req);
      return {
        response,
        usage: {
          kind: "text",
          provider: response.provider,
          model: response.model,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          mode: req.mode ?? "standard",
        },
      };
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      errors.push(`${id}: ${humanizeProviderError(raw)}`);
    }
  }
  throw new Error(
    errors.length
      ? `All text providers failed — ${errors.join(" | ")}`
      : "No text providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY.",
  );
}

export async function generateImageWithFallback(
  req: ImageRequest,
): Promise<{ response: ImageResponse; usage: UsageRecord }> {
  const errors: string[] = [];
  for (const id of order("AI_IMAGE_PROVIDERS", Object.keys(imageProviders))) {
    const provider = imageProviders[id]();
    if (!provider.isConfigured()) continue;
    try {
      const response = await provider.generateImage(req);
      if (response.images.length === 0) throw new Error("provider returned no images");
      return {
        response,
        usage: {
          kind: "image",
          provider: response.provider,
          model: response.model,
          imageCount: response.images.length,
          mode: req.mode ?? "standard",
        },
      };
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      errors.push(`${id}: ${humanizeProviderError(raw)}`);
    }
  }
  throw new Error(
    errors.length
      ? `All image providers failed — ${errors.join(" | ")}`
      : "No image providers configured. Set OPENAI_API_KEY, STABILITY_API_KEY, or REPLICATE_API_TOKEN.",
  );
}
