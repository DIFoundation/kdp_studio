import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, KeyRound, AlertTriangle, ArrowRight } from "lucide-react";
import type { Project } from "@/lib/types";

export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status")
    .order("updated_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KDP SEO Research</h1>
        <p className="text-sm text-muted-foreground">
          Keyword research and listing optimization run inside each project&apos;s
          Listing tab — pick a project to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Search, title: "Niche research", desc: "Audience demand and competition mapping for your book's category." },
          { icon: KeyRound, title: "Keyword research", desc: "Amazon search terms ranked by relevance and buyer intent — no invented volume data." },
          { icon: TrendingUp, title: "Listing optimizer", desc: "Titles, subtitles, descriptions, and categories tuned for KDP search." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="mb-1 h-5 w-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your projects</CardTitle>
          <CardDescription>
            Open a project&apos;s Listing tab to run keyword research and generate copy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet —{" "}
              <Link href="/create" className="text-primary underline">
                create a book
              </Link>{" "}
              first.
            </p>
          ) : (
            <ul className="divide-y">
              {(projects as Pick<Project, "id" | "title" | "status">[]).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}/listing`}
                    className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 py-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Honest data policy</p>
            <p className="mt-1">
              Market intelligence distinguishes verified data from AI estimates.
              No sales figures, rankings, or search volumes are fabricated —
              relevance scores are labeled as estimates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
