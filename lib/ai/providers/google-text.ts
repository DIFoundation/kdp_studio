import { GoogleGenAI } from "@google/genai";
import type { TextProvider, TextRequest, TextResponse } from "../types";

/**
 * Google adapter — Gemini models.
 * Economy → gemini-2.0-flash, Standard → gemini-2.5-flash, Premium → gemini-2.5-pro.
 */
export class GoogleTextProvider implements TextProvider {
  readonly id = "google";
  readonly displayName = "Google";
  private client: GoogleGenAI | null = null;

  isConfigured() {
    return Boolean(process.env.GOOGLE_API_KEY);
  }

  private getClient() {
    if (!this.client) {
      if (!this.isConfigured()) throw new Error("GOOGLE_API_KEY not set");
      this.client = new GoogleGenAI({
        apiKey: process.env.GOOGLE_API_KEY,
        httpOptions: { apiVersion: "v1beta" },
      });
    }
    return this.client;
  }

  private modelFor(mode: TextRequest["mode"]) {
    switch (mode) {
      case "economy":
        return "gemini-2.0-flash";
      case "premium":
        return "gemini-2.5-pro";
      default:
        return "gemini-2.5-flash";
    }
  }

  async generateText(req: TextRequest): Promise<TextResponse> {
    const model = this.modelFor(req.mode);

    const contents: { role: string; parts: { text: string }[] }[] = [];
    if (req.messages?.length) {
      for (const m of req.messages) {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: req.prompt }] });

    const response = await this.getClient().models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: req.system,
        maxOutputTokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.8,
        ...(req.responseFormat === "json"
          ? { responseMimeType: "application/json" }
          : {}),
      },
    });

    const text = response.text ?? "";
    const usage = response.usageMetadata;

    return {
      text,
      provider: this.id,
      model,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
    };
  }
}
