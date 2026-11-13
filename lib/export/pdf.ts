import PDFDocument from "pdfkit";
import type { Manuscript } from "./manuscript";
import { markdownToBlocks } from "./manuscript";

/**
 * Build a print-ready PDF manuscript.
 * Uses PDFKit's built-in Helvetica — embed a custom font for final KDP
 * print files if brand typography matters.
 */
export function buildPdf(m: Manuscript): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: m.project.title,
        Author: m.project.author_name ?? "",
        Subject: m.project.topic ?? "",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { project } = m;

    // Title page
    doc.font("Times-Bold").fontSize(28);
    doc.text(project.title, { align: "center" });
    if (project.subtitle) {
      doc.moveDown(0.5).font("Times-Italic").fontSize(16);
      doc.text(project.subtitle, { align: "center" });
    }
    if (project.author_name) {
      doc.moveDown(1).font("Times-Roman").fontSize(14);
      doc.text(`by ${project.author_name}`, { align: "center" });
    }
    doc.addPage();

    // Contents
    doc.font("Times-Bold").fontSize(20).text("Contents", { align: "center" });
    doc.moveDown();
    for (const s of m.sections) {
      doc.font("Times-Roman").fontSize(12).text(s.title);
    }
    doc.addPage();

    // Sections
    for (const section of m.sections) {
      doc.addPage();
      doc.font("Times-Bold").fontSize(22).text(section.title);
      doc.moveDown(0.5);

      for (const block of markdownToBlocks(section.content)) {
        if (block.type === "h1") {
          doc.moveDown(0.4).font("Times-Bold").fontSize(18).text(block.text);
        } else if (block.type === "h2") {
          doc.moveDown(0.3).font("Times-Bold").fontSize(15).text(block.text);
        } else if (block.type === "h3") {
          doc.moveDown(0.2).font("Times-Bold").fontSize(13).text(block.text);
        } else if (block.type === "list") {
          doc.font("Times-Roman").fontSize(12);
          doc.text(`•  ${block.text}`, { indent: 20 });
        } else {
          doc.font("Times-Roman").fontSize(12);
          doc.text(block.text, { align: "justify", indent: 18 });
          doc.moveDown(0.4);
        }
      }
    }

    doc.end();
  });
}
