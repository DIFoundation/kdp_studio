import Replicate from "replicate";
import type { ImageProvider, ImageRequest, ImageResponse, GeneratedImage } from "../types";

/**
 * Replicate adapter — access to many open models.
 * Default: black-forest-labs/flux-schnell (fast) or flux-dev (quality).
 * Custom model can be set via REPLICATE_IMAGE_MODEL env var.
 */
export class ReplicateImageProvider implements ImageProvider {
  readonly id = "replicate";
  readonly displayName = "Replicate";
  private client: Replicate | null = null;

  isConfigured() {
    return Boolean(process.env.REPLICATE_API_TOKEN);
  }

  private getClient() {
    if (!this.client) {
      if (!this.isConfigured()) throw new Error("REPLICATE_API_TOKEN not set");
      this.client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    }
    return this.client;
  }

  async generateImage(req: ImageRequest): Promise<ImageResponse> {
    const model =
      process.env.REPLICATE_IMAGE_MODEL ??
      (req.mode === "economy"
        ? "black-forest-labs/flux-schnell"
        : "black-forest-labs/flux-dev");

    const [width, height] = this.parseSize(req.size);

    const output = (await this.getClient().run(model as `${string}/${string}`, {
      input: {
        prompt: req.prompt,
        ...(req.negativePrompt ? { negative_prompt: req.negativePrompt } : {}),
        width,
        height,
        num_outputs: Math.min(req.n ?? 1, 4),
        ...(req.mode === "premium" ? { guidance: 3.5, num_inference_steps: 28 } : {}),
      },
    })) as unknown;

    const urls = Array.isArray(output) ? output : [output];
    const images: GeneratedImage[] = [];

    for (const item of urls) {
      const url = typeof item === "string" ? item : (item as { url?: () => URL | string })?.url?.();
      const href = typeof url === "string" ? url : url?.toString();
      if (!href) continue;
      const res = await fetch(href);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/png";
      images.push({ data: `data:${mime};base64,${buf.toString("base64")}`, mimeType: mime });
    }

    return { images, provider: this.id, model };
  }

  private parseSize(size?: string): [number, number] {
    if (size && /^\d+x\d+$/.test(size)) {
      const [w, h] = size.split("x").map(Number);
      return [w, h];
    }
    if (size === "portrait") return [832, 1216];
    if (size === "landscape") return [1216, 832];
    return [1024, 1024];
  }
}
