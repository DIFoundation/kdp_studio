"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildDocx } from "@/lib/export/docx";
import { buildPdf } from "@/lib/export/pdf";
import { buildEpub } from "@/lib/export/epub";
import { countWords, type Manuscript, type ManuscriptSection } from "@/lib/export/manuscript";
import type { Project, Section, SectionVersion, BookBible } from "@/lib/types";

export type ExportFormat = "docx" | "pdf" | "epub";

const MIME: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  epub: "application/epub+zip",
};

const EXT: Record<ExportFormat, string> = { docx: "docx", pdf: "pdf", epub: "epub" };

async function loadManuscript(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return { error: "Project not found" as const };

  const [{ data: bible }, { data: sections }] = await Promise.all([
    supabase.from("book_bibles").select("*").eq("project_id", projectId).single(),
    supabase.from("sections").select("*").eq("project_id", projectId).order("order_index"),
  ]);

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: versions } = sectionIds.length
    ? await supabase
        .from("section_versions")
        .select("*")
        .in("section_id", sectionIds)
        .order("version", { ascending: false })
    : { data: [] };

  // Prefer approved version; fall back to latest.
  const pickVersion = (sid: string): SectionVersion | undefined => {
    const vs = ((versions ?? []) as SectionVersion[]).filter((v) => v.section_id === sid);
    return vs.find((v) => v.approved) ?? vs[0];
  };

  const manuscriptSections: ManuscriptSection[] = ((sections ?? []) as Section[])
    .map((s, i) => {
      const v = pickVersion(s.id);
      return {
        id: s.id,
        orderIndex: s.order_index ?? i,
        title: s.title,
        type: s.type,
        status: s.status,
        summary: s.summary,
        content: v?.content ?? "",
        version: v?.version ?? 0,
        approved: Boolean(v?.approved),
      };
    })
    .filter((s) => s.content.trim().length > 0);

  const manuscript: Manuscript = {
    project: project as Project,
    bible: (bible as BookBible | null) ?? null,
    sections: manuscriptSections,
    totalWords: manuscriptSections.reduce((n, s) => n + countWords(s.content), 0),
  };

  return { supabase, user, manuscript };
}

export async function exportManuscript(projectId: string, format: ExportFormat) {
  const ctx = await loadManuscript(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, manuscript } = ctx;

  if (!manuscript.sections.length) {
    return { error: "No section content to export. Generate and approve sections first." };
  }

  const unapproved = manuscript.sections.filter((s) => !s.approved).length;
  if (unapproved > 0) {
    return {
      error: `${unapproved} section(s) have no approved version. Approve content in the Manuscript tab first — exports only include approved or latest-draft content.`,
    };
  }

  let buffer: Buffer;
  try {
    if (format === "docx") buffer = await buildDocx(manuscript);
    else if (format === "pdf") buffer = await buildPdf(manuscript);
    else buffer = await buildEpub(manuscript);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Export build failed" };
  }

  const slug = manuscript.project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const path = `${user.id}/${projectId}/manuscript/${slug}-${Date.now()}.${EXT[format]}`;

  const service = createServiceClient();
  const { error: upErr } = await service.storage
    .from("exports")
    .upload(path, buffer, { contentType: MIME[format], upsert: false });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const { data: exp, error: dbErr } = await supabase
    .from("exports")
    .insert({
      project_id: projectId,
      format,
      storage_path: path,
      file_size_bytes: buffer.length,
      status: "ready",
      validation_report: {
        sections: manuscript.sections.length,
        words: manuscript.totalWords,
        unapproved_excluded: 0,
      },
    })
    .select("id")
    .single();
  if (dbErr) return { error: dbErr.message };

  if (["writing", "editing", "illustrating", "cover"].includes(manuscript.project.status)) {
    await supabase.from("projects").update({ status: "exporting" }).eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}/export`);
  return { success: true, id: exp.id, size: buffer.length };
}

export async function getExportDownloadUrl(projectId: string, exportId: string) {
  const supabase = await createClient();
  const { data: exp } = await supabase
    .from("exports")
    .select("storage_path")
    .eq("id", exportId)
    .eq("project_id", projectId)
    .single();
  if (!exp?.storage_path) return { error: "Export not found" };

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("exports")
    .createSignedUrl(exp.storage_path, 3600);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
