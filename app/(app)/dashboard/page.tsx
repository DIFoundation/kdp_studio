import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookPlus, BookOpen, PenLine, ImageIcon, FileDown, Clock } from "lucide-react";
import { STATUS_LABELS, CATEGORY_LABELS, type Project, type ProjectStatus } from "@/lib/types";


async function getStats() {
  const supabase = await createClient();

  const [projectsRes, sectionsRes, illustrationsRes, coversRes, exportsRes, recentRes] =
    await Promise.all([
      supabase.from("projects").select("id, status"),
      supabase.from("sections").select("id", { count: "exact", head: true }),
      supabase.from("illustrations").select("id", { count: "exact", head: true }),
      supabase.from("covers").select("id", { count: "exact", head: true }),
      supabase.from("exports").select("id", { count: "exact", head: true }),
      supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const projects = (projectsRes.data ?? []) as Pick<Project, "id" | "status">[];
  const byStatus = (s: ProjectStatus) => projects.filter((p) => p.status === s).length;

  return {
    totalBooks: projects.length,
    drafts: byStatus("draft") + byStatus("concept") + byStatus("blueprint"),
    manuscripts: byStatus("writing") + byStatus("editing"),
    inReview: byStatus("review"),
    completed: byStatus("completed"),
    sections: sectionsRes.count ?? 0,
    illustrations: illustrationsRes.count ?? 0,
    covers: coversRes.count ?? 0,
    exports: exportsRes.count ?? 0,
    recent: (recentRes.data ?? []) as Project[],
  };
}

const STAT_CARDS = [
  { key: "totalBooks", label: "Total Books", icon: BookOpen },
  { key: "drafts", label: "Draft Projects", icon: PenLine },
  { key: "manuscripts", label: "Manuscripts in Progress", icon: BookOpen },
  { key: "inReview", label: "Awaiting Review", icon: Clock },
  { key: "completed", label: "Completed", icon: FileDown },
  { key: "illustrations", label: "Illustrations", icon: ImageIcon },
  { key: "covers", label: "Covers Designed", icon: ImageIcon },
  { key: "exports", label: "Exported Packages", icon: FileDown },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your publishing studio at a glance
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <BookPlus className="h-4 w-4" /> New Book
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats[key]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently edited</CardTitle>
          <CardDescription>Your latest book projects</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No projects yet. Create your first book to get started.
              </p>
              <Button asChild className="mt-4">
                <Link href="/create">Create a Book</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {stats.recent.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md"
                >
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[p.category]}
                      {p.subcategory ? ` · ${p.subcategory}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary">{STATUS_LABELS[p.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
