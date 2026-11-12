import type { Project, BookBible, Section } from "@/lib/types";

/** Shared context block describing the project for any generation prompt. */
export function projectContext(p: Project): string {
  const lines = [
    `Title: ${p.title}`,
    p.subtitle ? `Subtitle: ${p.subtitle}` : null,
    `Category: ${p.category}${p.subcategory ? ` / ${p.subcategory}` : ""}`,
    p.target_audience ? `Target audience: ${p.target_audience}` : null,
    p.age_range ? `Age range: ${p.age_range}` : null,
    p.topic ? `Topic / premise seed: ${p.topic}` : null,
    p.tone ? `Tone: ${p.tone}` : null,
    `Language: ${p.language}`,
    p.word_count_target ? `Target length: ~${p.word_count_target.toLocaleString()} words` : null,
    p.chapter_count ? `Target chapters/sections: ${p.chapter_count}` : null,
    p.author_name ? `Author name: ${p.author_name}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function bibleContext(b: BookBible | null): string {
  if (!b) return "";
  const parts: string[] = [];
  if (b.premise) parts.push(`Premise: ${b.premise}`);
  if (b.themes.length) parts.push(`Themes: ${JSON.stringify(b.themes)}`);
  if (b.characters.length) parts.push(`Characters: ${JSON.stringify(b.characters)}`);
  if (Object.keys(b.world_building).length)
    parts.push(`World building: ${JSON.stringify(b.world_building)}`);
  if (Object.keys(b.style_guide).length)
    parts.push(`Style guide: ${JSON.stringify(b.style_guide)}`);
  if (b.continuity_notes) parts.push(`Continuity notes: ${b.continuity_notes}`);
  return parts.length ? `\nBook bible:\n${parts.join("\n")}` : "";
}

const JSON_ONLY =
  'Respond with ONLY a valid JSON object — no markdown fences, no commentary.';

export function conceptPrompt(p: Project): { system: string; prompt: string } {
  return {
    system:
      "You are a senior book developer and developmental editor for Amazon KDP. " +
      "You develop coherent, commercially viable book concepts. Never invent sales " +
      "figures, rankings, or competitor data.",
    prompt: `Develop a complete book concept for the following project.

${projectContext(p)}

${JSON_ONLY}

Return JSON with exactly these keys:
{
  "premise": "2-4 sentence story/concept premise",
  "themes": ["theme1", "theme2"],
  "characters": [{"name": "...", "role": "...", "description": "..."}],
  "world_building": {"setting": "...", "era": "...", "key_elements": ["..."]},
  "style_guide": {"voice": "...", "pov": "...", "tense": "...", "notable_conventions": ["..."]},
  "timeline": ["beat1", "beat2"],
  "continuity_notes": "Key facts the writer must stay consistent with",
  "suggested_title": "optional improved title or null",
  "suggested_subtitle": "optional subtitle or null"
}

For non-fiction, adapt: characters may be key figures/experts, world_building
becomes subject-matter scope, timeline becomes chapter progression.`,
  };
}

export interface BlueprintSection {
  title: string;
  type: "front_matter" | "chapter" | "exercise" | "coloring_page" | "back_matter" | "worksheet";
  summary: string;
  word_count_target?: number;
}

export function blueprintPrompt(
  p: Project,
  bible: BookBible | null,
): { system: string; prompt: string } {
  const chapterCount = p.chapter_count ?? 10;
  const wordsPer = p.word_count_target
    ? Math.round(p.word_count_target / chapterCount)
    : undefined;

  return {
    system:
      "You are a book architect who designs KDP-ready table of contents. " +
      "Every section must earn its place; no filler chapters.",
    prompt: `Design the complete table of contents / section blueprint for this book.

${projectContext(p)}
${bibleContext(bible)}

${JSON_ONLY}

Return JSON:
{
  "title": "final book title (may refine the working title)",
  "subtitle": "final subtitle or null",
  "description": "compelling 100-150 word book description for the KDP listing",
  "sections": [
    {
      "title": "Section title",
      "type": "chapter | exercise | coloring_page | worksheet | front_matter | back_matter",
      "summary": "2-3 sentences: what this section covers and what the reader gets",
      "word_count_target": ${wordsPer ?? "approx words for this section, or null for non-text sections"}
    }
  ]
}

Rules:
- Include front matter (title page, copyright, dedication/TOC as appropriate) and back matter (about author, etc.) as front_matter/back_matter sections.
- Produce approximately ${chapterCount} main content sections${p.category === "colouring" ? " — for colouring books these are coloring_page entries with a short description of the image to create" : ""}.
- Order sections logically for the reading experience.
- Keep every summary concrete and specific to this book's premise.`,
  };
}

export function sectionPrompt(
  p: Project,
  bible: BookBible | null,
  section: Section,
  previousSummaries: { title: string; summary: string | null }[],
  mode: "write" | "rewrite",
  userInstructions?: string,
): { system: string; prompt: string } {
  const prev = previousSummaries.length
    ? previousSummaries
        .map((s) => `- ${s.title}: ${s.summary ?? "(no summary)"}`)
    : [];

  return {
    system:
      "You are an expert book writer producing publication-ready prose for Amazon KDP. " +
      "Write in the voice and style defined by the book bible. Be concrete, vivid, and " +
      "consistent with established facts. Do not break the fourth wall or mention being an AI.",
    prompt: `Write the ${mode === "rewrite" ? "rewritten" : ""} content for this section of a ${p.category} book.

${projectContext(p)}
${bibleContext(bible)}

Section to write:
- Title: ${section.title}
- Type: ${section.type}
- Target length: ${section.word_count_target ? `~${section.word_count_target.toLocaleString()} words` : "appropriate length for the section"}
- Section brief: ${section.summary ?? "(none — infer from context)"}
${userInstructions ? `\nAuthor instructions for this draft: ${userInstructions}\n` : ""}
${prev.length ? `\nPreviously written sections (for continuity — do NOT repeat their content):\n${prev.join("\n")}\n` : ""}
Requirements:
- Output ONLY the section content in Markdown (headings allowed for subsections).
- Do not include the section title as a top-level heading unless it fits naturally.
- Maintain continuity with the premise, characters, and style guide.
- End the section cleanly so the next section can begin.`,
  };
}

/** Extract a JSON object from a model response, tolerating markdown fences. */
export function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}
