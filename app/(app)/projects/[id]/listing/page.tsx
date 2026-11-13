import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingEditor, type ListingData, type ResearchData } from "@/components/listing-editor";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/lib/types";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  const researchNotes = listing?.research_notes as Record<string, unknown> | null;
  const research = (researchNotes?.keywords as ResearchData | undefined) ?? null;

  const initial: ListingData = {
    title: listing?.title ?? p.title,
    subtitle: listing?.subtitle ?? p.subtitle ?? "",
    description: listing?.description ?? "",
    keywords: listing?.keywords ?? [],
    categories: listing?.categories ?? [],
    targetAudience: listing?.target_audience ?? p.target_audience ?? "",
    authorBio: listing?.author_bio ?? "",
    seriesName: listing?.series_name ?? "",
    seriesDescription: listing?.series_description ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {p.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">KDP Listing</h1>
        <p className="text-sm text-muted-foreground">
          Title, description, keywords, and categories — optimized for Amazon search.
          All copy is editable; AI estimates are labeled as such.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ListingEditor projectId={id} initial={initial} research={research} />
        </CardContent>
      </Card>
    </div>
  );
}
