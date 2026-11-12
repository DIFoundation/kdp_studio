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
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
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
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(
    errors.length
      ? `All image providers failed — ${errors.join(" | ")}`
      : "No image providers configured. Set OPENAI_API_KEY, STABILITY_API_KEY, or REPLICATE_API_TOKEN.",
  );
}
