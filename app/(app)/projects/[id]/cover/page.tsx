import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedAssetUrl } from "@/lib/storage";
import { CoverDesigner, type CoverData } from "@/components/cover-designer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Palette } from "lucide-react";
import { TRIM_SIZES } from "@/lib/kdp/sizes";
import type { Project } from "@/lib/types";

export default async function CoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const { data: covers } = await supabase
    .from("covers")
    .select("*")
    .eq("project_id", id);

  const coverData: CoverData[] = await Promise.all(
    (covers ?? []).map(async (c) => {
      const concepts = (c.concepts as { prompt: string; storage_path: string; status: string }[]) ?? [];
      return {
        type: c.type,
        widthPx: c.width_px,
        heightPx: c.height_px,
        spinePx: c.spine_width_px,
        approvedConcept: c.approved_concept,
        concepts: await Promise.all(
          concepts.map(async (concept) => ({
            prompt: concept.prompt,
            url: await signedAssetUrl("covers", concept.storage_path),
            status: concept.status,
          })),
        ),
      };
    }),
  );

  const trimLabel = TRIM_SIZES.find((t) => t.id === p.trim_size)?.label ?? "custom";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {p.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Cover Designer</h1>
        <p className="text-sm text-muted-foreground">
          Kindle, paperback, and hardcover concepts at KDP-accurate dimensions.
        </p>
      </div>

      {!p.needs_cover ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Palette className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Cover generation was disabled for this project.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <CoverDesigner projectId={id} covers={coverData} trimLabel={trimLabel} />
        </CardContent>
      </Card>
    </div>
  );
}
