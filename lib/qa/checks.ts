import { countWords } from "@/lib/export/manuscript";
import type { Project, Section, SectionVersion, BookBible } from "@/lib/types";

export interface QaIssue {
  check_type: string;
  severity: "info" | "warning" | "error";
  message: string;
  section_id?: string;
}

const REPEATED_WORD = /\b(\w{3,})\s+\1\b/gi;
const DOUBLE_SPACE = / {2,}/;
const PLACEHOLDER = /\[(TODO|TBD|INSERT|PLACEHOLDER|XXX|FIXME)[^\]]*\]/i;

/** Run all automated QA checks against a project's manuscript. */
export function runQaChecks(
  project: Project,
  bible: BookBible | null,
  sections: (Section & { latest?: SectionVersion })[],
): QaIssue[] {
  const issues: QaIssue[] = [];

  // 1. Coverage: sections exist?
  if (!sections.length) {
    issues.push({
      check_type: "structure",
      severity: "error",
      message: "No sections found — generate a blueprint first.",
    });
    return issues;
  }

  // 2. Empty / missing content
  for (const s of sections) {
    if (!s.latest?.content?.trim()) {
      issues.push({
        check_type: "content",
        severity: "error",
        message: `Section "${s.title}" has no content.`,
        section_id: s.id,
      });
    }
  }

  // 3. Unapproved sections
  const unapproved = sections.filter((s) => s.latest && !s.latest.approved);
  if (unapproved.length) {
    issues.push({
      check_type: "approval",
      severity: "warning",
      message: `${unapproved.length} section(s) have content but no approved version.`,
    });
  }

  // 4. Word count vs target
  const totalWords = sections.reduce(
    (n, s) => n + countWords(s.latest?.content ?? ""),
    0,
  );
  if (project.word_count_target) {
    const ratio = totalWords / project.word_count_target;
    if (totalWords === 0) {
      issues.push({
        check_type: "length",
        severity: "error",
        message: `Target ~${project.word_count_target.toLocaleString()} words; manuscript is empty.`,
      });
    } else if (ratio < 0.5) {
      issues.push({
        check_type: "length",
        severity: "warning",
        message: `Manuscript is ${Math.round(ratio * 100)}% of target length (${totalWords.toLocaleString()}/${project.word_count_target.toLocaleString()} words).`,
      });
    } else if (ratio > 1.5) {
      issues.push({
        check_type: "length",
        severity: "info",
        message: `Manuscript is ${Math.round(ratio * 100)}% of target length — review for trimming.`,
      });
    } else {
      issues.push({
        check_type: "length",
        severity: "info",
        message: `Length on target: ${totalWords.toLocaleString()}/${project.word_count_target.toLocaleString()} words.`,
      });
    }
  }

  // 5. Per-section text hygiene
  for (const s of sections) {
    const content = s.latest?.content;
    if (!content) continue;

    const repeated = content.match(REPEATED_WORD);
    if (repeated?.length) {
      issues.push({
        check_type: "grammar",
        severity: "warning",
        message: `Section "${s.title}": repeated word(s) detected: ${[...new Set(repeated.map((r) => r.toLowerCase()))].slice(0, 5).join(", ")}.`,
        section_id: s.id,
      });
    }

    if (DOUBLE_SPACE.test(content)) {
      issues.push({
        check_type: "formatting",
        severity: "info",
        message: `Section "${s.title}": contains double spaces.`,
        section_id: s.id,
      });
    }

    if (PLACEHOLDER.test(content)) {
      issues.push({
        check_type: "content",
        severity: "error",
        message: `Section "${s.title}": contains placeholder text.`,
        section_id: s.id,
      });
    }

    // Very short chapter
    const words = countWords(content);
    if (words > 0 && words < 50 && s.type === "chapter") {
      issues.push({
        check_type: "content",
        severity: "warning",
        message: `Section "${s.title}" is very short (${words} words) for a chapter.`,
        section_id: s.id,
      });
    }
  }

  // 6. Required front/back matter for KDP
  const types = new Set(sections.map((s) => s.type));
  if (!types.has("front_matter")) {
    issues.push({
      check_type: "kdp_compliance",
      severity: "warning",
      message: "No front matter section (title page, copyright, TOC) detected.",
    });
  }
  if (!types.has("back_matter")) {
    issues.push({
      check_type: "kdp_compliance",
      severity: "info",
      message: "No back matter section (about author, etc.) detected.",
    });
  }

  // 7. AI disclosure presence
  if (!bible?.premise) {
    issues.push({
      check_type: "kdp_compliance",
      severity: "info",
      message: "Book bible has no premise — concept may not have been generated.",
    });
  }

  // 8. Metadata completeness
  if (!project.author_name) {
    issues.push({
      check_type: "metadata",
      severity: "warning",
      message: "Author name is missing — required for KDP listing.",
    });
  }
  if (!project.subtitle && !project.topic) {
    issues.push({
      check_type: "metadata",
      severity: "info",
      message: "No subtitle or topic description — consider adding for the KDP listing.",
    });
  }

  return issues;
}
