"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateTextWithFallback } from "@/lib/ai";
import { logUsage } from "@/lib/ai/usage";
import { parseJsonResponse } from "@/lib/ai/prompts";
import { keywordPrompt, listingPrompt, listingCritiquePrompt } from "@/lib/ai/listing-prompts";
import type { BookBible, Project } from "@/lib/types";

async function getProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return { error: "Project not found" as const };

  const { data: bible } = await supabase
    .from("book_bibles")
    .select("*")
    .eq("project_id", projectId)
    .single();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  return {
    supabase,
    user,
    project: project as Project,
    bible: (bible as BookBible | null) ?? null,
    listing,
  };
}

async function callText(
  userId: string,
  projectId: string,
  system: string,
  prompt: string,
) {
  const result = await generateTextWithFallback({
    system,
    prompt,
    temperature: 0.7,
    timeoutMs: 90_000,
  });
  await logUsage(userId, projectId, {
    kind: "text",
    provider: result.usage.provider,
    model: result.usage.model,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    mode: "standard",
  });
  return result.response.text;
}

/** Generate keyword research and store it in listings.research_notes. */
export async function generateKeywords(projectId: string) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible, listing } = ctx;

  const { system, prompt } = keywordPrompt(project, bible);
  let raw: string;
  try {
    raw = await callText(user.id, projectId, system, prompt);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Keyword research failed" };
  }

  let research: Record<string, unknown>;
  try {
    research = parseJsonResponse(raw) as Record<string, unknown>;
  } catch {
    return { error: "Model returned invalid JSON for keyword research" };
  }

  const existing = (listing?.research_notes as Record<string, unknown>) ?? {};
  const { error } = await supabase.from("listings").upsert(
    {
      project_id: projectId,
      research_notes: { ...existing, keywords: research, generated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/listing`);
  return { success: true, research };
}

/** Generate full listing copy (title, description, keywords, categories). */
export async function generateListing(projectId: string) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible, listing } = ctx;

  // Pull keywords from prior research if available.
  const research = listing?.research_notes as Record<string, unknown> | null;
  const kwData = research?.keywords as { primary_keywords?: { term: string }[] } | undefined;
  const keywords = (kwData?.primary_keywords ?? []).map((k) => k.term);

  const { system, prompt } = listingPrompt(project, bible, keywords);
  let raw: string;
  try {
    raw = await callText(user.id, projectId, system, prompt);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Listing generation failed" };
  }

  let data: Record<string, unknown>;
  try {
    data = parseJsonResponse(raw) as Record<string, unknown>;
  } catch {
    return { error: "Model returned invalid JSON for listing" };
  }

  const { error } = await supabase.from("listings").upsert(
    {
      project_id: projectId,
      title: (data.title as string) ?? project.title,
      subtitle: (data.subtitle as string) ?? null,
      description: (data.description as string) ?? null,
      keywords: (data.keywords as string[]) ?? [],
      categories: (data.categories as string[]) ?? [],
      target_audience: (data.target_audience as string) ?? null,
      author_bio: (data.author_bio as string) ?? null,
      series_name: (data.series_name as string) ?? null,
      series_description: (data.series_description as string) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/listing`);
  return { success: true };
}

/** Critique the current listing and return suggestions (does not overwrite). */
export async function critiqueListing(projectId: string) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { user, project, listing } = ctx;
  if (!listing) return { error: "Generate a listing first" };

  const { system, prompt } = listingCritiquePrompt(project, listing);
  let raw: string;
  try {
    raw = await callText(user.id, projectId, system, prompt);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Critique failed" };
  }

  try {
    return { success: true, critique: parseJsonResponse(raw) };
  } catch {
    return { error: "Model returned invalid JSON for critique" };
  }
}

/** Save manual edits to the listing. */
export async function saveListing(
  projectId: string,
  fields: Partial<{
    title: string;
    subtitle: string;
    description: string;
    keywords: string[];
    categories: string[];
    target_audience: string;
    author_bio: string;
    series_name: string;
    series_description: string;
  }>,
) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const { error } = await supabase.from("listings").upsert(
    { project_id: projectId, ...fields, updated_at: new Date().toISOString() },
    { onConflict: "project_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/listing`);
  return { success: true };
}
