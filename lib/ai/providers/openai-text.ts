import OpenAI from "openai";
import type { TextProvider, TextRequest, TextResponse } from "../types";

/**
 * OpenAI adapter — GPT-4o / GPT-4o-mini chat completions.
 * Economy → gpt-4o-mini, Standard → gpt-4o, Premium → gpt-4o + higher effort.
 */
export class OpenAITextProvider implements TextProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";
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

  private modelFor(mode: TextRequest["mode"]) {
    switch (mode) {
      case "economy":
        return "gpt-4o-mini";
      case "premium":
        return "gpt-4o";
      default:
        return "gpt-4o";
    }
  }

  async generateText(req: TextRequest): Promise<TextResponse> {
    const model = this.modelFor(req.mode);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    if (req.messages?.length) {
      for (const m of req.messages) messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: req.prompt });

    const completion = await this.getClient().chat.completions.create(
      {
        model,
        messages,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.8,
        ...(req.responseFormat === "json"
          ? { response_format: { type: "json_object" as const } }
          : {}),
      },
      req.timeoutMs ? { timeout: req.timeoutMs } : undefined,
    );

    const text = completion.choices[0]?.message?.content ?? "";
    let json: unknown;
    if (req.responseFormat === "json") {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }

    return {
      text,
      provider: this.id,
      model,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      json,
    };
  }
}
