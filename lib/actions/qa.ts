"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runQaChecks } from "@/lib/qa/checks";
import type { BookBible, Project, Section, SectionVersion } from "@/lib/types";

/** Run all QA checks and persist results to qa_reports. */
export async function runQa(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return { error: "Project not found" };

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

  const latestBySection = new Map<string, SectionVersion>();
  for (const v of (versions ?? []) as SectionVersion[]) {
    if (!latestBySection.has(v.section_id)) latestBySection.set(v.section_id, v);
  }

  const sectionsWithLatest = ((sections ?? []) as Section[]).map((s) => ({
    ...s,
    latest: latestBySection.get(s.id),
  }));

  const issues = runQaChecks(
    project as Project,
    (bible as BookBible | null) ?? null,
    sectionsWithLatest,
  );

  // Replace previous open reports with fresh results.
  await supabase.from("qa_reports").delete().eq("project_id", projectId).eq("status", "open");
  if (issues.length) {
    await supabase.from("qa_reports").insert(
      issues.map((i) => ({
        project_id: projectId,
        check_type: i.check_type,
        severity: i.severity,
        message: i.message,
        section_id: i.section_id ?? null,
      })),
    );
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  revalidatePath(`/projects/${projectId}/qa`);
  return { success: true, errors, warnings, info: issues.length - errors - warnings };
}

export async function setQaStatus(reportId: string, status: "resolved" | "ignored" | "open") {
  const supabase = await createClient();
  await supabase.from("qa_reports").update({ status }).eq("id", reportId);
  revalidatePath("/projects");
  return { success: true };
}
