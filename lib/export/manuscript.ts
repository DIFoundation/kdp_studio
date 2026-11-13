import type { Project, Section, SectionVersion, BookBible } from "@/lib/types";

/** A manuscript section ready for export: metadata + approved/latest content. */
export interface ManuscriptSection {
  id: string;
  orderIndex: number;
  title: string;
  type: Section["type"];
  status: Section["status"];
  summary: string | null;
  content: string;
  version: number;
  approved: boolean;
}

export interface Manuscript {
  project: Project;
  bible: BookBible | null;
  sections: ManuscriptSection[];
  totalWords: number;
}

/** Minimal markdown → plain text / block parsing shared by all exporters. */
export function markdownToBlocks(md: string): { type: "h1" | "h2" | "h3" | "p" | "list"; text: string }[] {
  const lines = md.split(/\r?\n/);
  const blocks: { type: "h1" | "h2" | "h3" | "p" | "list"; text: string }[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ").trim() });
      para = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      blocks.push({ type: h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3", text: h[2] });
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      flush();
      blocks.push({ type: "list", text: line.replace(/^[-*•]\s+/, "") });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks.filter((b) => b.text);
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
