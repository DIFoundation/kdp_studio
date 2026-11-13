import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, TableOfContents,
} from "docx";
import type { Manuscript } from "./manuscript";
import { markdownToBlocks } from "./manuscript";

/** Build a print-friendly DOCX manuscript. Returns a Buffer. */
export async function buildDocx(m: Manuscript): Promise<Buffer> {
  const { project } = m;

  const children: (Paragraph | TableOfContents)[] = [];

  // Title page
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 200 },
      children: [
        new TextRun({ text: project.title, bold: true, size: 56, font: "Georgia" }),
      ],
    }),
  );
  if (project.subtitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: project.subtitle, italics: true, size: 28, font: "Georgia" })],
      }),
    );
  }
  if (project.author_name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 2400 },
        children: [new TextRun({ text: `by ${project.author_name}`, size: 28, font: "Georgia" })],
      }),
    );
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Table of contents
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Contents")],
    }),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-1" }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // Sections
  for (const section of m.sections) {
    if (section.type === "front_matter" && section.orderIndex === 0) {
      // Title/copyright pages already handled — skip pure front matter duplicates
    }
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        children: [new TextRun(section.title)],
      }),
    );

    for (const block of markdownToBlocks(section.content)) {
      if (block.type === "h1") {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(block.text)],
          }),
        );
      } else if (block.type === "h2") {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun(block.text)],
          }),
        );
      } else if (block.type === "h3") {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_4,
            children: [new TextRun(block.text)],
          }),
        );
      } else if (block.type === "list") {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun(block.text)],
          }),
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 160 },
            indent: { firstLine: 360 },
            children: [new TextRun({ text: block.text, font: "Georgia", size: 24 })],
          }),
        );
      }
    }
  }

  const doc = new Document({
    creator: project.author_name ?? "AI KDP Publishing Studio",
    title: project.title,
    description: project.topic ?? undefined,
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
