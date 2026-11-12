"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BookCategory, ProjectStatus } from "@/lib/types";

export interface WizardInput {
  title: string;
  subtitle?: string;
  working_title?: string;
  category: BookCategory;
  subcategory?: string;
  target_audience?: string;
  age_range?: string;
  topic?: string;
  tone?: string;
  language?: string;
  word_count_target?: number;
  page_count_target?: number;
  chapter_count?: number;
  formats: string[];
  trim_size?: string;
  orientation?: string;
  needs_illustrations?: boolean;
  needs_cover?: boolean;
  author_name?: string;
}

export async function createProject(input: WizardInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: input.title,
      subtitle: input.subtitle || null,
      working_title: input.working_title || null,
      category: input.category,
      subcategory: input.subcategory || null,
      target_audience: input.target_audience || null,
      age_range: input.age_range || null,
      topic: input.topic || null,
      tone: input.tone || null,
      language: input.language || "en",
      word_count_target: input.word_count_target ?? null,
      page_count_target: input.page_count_target ?? null,
      chapter_count: input.chapter_count ?? null,
      formats: input.formats,
      trim_size: input.trim_size || null,
      orientation: input.orientation || "portrait",
      needs_illustrations: input.needs_illustrations ?? false,
      needs_cover: input.needs_cover ?? true,
      author_name: input.author_name || null,
      status: "draft",
      wizard_data: input as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error || !project) {
    return { error: error?.message ?? "Failed to create project" };
  }

  // Seed an empty book bible row so the workspace has it ready.
  await supabase.from("book_bibles").insert({ project_id: project.id });

  revalidatePath("/dashboard");
  revalidatePath("/library");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient();
  await supabase.from("projects").update({ status }).eq("id", projectId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/dashboard");
  revalidatePath("/library");
  redirect("/library");
}

export async function duplicateProject(projectId: string) {
  const supabase = await createClient();
  const { data: original } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (!original) return { error: "Project not found" };

  const { title, subtitle, ...rest } = original;
  const { data: copy, error } = await supabase
    .from("projects")
    .insert({
      ...rest,
      title: `${title} (copy)`,
      subtitle,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !copy) return { error: error?.message ?? "Duplicate failed" };
  await supabase.from("book_bibles").insert({ project_id: copy.id });
  revalidatePath("/library");
  redirect(`/projects/${copy.id}`);
}
