import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookPlus } from "lucide-react";
import { STATUS_LABELS, CATEGORY_LABELS, type Project } from "@/lib/types";


export default async function LibraryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  const projects = (data ?? []) as Project[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <BookPlus className="h-4 w-4" /> New Book
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Your library is empty.</p>
            <Button asChild className="mt-4">
              <Link href="/create">Create your first book</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{p.title}</h3>
                    <Badge variant="secondary" className="shrink-0">
                      {STATUS_LABELS[p.status]}
                    </Badge>
                  </div>
                  {p.subtitle && (
                    <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{p.subtitle}</p>
                  )}
                  <div className="mt-auto space-y-1 text-xs text-muted-foreground">
                    <div>{CATEGORY_LABELS[p.category]}{p.subcategory ? ` · ${p.subcategory}` : ""}</div>
                    <div>
                      {p.formats.join(" · ")}
                      {p.trim_size ? ` · ${p.trim_size}"` : ""}
                    </div>
                    <div>Updated {new Date(p.updated_at).toLocaleDateString()}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
