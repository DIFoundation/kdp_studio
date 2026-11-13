import JSZip from "jszip";
import type { Manuscript } from "./manuscript";
import { markdownToBlocks, stripMarkdown } from "./manuscript";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(md: string): string {
  return esc(stripMarkdown(md));
}

function sectionXhtml(section: { title: string; content: string }, index: number): string {
  const body = markdownToBlocks(section.content)
    .map((b) => {
      if (b.type === "h1") return `<h2>${inline(b.text)}</h2>`;
      if (b.type === "h2") return `<h3>${inline(b.text)}</h3>`;
      if (b.type === "h3") return `<h4>${inline(b.text)}</h4>`;
      if (b.type === "list") return `<p class="list">• ${inline(b.text)}</p>`;
      return `<p>${inline(b.text)}</p>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head><title>${esc(section.title)}</title>
<link rel="stylesheet" type="text/css" href="../styles/main.css"/></head>
<body>
<h1>${esc(section.title)}</h1>
${body}
</body>
</html>`;
}

/** Build a valid EPUB 3 file. Returns a Buffer. */
export async function buildEpub(m: Manuscript): Promise<Buffer> {
  const { project } = m;
  const zip = new JSZip();

  const uid = `urn:uuid:${crypto.randomUUID()}`;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // mimetype must be first and uncompressed
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );

  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navPoints: string[] = [];

  m.sections.forEach((s, i) => {
    const fileName = `section${i + 1}.xhtml`;
    zip.file(`OEBPS/${fileName}`, sectionXhtml(s, i));
    manifestItems.push(
      `<item id="s${i + 1}" href="${fileName}" media-type="application/xhtml+xml"/>`,
    );
    spineItems.push(`<itemref idref="s${i + 1}"/>`);
    navPoints.push(
      `<navPoint id="nav${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(s.title)}</text></navLabel><content src="${fileName}"/></navPoint>`,
    );
  });

  // Nav document
  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head><title>Contents</title><link rel="stylesheet" type="text/css" href="styles/main.css"/></head>
<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>
${m.sections.map((s, i) => `<li><a href="section${i + 1}.xhtml">${esc(s.title)}</a></li>`).join("\n")}
</ol></nav></body></html>`,
  );
  manifestItems.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`);
  spineItems.unshift(`<itemref idref="nav"/>`);

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="pub-id">${uid}</dc:identifier>
  <dc:title>${esc(project.title)}</dc:title>
  ${project.subtitle ? `<dc:subtitle>${esc(project.subtitle)}</dc:subtitle>` : ""}
  ${project.author_name ? `<dc:creator>${esc(project.author_name)}</dc:creator>` : ""}
  <dc:language>${esc(project.language)}</dc:language>
  <meta property="dcterms:modified">${now}</meta>
</metadata>
<manifest>
  <item id="css" href="styles/main.css" media-type="text/css"/>
  ${manifestItems.join("\n  ")}
</manifest>
<spine>${spineItems.join("")}</spine>
</package>`,
  );

  zip.file(
    "OEBPS/styles/main.css",
    `body { font-family: serif; line-height: 1.6; margin: 5%; }
h1 { text-align: center; margin-top: 30%; }
h2, h3, h4 { margin-top: 1.5em; }
p { text-indent: 1.5em; margin: 0.5em 0; }
p.list { text-indent: 0; }`,
  );

  // Legacy NCX for older readers
  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${uid}"/></head>
<docTitle><text>Contents</text></docTitle>
<navMap>${navPoints.join("\n")}</navMap>
</ncx>`,
  );

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
