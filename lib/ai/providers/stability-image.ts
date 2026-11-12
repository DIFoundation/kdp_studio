import type { ImageProvider, ImageRequest, ImageResponse, GeneratedImage } from "../types";

/**
 * Stability AI adapter — Stable Image Ultra / Core.
 * Good for illustration and line-art style control via negative prompts.
 */
export class StabilityImageProvider implements ImageProvider {
  readonly id = "stability";
  readonly displayName = "Stability AI";

  isConfigured() {
    return Boolean(process.env.STABILITY_API_KEY);
  }

  async generateImage(req: ImageRequest): Promise<ImageResponse> {
    if (!this.isConfigured()) throw new Error("STABILITY_API_KEY not set");

    const premium = req.mode === "premium";
    const endpoint = premium
      ? "https://api.stability.ai/v2beta/stable-image/generate/ultra"
      : "https://api.stability.ai/v2beta/stable-image/generate/core";

    const [width, height] = this.parseSize(req.size);

    const form = new FormData();
    form.append("prompt", req.prompt);
    form.append("output_format", "png");
    form.append("width", String(width));
    form.append("height", String(height));
    if (req.negativePrompt) form.append("negative_prompt", req.negativePrompt);
    form.append("samples", String(Math.min(req.n ?? 1, 4)));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*",
      },
      body: form,
      signal: req.timeoutMs ? AbortSignal.timeout(req.timeoutMs) : undefined,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stability API error ${res.status}: ${err.slice(0, 300)}`);
    }

    // v2beta returns a single image; for multiple samples use multipart —
    // here we request samples=1 per call for simplicity and loop outside.
    const buf = Buffer.from(await res.arrayBuffer());
    const images: GeneratedImage[] = [
      { data: `data:image/png;base64,${buf.toString("base64")}`, mimeType: "image/png" },
    ];

    return {
      images,
      provider: this.id,
      model: premium ? "stable-image-ultra" : "stable-image-core",
    };
  }

  private parseSize(size?: string): [number, number] {
    if (size && /^\d+x\d+$/.test(size)) {
      const [w, h] = size.split("x").map(Number);
      return [w, h];
    }
    if (size === "portrait") return [896, 1152];
    if (size === "landscape") return [1152, 896];
    return [1024, 1024];
  }
}
