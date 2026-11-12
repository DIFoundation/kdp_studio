"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateImageWithFallback } from "@/lib/ai";
import { logUsage } from "@/lib/ai/usage";
import { uploadGeneratedImage } from "@/lib/storage";
import { TRIM_SIZES, kindleCoverPixels, paperbackCoverPixels, type TrimSize } from "@/lib/kdp/sizes";
import type { BookBible, Project } from "@/lib/types";

async function getProject(projectId: string) {
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

  return { supabase, user, project: project as Project, bible: bible as BookBible | null };
}

function styleSuffix(p: Project): string {
  const map: Record<string, string> = {
    fiction: "cinematic book illustration, painterly, rich color",
    childrens: "whimsical children's book illustration, bright friendly colors, simple shapes",
    colouring: "black and white line art coloring page, clean bold outlines, white background",
    educational: "clear educational diagram style illustration, friendly and informative",
    nonfiction: "clean modern non-fiction illustration, minimal, professional",
    journal: "calm minimalist journal illustration, soft textures, plenty of negative space",
  };
  return map[p.category] ?? map.fiction;
}

function characterContext(bible: BookBible | null): string {
  if (!bible?.characters?.length) return "";
  const chars = bible.characters
    .slice(0, 4)
    .map((c) => {
      const o = c as Record<string, unknown>;
      return `${o.name ?? "character"}: ${o.description ?? o.role ?? ""}`;
    })
    .join("; ");
  return ` Character consistency: ${chars}.`;
}

/* ── Illustrations ──────────────────────────────────────── */

export async function generateIllustration(
  projectId: string,
  input: {
    kind?: string;
    prompt: string;
    sectionId?: string;
    style?: string;
    negativePrompt?: string;
    size?: string;
  },
) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible } = ctx;

  const prompt = [
    input.prompt,
    `Style: ${input.style ?? styleSuffix(project)}.`,
    `Book: "${project.title}" (${project.category}).`,
    characterContext(bible),
    "No text, no words, no letters, no watermark.",
  ].join(" ");

  let response;
  try {
    const result = await generateImageWithFallback({
      prompt,
      negativePrompt: input.negativePrompt ?? "text, words, letters, watermark, signature, blurry, deformed",
      size: input.size,
      n: 1,
      style: input.style,
      timeoutMs: 120_000,
    });
    response = result.response;
    await logUsage(user.id, projectId, {
      kind: "image",
      provider: result.usage.provider,
      model: result.usage.model,
      imageCount: result.usage.imageCount,
      mode: result.usage.mode,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Image generation failed" };
  }

  const image = response.images[0];
  if (!image) return { error: "Provider returned no image" };

  let storagePath: string;
  try {
    storagePath = await uploadGeneratedImage(
      "illustrations",
      user.id,
      projectId,
      input.kind ?? "scene",
      image.data,
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }

  const { data: illustration, error } = await supabase
    .from("illustrations")
    .insert({
      project_id: projectId,
      section_id: input.sectionId || null,
      kind: input.kind ?? "scene",
      prompt: input.prompt,
      negative_prompt: input.negativePrompt ?? null,
      style: input.style ?? null,
      provider: response.provider,
      model: response.model,
      storage_path: storagePath,
      status: "generated",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("illustration_versions").insert({
    illustration_id: illustration.id,
    version: 1,
    storage_path: storagePath,
    prompt: input.prompt,
  });

  await supabase.from("ai_disclosures").insert({
    project_id: projectId,
    content_type: "illustration",
    ai_generated: true,
    details: { provider: response.provider, model: response.model },
  });

  if (project.status === "writing" || project.status === "editing") {
    await supabase.from("projects").update({ status: "illustrating" }).eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}/illustrations`);
  return { success: true, id: illustration.id };
}

export async function setIllustrationStatus(
  projectId: string,
  illustrationId: string,
  status: "approved" | "rejected" | "pending",
) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;
  await supabase.from("illustrations").update({ status }).eq("id", illustrationId);
  revalidatePath(`/projects/${projectId}/illustrations`);
  return { success: true };
}

/* ── Covers ─────────────────────────────────────────────── */

function coverPromptBase(p: Project, bible: BookBible | null, theme?: string): string {
  return [
    `Book cover background art for "${p.title}"`,
    p.subtitle ? `subtitle concept: ${p.subtitle}` : null,
    `genre: ${p.category}${p.subcategory ? ` / ${p.subcategory}` : ""}`,
    p.tone ? `mood: ${p.tone}` : null,
    theme ? `art direction: ${theme}` : null,
    bible?.premise ? `story essence: ${String(bible.premise).slice(0, 300)}` : null,
    "Leave clear space for title text. No text, no words, no letters, no mockup, no book mockup, no watermark.",
  ]
    .filter(Boolean)
    .join(". ");
}

export async function generateCoverConcepts(
  projectId: string,
  type: "kindle" | "paperback" | "hardcover",
  theme?: string,
  count = 2,
) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase, user, project, bible } = ctx;

  // Compute KDP-accurate target dimensions.
  const trim = TRIM_SIZES.find((t) => t.id === project.trim_size) ?? TRIM_SIZES[2];
  const pageCount = project.page_count_target ?? 100;
  const dims =
    type === "kindle"
      ? kindleCoverPixels()
      : paperbackCoverPixels(trim as TrimSize, pageCount);
  const aspect = `${dims.width}x${dims.height}`;

  const prompt = `${coverPromptBase(project, bible, theme)} Aspect ratio target ${aspect} pixels at 300 DPI.`;

  let response;
  try {
    const result = await generateImageWithFallback({
      prompt,
      negativePrompt: "text, words, letters, title, author name, watermark, mockup, frame, border, blurry",
      size: type === "kindle" ? "1536x1024" : "1024x1536",
      n: Math.min(count, 4),
      timeoutMs: 180_000,
    });
    response = result.response;
    await logUsage(user.id, projectId, {
      kind: "image",
      provider: result.usage.provider,
      model: result.usage.model,
      imageCount: result.usage.imageCount,
      mode: result.usage.mode,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Cover generation failed" };
  }

  // Upload each concept image.
  const concepts: { prompt: string; storage_path: string; status: string; provider: string; model: string }[] = [];
  for (const image of response.images) {
    try {
      const path = await uploadGeneratedImage("covers", user.id, projectId, type, image.data);
      concepts.push({
        prompt,
        storage_path: path,
        status: "generated",
        provider: response.provider,
        model: response.model,
      });
    } catch (err) {
      console.error("[covers] upload failed:", err);
    }
  }
  if (!concepts.length) return { error: "All cover uploads failed" };

  const { data: existing } = await supabase
    .from("covers")
    .select("id, concepts")
    .eq("project_id", projectId)
    .eq("type", type)
    .maybeSingle();

  const merged = [...((existing?.concepts as typeof concepts) ?? []), ...concepts];

  const coverFields = {
    title: project.title,
    subtitle: project.subtitle,
    author_name: project.author_name,
    theme: theme ?? null,
    width_px: dims.width,
    height_px: dims.height,
    spine_width_px: "spinePx" in dims ? dims.spinePx : null,
    concepts: merged,
    status: "generated" as const,
  };

  if (existing) {
    await supabase.from("covers").update(coverFields).eq("id", existing.id);
  } else {
    await supabase.from("covers").insert({ project_id: projectId, type, ...coverFields });
  }

  await supabase.from("ai_disclosures").insert({
    project_id: projectId,
    content_type: "cover",
    ai_generated: true,
    details: { type, provider: response.provider, model: response.model },
  });

  if (project.status === "illustrating" || project.status === "editing" || project.status === "writing") {
    await supabase.from("projects").update({ status: "cover" }).eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}/cover`);
  return { success: true, count: concepts.length };
}

export async function approveCoverConcept(
  projectId: string,
  type: "kindle" | "paperback" | "hardcover",
  conceptIndex: number,
) {
  const ctx = await getProject(projectId);
  if ("error" in ctx) return ctx;
  const { supabase } = ctx;

  const { data: cover } = await supabase
    .from("covers")
    .select("*")
    .eq("project_id", projectId)
    .eq("type", type)
    .maybeSingle();
  if (!cover) return { error: "Cover not found" };

  const concepts = (cover.concepts as { status: string }[]) ?? [];
  if (conceptIndex < 0 || conceptIndex >= concepts.length) return { error: "Invalid concept" };

  const updated = concepts.map((c, i) => ({ ...c, status: i === conceptIndex ? "approved" : c.status }));
  await supabase
    .from("covers")
    .update({ concepts: updated, approved_concept: conceptIndex, status: "approved" })
    .eq("id", cover.id);

  revalidatePath(`/projects/${projectId}/cover`);
  return { success: true };
}
