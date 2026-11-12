/** Shared types for the AI provider abstraction layer. */

export type GenerationMode = "economy" | "standard" | "premium";

export interface TextRequest {
  /** System-level instructions (role, constraints, style). */
  system?: string;
  /** The user/task prompt. */
  prompt: string;
  /** Optional conversation history for multi-turn calls. */
  messages?: ChatMessage[];
  /** Economy | standard | premium — maps to provider model tiers. */
  mode?: GenerationMode;
  /** Hard cap on output tokens. */
  maxTokens?: number;
  /** Sampling temperature 0–2. */
  temperature?: number;
  /** JSON schema / "json" for structured output where supported. */
  responseFormat?: "text" | "json";
  /** Abort / timeout in ms. */
  timeoutMs?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TextResponse {
  text: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  /** Parsed JSON when responseFormat === "json" and provider supports it. */
  json?: unknown;
}

export interface ImageRequest {
  prompt: string;
  negativePrompt?: string;
  /** e.g. "1024x1024", "1024x1536" — normalized per provider. */
  size?: string;
  /** Number of images (1–4). */
  n?: number;
  /** Provider-specific style hint. */
  style?: string;
  mode?: GenerationMode;
  timeoutMs?: number;
}

export interface GeneratedImage {
  /** Base64 data URL or raw bytes depending on provider. */
  data: string;
  mimeType: string;
  /** Provider-side seed if supported (for consistency retries). */
  seed?: number;
}

export interface ImageResponse {
  images: GeneratedImage[];
  provider: string;
  model: string;
}

export interface TextProvider {
  readonly id: string;
  readonly displayName: string;
  isConfigured(): boolean;
  generateText(req: TextRequest): Promise<TextResponse>;
}

export interface ImageProvider {
  readonly id: string;
  readonly displayName: string;
  isConfigured(): boolean;
  generateImage(req: ImageRequest): Promise<ImageResponse>;
}

/** Cost estimate record written to usage_events. */
export interface UsageRecord {
  kind: "text" | "image";
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  imageCount?: number;
  estimatedCostUsd?: number;
  mode: GenerationMode;
}
