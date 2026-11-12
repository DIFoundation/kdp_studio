import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import type { Project } from "@/lib/types";


export default async function QaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const { data: reports } = await supabase
    .from("qa_reports")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: disclosures } = await supabase
    .from("ai_disclosures")
    .select("*")
    .eq("project_id", id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Quality Assurance & KDP Compliance</h2>
        <p className="text-sm text-muted-foreground">
          Automated checks before publication — Phase 4/6 module.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QA checks ({reports?.length ?? 0})</CardTitle>
            <CardDescription>
              Spelling, grammar, duplication, formatting, dimensions, claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!reports || reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checks run yet. The QA engine runs automatically before export.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <span>{r.message}</span>
                    <Badge variant={r.severity === "error" ? "destructive" : r.severity === "warning" ? "warning" : "secondary"}>
                      {r.severity}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI disclosure record</CardTitle>
            <CardDescription>
              Required by Amazon KDP for AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!disclosures || disclosures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI content recorded yet. Disclosures are created automatically
                as text, illustrations, and covers are generated.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {disclosures.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span className="capitalize">{d.content_type}</span>
                    <Badge variant={d.ai_generated ? "secondary" : "outline"}>
                      {d.ai_generated ? "AI-generated" : "Human"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              You retain final editorial control. Nothing is published to Amazon
              without your explicit authorization.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
