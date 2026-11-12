import Anthropic from "@anthropic-ai/sdk";
import type { TextProvider, TextRequest, TextResponse } from "../types";

/**
 * Anthropic adapter — Claude models.
 * Economy → claude-3-5-haiku, Standard → claude-sonnet-4-5, Premium → claude-opus-4-1.
 */
export class AnthropicTextProvider implements TextProvider {
  readonly id = "anthropic";
  readonly displayName = "Anthropic";
  private client: Anthropic | null = null;

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  private getClient() {
    if (!this.client) {
      if (!this.isConfigured()) throw new Error("ANTHROPIC_API_KEY not set");
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  private modelFor(mode: TextRequest["mode"]) {
    switch (mode) {
      case "economy":
        return "claude-3-5-haiku-latest";
      case "premium":
        return "claude-opus-4-1";
      default:
        return "claude-sonnet-4-5";
    }
  }

  async generateText(req: TextRequest): Promise<TextResponse> {
    const model = this.modelFor(req.mode);

    const messages: Anthropic.MessageParam[] = [];
    if (req.messages?.length) {
      for (const m of req.messages) {
        if (m.role === "system") continue; // handled via system param
        messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
      }
    }
    messages.push({ role: "user", content: req.prompt });

    const response = await this.getClient().messages.create(
      {
        model,
        max_tokens: req.maxTokens ?? 4096,
        system: req.system,
        messages,
      },
      req.timeoutMs ? { timeout: req.timeoutMs } : undefined,
    );

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      provider: this.id,
      model,
      promptTokens: response.usage?.input_tokens,
      completionTokens: response.usage?.output_tokens,
    };
  }
}
