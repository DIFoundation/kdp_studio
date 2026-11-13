import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QaRunner } from "@/components/qa-runner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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

  const [{ data: reports }, { data: disclosures }] = await Promise.all([
    supabase
      .from("qa_reports")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("ai_disclosures").select("*").eq("project_id", id),
  ]);

  const severityStyle: Record<string, string> = {
    error: "bg-red-100 text-red-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/projects/${id}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {p.title}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Quality Assurance & KDP Compliance</h1>
          <p className="text-sm text-muted-foreground">
            Automated checks for structure, length, grammar hygiene, and KDP requirements.
          </p>
        </div>
        <QaRunner projectId={id} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QA reports ({reports?.length ?? 0})</CardTitle>
            <CardDescription>
              Latest run results — errors block export readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!reports || reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checks run yet. Click "Run quality checks" to analyze the manuscript.
              </p>
            ) : (
              <ul className="max-h-[480px] space-y-2 overflow-y-auto text-sm">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                    <div>
                      <p>{r.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.check_type} · {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className={severityStyle[r.severity] ?? ""}>
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
          <CardContent className="space-y-3">
            {!disclosures || disclosures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI content recorded yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {disclosures.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="capitalize">{d.content_type.replace("_", " ")}</span>
                    <Badge variant={d.ai_generated ? "secondary" : "outline"}>
                      {d.ai_generated ? "AI-generated" : "Human"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-start gap-2 rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              You retain final editorial control. Nothing is published to Amazon
              without your explicit authorization. KDP requires disclosing AI-generated
              text and images at upload time.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
