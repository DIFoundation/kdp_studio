import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, ArrowRight } from "lucide-react";
import type { Project } from "@/lib/types";


export default async function IllustrationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, title, category, needs_illustrations")
    .eq("needs_illustrations", true)
    .order("updated_at", { ascending: false });

  const projects = (data ?? []) as Pick<Project, "id" | "title" | "category">[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Illustration Studio</h1>
        <p className="text-sm text-muted-foreground">
          Character sheets, story scenes, colouring pages, and educational diagrams.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No illustrated projects yet. Create a children's, colouring, or
              educational book to unlock the studio.
            </p>
            <Button asChild className="mt-4">
              <Link href="/create">Create a Book</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
                <CardDescription>Illustration workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${p.id}/illustrations`}>
                    Open studio <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
