"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateTextWithFallback } from "@/lib/ai";
import { logUsage } from "@/lib/ai/usage";
import {
  conceptPrompt,
  blueprintPrompt,
  sectionPrompt,
  parseJsonResponse,
  type BlueprintSection,
} from "@/lib/ai/prompts";
import type { BookBible, Project, Section, SectionVersion } from "@/lib/types";

async function getProjectWithBible(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found" as const };

  const { data: bible } = await supabase
    .from("book_bibles")
    .select("*")
    .eq("project_id", projectId)
    .single();

  return {
    supabase,
    user,
    project: project as Project,
    bible: (bible as BookBible | null) ?? null,
  };
}

async function recordTextUsage(
  userId: string,
  projectId: string,
  usage: { provider: string; model: string; promptTokens?: number; completionTokens?: number },
  mode: "economy" | "standard" | "premium" = "standard",
) {
  await logUsage(userId, projectId, {
    kind: "text",
    provider: usage.provider,
    model: usage.model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    mode,
  });
}

async function ensureTextDisclosure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
) {
  const { data: existing } = await supabase
    .from("ai_disclosures")
    .select("id")
    .eq("project_id", projectId)
    .eq("content_type", "text")
    .limit(1);
  if (!existing?.length) {
    await supabase.from("ai_disclosures").insert({
      project_id: projectId,
      content_type: "text",
      ai_generated: true,
      ai_assisted: true,
      details: { note: "Text generated via AI provider; human review required before publication." },
    });
  }
}

/* ── Concept generation ─────────────────────────────────── */

export async function generateConcept(projectId: string) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible } = ctx;

  const { system, prompt } = conceptPrompt(project);
  let parsed: Record<string, unknown>;
  let usage: { provider: string; model: string; promptTokens?: number; completionTokens?: number };

  try {
    const { response } = await generateTextWithFallback({
      system,
      prompt,
      responseFormat: "json",
      maxTokens: 4096,
      temperature: 0.8,
    });
    usage = { provider: response.provider, model: response.model, promptTokens: response.promptTokens, completionTokens: response.completionTokens };
    parsed = parseJsonResponse(response.text) as Record<string, unknown>;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Concept generation failed" };
  }

  await recordTextUsage(user.id, projectId, usage);
  await ensureTextDisclosure(supabase, projectId);

  const bibleUpdate = {
    premise: (parsed.premise as string) ?? bible?.premise ?? null,
    themes: Array.isArray(parsed.themes) ? parsed.themes : bible?.themes ?? [],
    characters: Array.isArray(parsed.characters) ? parsed.characters : bible?.characters ?? [],
    world_building:
      parsed.world_building && typeof parsed.world_building === "object"
        ? (parsed.world_building as Record<string, unknown>)
        : bible?.world_building ?? {},
    style_guide:
      parsed.style_guide && typeof parsed.style_guide === "object"
        ? (parsed.style_guide as Record<string, unknown>)
        : bible?.style_guide ?? {},
    timeline: Array.isArray(parsed.timeline) ? parsed.timeline : bible?.timeline ?? [],
    continuity_notes:
      (parsed.continuity_notes as string) ?? bible?.continuity_notes ?? null,
  };

  if (bible) {
    await supabase.from("book_bibles").update(bibleUpdate).eq("project_id", projectId);
  } else {
    await supabase.from("book_bibles").insert({ project_id: projectId, ...bibleUpdate });
  }

  const projectUpdate: Record<string, unknown> = { status: "concept" };
  if (parsed.suggested_title && !project.title) projectUpdate.title = parsed.suggested_title;
  if (parsed.suggested_subtitle) projectUpdate.subtitle = parsed.suggested_subtitle;
  await supabase.from("projects").update(projectUpdate).eq("id", projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true };
}

/* ── Blueprint generation ───────────────────────────────── */

export async function generateBlueprint(projectId: string) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible } = ctx;

  // Refuse to silently destroy approved work.
  const { data: existing } = await supabase
    .from("sections")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);
  if (existing?.length) {
    const { data: approved } = await supabase
      .from("section_versions")
      .select("id, sections!inner(project_id)")
      .eq("approved", true)
      .eq("sections.project_id", projectId)
      .limit(1);
    if (approved?.length) {
      return { error: "Blueprint already has approved content. Delete sections manually before regenerating." };
    }
    await supabase.from("sections").delete().eq("project_id", projectId);
  }

  const { system, prompt } = blueprintPrompt(project, bible);
  let parsed: { title?: string; subtitle?: string; description?: string; sections?: BlueprintSection[] };
  let usage: { provider: string; model: string; promptTokens?: number; completionTokens?: number };

  try {
    const { response } = await generateTextWithFallback({
      system,
      prompt,
      responseFormat: "json",
      maxTokens: 8192,
      temperature: 0.7,
    });
    usage = { provider: response.provider, model: response.model, promptTokens: response.promptTokens, completionTokens: response.completionTokens };
    parsed = parseJsonResponse(response.text) as typeof parsed;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Blueprint generation failed" };
  }

  await recordTextUsage(user.id, projectId, usage);
  await ensureTextDisclosure(supabase, projectId);

  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  if (!sections.length) return { error: "Blueprint returned no sections" };

  const rows = sections.map((s, i) => ({
    project_id: projectId,
    order_index: i,
    title: s.title || `Section ${i + 1}`,
    type: s.type ?? "chapter",
    status: "draft" as const,
    word_count_target: s.word_count_target ?? null,
    summary: s.summary ?? null,
  }));

  const { error } = await supabase.from("sections").insert(rows);
  if (error) return { error: error.message };

  // Store listing description if produced.
  if (parsed.description) {
    await supabase.from("listings").upsert(
      {
        project_id: projectId,
        description: parsed.description,
        title: parsed.title ?? project.title,
        subtitle: parsed.subtitle ?? project.subtitle,
      },
      { onConflict: "project_id" },
    );
  }

  await supabase.from("projects").update({ status: "blueprint" }).eq("id", projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true, count: rows.length };
}

/* ── Section generation / editing / approval ────────────── */

async function latestVersionNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sectionId: string,
): Promise<number> {
  const { data } = await supabase
    .from("section_versions")
    .select("version")
    .eq("section_id", sectionId)
    .order("version", { ascending: false })
    .limit(1);
  return (data?.[0]?.version as number | undefined) ?? 0;
}

export async function generateSection(
  projectId: string,
  sectionId: string,
  instructions?: string,
) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible } = ctx;

  const { data: section } = await supabase
    .from("sections")
    .select("*")
    .eq("id", sectionId)
    .eq("project_id", projectId)
    .single();
  if (!section) return { error: "Section not found" };
  const sec = section as Section;

  // Summaries of earlier sections for continuity.
  const { data: prevSections } = await supabase
    .from("sections")
    .select("title, summary")
    .eq("project_id", projectId)
    .lt("order_index", sec.order_index)
    .order("order_index", { ascending: false })
    .limit(8);

  const hasVersions = (await latestVersionNumber(supabase, sectionId)) > 0;
  const { system, prompt } = sectionPrompt(
    project,
    bible,
    sec,
    (prevSections ?? []).reverse(),
    hasVersions ? "rewrite" : "write",
    instructions,
  );

  let text: string;
  let usage: { provider: string; model: string; promptTokens?: number; completionTokens?: number };
  try {
    const { response } = await generateTextWithFallback({
      system,
      prompt,
      maxTokens: 8192,
      temperature: 0.8,
    });
    usage = { provider: response.provider, model: response.model, promptTokens: response.promptTokens, completionTokens: response.completionTokens };
    text = response.text.trim();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Section generation failed" };
  }

  await recordTextUsage(user.id, projectId, usage);
  await ensureTextDisclosure(supabase, projectId);

  const version = (await latestVersionNumber(supabase, sectionId)) + 1;
  const { error } = await supabase.from("section_versions").insert({
    section_id: sectionId,
    version,
    content: text,
    source: "ai",
    model: usage.model,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  await supabase
    .from("sections")
    .update({ status: "in_review" })
    .eq("id", sectionId);
  if (["draft", "blueprint", "concept"].includes(project.status)) {
    await supabase.from("projects").update({ status: "writing" }).eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true, version };
}

export async function saveSectionContent(
  projectId: string,
  sectionId: string,
  content: string,
) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user } = ctx;

  const version = (await latestVersionNumber(supabase, sectionId)) + 1;
  const { error } = await supabase.from("section_versions").insert({
    section_id: sectionId,
    version,
    content,
    source: "human",
    created_by: user.id,
  });
  if (error) return { error: error.message };

  await supabase.from("sections").update({ status: "in_review" }).eq("id", sectionId);
  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true, version };
}

export async function approveSection(projectId: string, sectionId: string) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const version = await latestVersionNumber(supabase, sectionId);
  if (!version) return { error: "No content to approve" };

  // Unapprove all versions, then approve the latest.
  await supabase
    .from("section_versions")
    .update({ approved: false })
    .eq("section_id", sectionId);
  await supabase
    .from("section_versions")
    .update({ approved: true })
    .eq("section_id", sectionId)
    .eq("version", version);
  await supabase.from("sections").update({ status: "approved" }).eq("id", sectionId);

  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true };
}

export async function rejectSection(projectId: string, sectionId: string) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;
  await supabase.from("sections").update({ status: "rejected" }).eq("id", sectionId);
  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true };
}

export async function deleteSection(projectId: string, sectionId: string) {
  const ctx = await getProjectWithBible(projectId);
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  // Block deletion of approved content.
  const { data: approved } = await supabase
    .from("section_versions")
    .select("id")
    .eq("section_id", sectionId)
    .eq("approved", true)
    .limit(1);
  if (approved?.length) return { error: "Cannot delete a section with approved content" };

  await supabase.from("sections").delete().eq("id", sectionId).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}/manuscript`);
  return { success: true };
}

export type { SectionVersion };
