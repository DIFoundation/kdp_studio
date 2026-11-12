import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedAssetUrl } from "@/lib/storage";
import { IllustrationStudio, type IllustrationItem } from "@/components/illustration-studio";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ImageIcon } from "lucide-react";
import type { Project, Section } from "@/lib/types";

export default async function ProjectIllustrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const [{ data: illustrations }, { data: sections }] = await Promise.all([
    supabase
      .from("illustrations")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("sections").select("id, title").eq("project_id", id).order("order_index"),
  ]);

  const sectionTitle = new Map(((sections ?? []) as Pick<Section, "id" | "title">[]).map((s) => [s.id, s.title]));

  const items: IllustrationItem[] = await Promise.all(
    (illustrations ?? []).map(async (ill) => ({
      id: ill.id,
      kind: ill.kind,
      prompt: ill.prompt,
      status: ill.status,
      url: ill.storage_path ? await signedAssetUrl("illustrations", ill.storage_path) : null,
      sectionTitle: ill.section_id ? (sectionTitle.get(ill.section_id) ?? null) : null,
      createdAt: ill.created_at,
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {p.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Illustration Studio</h1>
        <p className="text-sm text-muted-foreground">
          Scenes, character sheets, colouring pages, and diagrams — generated with
          your configured image provider.
        </p>
      </div>

      {!p.needs_illustrations ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This project wasn&apos;t set up to need illustrations, but you can still
              generate assets here if you change your mind.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <IllustrationStudio
            projectId={id}
            illustrations={items}
            sections={(sections ?? []).map((s) => ({ id: s.id, title: s.title }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
