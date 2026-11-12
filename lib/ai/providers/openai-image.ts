import OpenAI from "openai";
import type { ImageProvider, ImageRequest, ImageResponse, GeneratedImage } from "../types";

/**
 * OpenAI image adapter — gpt-image-1 / DALL·E 3.
 * Economy → gpt-image-1-mini (1024), Standard → gpt-image-1, Premium → dall-e-3 HD.
 */
export class OpenAIImageProvider implements ImageProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI Images";
  private client: OpenAI | null = null;

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  private getClient() {
    if (!this.client) {
      if (!this.isConfigured()) throw new Error("OPENAI_API_KEY not set");
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.client;
  }

  async generateImage(req: ImageRequest): Promise<ImageResponse> {
    const n = Math.min(req.n ?? 1, 4);
    const size = this.normalizeSize(req.size);

    // gpt-image-1 supports arbitrary sizes; dall-e-3 only 1024x1024/1792x1024/1024x1792
    const useGptImage = req.mode !== "premium";
    const model = useGptImage
      ? req.mode === "economy"
        ? "gpt-image-1-mini"
        : "gpt-image-1"
      : "dall-e-3";

    const prompt = req.negativePrompt
      ? `${req.prompt}\n\nAvoid: ${req.negativePrompt}`
      : req.prompt;

    if (useGptImage) {
      const result = await this.getClient().images.generate(
        {
          model,
          prompt,
          size: size as "1024x1024" | "1536x1024" | "1024x1536" | "auto",
          n: 1, // gpt-image-1 generates one image per call
          quality: req.mode === "premium" ? "high" : "medium",
        },
        req.timeoutMs ? { timeout: req.timeoutMs } : undefined,
      );

      const images: GeneratedImage[] = [];
      const data = result.data ?? [];
      for (let i = 0; i < n; i++) {
        const item = data[i % Math.max(data.length, 1)];
        if (item?.b64_json) {
          images.push({
            data: `data:image/png;base64,${item.b64_json}`,
            mimeType: "image/png",
          });
        }
      }
      return { images, provider: this.id, model };
    }

    // DALL·E 3 path (premium)
    const result = await this.getClient().images.generate(
      {
        model,
        prompt,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
        quality: "hd",
        n: 1,
        response_format: "b64_json",
      },
      req.timeoutMs ? { timeout: req.timeoutMs } : undefined,
    );

    const images: GeneratedImage[] = (result.data ?? [])
      .filter((d) => d.b64_json)
      .map((d) => ({
        data: `data:image/png;base64,${d.b64_json}`,
        mimeType: "image/png",
      }));

    return { images, provider: this.id, model };
  }

  private normalizeSize(size?: string): string {
    if (!size) return "1024x1024";
    // Accept "1024x1536" style or "portrait"/"landscape" hints
    if (/^\d+x\d+$/.test(size)) return size;
    if (size === "portrait") return "1024x1536";
    if (size === "landscape") return "1536x1024";
    return "1024x1024";
  }
}
