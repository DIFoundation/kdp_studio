import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import type { Project } from "@/lib/types";


const FORMATS = [
  { id: "docx", label: "DOCX manuscript" },
  { id: "pdf", label: "PDF (screen)" },
  { id: "epub", label: "EPUB (Kindle)" },
  { id: "print_pdf", label: "Print-ready PDF" },
  { id: "cover_png", label: "Cover PNG" },
  { id: "cover_jpg", label: "Cover JPG" },
] as const;

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Export & Publishing Package</h2>
        <p className="text-sm text-muted-foreground">
          DOCX, PDF, EPUB, and print-ready files — Phase 4 module.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available export formats</CardTitle>
          <CardDescription>
            Formats for {p.formats.join(", ")} · {p.trim_size ?? "custom"} trim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMATS.map((f) => {
              const done = exports?.some((e) => e.format === f.id && e.status === "ready");
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {f.label}
                  </span>
                  {done ? (
                    <Button size="sm" variant="outline" disabled>
                      <Download className="h-4 w-4" /> Ready
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      Phase 4
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
