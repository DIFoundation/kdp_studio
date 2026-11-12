import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ManuscriptEditor } from "@/components/manuscript-editor";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { Project, Section, SectionVersion } from "@/lib/types";

export default async function ManuscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const { data: bible } = await supabase
    .from("book_bibles")
    .select("id")
    .eq("project_id", id)
    .single();

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("project_id", id)
    .order("order_index");

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: versions } = sectionIds.length
    ? await supabase
        .from("section_versions")
        .select("*")
        .in("section_id", sectionIds)
        .order("version", { ascending: false })
    : { data: [] };

  // Latest version per section + total version count.
  const latestBySection = new Map<string, SectionVersion>();
  const countBySection = new Map<string, number>();
  for (const v of (versions ?? []) as SectionVersion[]) {
    countBySection.set(v.section_id, (countBySection.get(v.section_id) ?? 0) + 1);
    if (!latestBySection.has(v.section_id)) latestBySection.set(v.section_id, v);
  }

  const sectionsWithVersions = ((sections ?? []) as Section[]).map((s) => ({
    ...s,
    latest: latestBySection.get(s.id),
    versionCount: countBySection.get(s.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {p.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Manuscript</h1>
        <p className="text-sm text-muted-foreground">
          Generate a concept → blueprint → section drafts. Every draft is a
          versioned snapshot; approve only what you&apos;re happy with.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ManuscriptEditor
            projectId={id}
            sections={sectionsWithVersions}
            hasBible={Boolean(bible)}
            projectStatus={p.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
