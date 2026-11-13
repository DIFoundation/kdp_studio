import type { Project, BookBible } from "@/lib/types";
import { projectContext, bibleContext } from "./prompts";

const JSON_ONLY =
  'Respond with ONLY a valid JSON object — no markdown fences, no commentary.';

/** Keyword research prompt — relevance-ranked Amazon search terms. */
export function keywordPrompt(
  p: Project,
  bible: BookBible | null,
): { system: string; prompt: string } {
  return {
    system:
      "You are an Amazon KDP SEO specialist. You produce realistic, relevant " +
      "keyword sets for book listings. You NEVER invent search volume numbers, " +
      "rankings, or sales data — you rank by relevance and buyer intent only.",
    prompt: `Research keywords for this book's Amazon listing.

${projectContext(p)}
${bibleContext(bible)}

${JSON_ONLY}

Return JSON:
{
  "primary_keywords": [
    {"term": "...", "intent": "buyer|browser|researcher", "relevance": 1-10, "rationale": "why this term fits"}
  ],
  "long_tail_keywords": [
    {"term": "...", "intent": "...", "relevance": 1-10, "rationale": "..."}
  ],
  "negative_keywords": ["terms to avoid — irrelevant or misleading"],
  "category_suggestions": ["Amazon browse category paths, most specific first"],
  "audience_segments": ["distinct reader segments this book serves"],
  "competition_notes": "honest qualitative assessment — NO invented numbers",
  "title_keyword_opportunities": ["keywords that could strengthen the title/subtitle"]
}

Rules:
- 10-15 primary keywords, 10-15 long-tail.
- relevance is YOUR estimate of fit (1-10), not a metric.
- Include genre conventions, reader pain points, and comparison-style terms.
- Do not fabricate popularity or volume claims.`,
  };
}

/** Full listing copy generation prompt. */
export function listingPrompt(
  p: Project,
  bible: BookBible | null,
  keywords: string[],
): { system: string; prompt: string } {
  return {
    system:
      "You are an Amazon KDP copywriter and SEO specialist. You write listing " +
      "copy that converts browsers into buyers while staying honest — no " +
      "clickbait, no fabricated endorsements or awards.",
    prompt: `Write the complete Amazon KDP listing for this book.

${projectContext(p)}
${bibleContext(bible)}
${keywords.length ? `\nTarget keywords to weave in naturally: ${keywords.slice(0, 15).join(", ")}` : ""}

${JSON_ONLY}

Return JSON:
{
  "title": "KDP-optimized title (max 200 chars, keyword-front-loaded but natural)",
  "subtitle": "compelling subtitle or null",
  "description": "full HTML-formatted listing description (use <p>, <b>, <i>, <ul><li> — Amazon supports basic HTML). 400-600 words. Hook in first 2 sentences, include 'About the author' section at end.",
  "keywords": ["7 KDP backend keyword phrases — comma-separated concepts, NO repeated words from title, each under 50 chars, no punctuation"],
  "categories": ["3-5 Amazon category paths, most specific first"],
  "target_audience": "concise reader description",
  "author_bio": "100-150 word author bio in third person",
  "series_name": "series name or null",
  "series_description": "series description or null"
}

Rules:
- Title must read naturally — keyword stuffing hurts conversion.
- Description: short paragraphs, emotional hook, concrete benefits, social-proof-free (no invented reviews).
- Backend keywords: cover synonyms, misspellings, adjacent genres.
- Everything must be truthful to the actual book concept.`,
  };
}

/** Listing critique/optimization prompt — review existing copy. */
export function listingCritiquePrompt(
  p: Project,
  listing: {
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    keywords?: string[];
    categories?: string[];
  },
): { system: string; prompt: string } {
  return {
    system:
      "You are a senior KDP publishing consultant reviewing a book listing. " +
      "You give honest, specific, actionable feedback — never generic praise.",
    prompt: `Critique this Amazon KDP listing and suggest improvements.

${projectContext(p)}

Current listing:
- Title: ${listing.title ?? "(none)"}
- Subtitle: ${listing.subtitle ?? "(none)"}
- Description: ${listing.description ? `${listing.description.slice(0, 1500)}${listing.description.length > 1500 ? "…" : ""}` : "(none)"}
- Keywords: ${(listing.keywords ?? []).join(", ") || "(none)"}
- Categories: ${(listing.categories ?? []).join(", ") || "(none)"}

${JSON_ONLY}

Return JSON:
{
  "score": 1-10 overall listing quality,
  "strengths": ["what works"],
  "issues": [{"area": "title|description|keywords|categories|audience", "problem": "...", "fix": "specific suggestion"}],
  "optimized_title": "improved title or null if current is fine",
  "optimized_subtitle": "improved subtitle or null",
  "missing_elements": ["things a strong KDP listing should have that this lacks"]
}`,
  };
}
