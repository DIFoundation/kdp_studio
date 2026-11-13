import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportPanel, type ExportRecord } from "@/components/export-panel";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/lib/types";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const { data: exports } = await supabase
    .from("exports")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const records: ExportRecord[] = (exports ?? []).map((e) => ({
    id: e.id,
    format: e.format,
    fileSizeBytes: e.file_size_bytes,
    status: e.status,
    createdAt: e.created_at,
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
        <h1 className="text-2xl font-bold tracking-tight">Export & Publishing Package</h1>
        <p className="text-sm text-muted-foreground">
          Generate DOCX, PDF, and EPUB files from your approved manuscript.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ExportPanel projectId={id} exports={records} />
        </CardContent>
      </Card>
    </div>
  );
}
