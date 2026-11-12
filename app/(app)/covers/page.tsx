import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight } from "lucide-react";
import type { Project } from "@/lib/types";


export default async function CoversPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, title, category, needs_cover")
    .eq("needs_cover", true)
    .order("updated_at", { ascending: false });

  const projects = (data ?? []) as Pick<Project, "id" | "title" | "category">[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Cover Designer</h1>
        <p className="text-sm text-muted-foreground">
          Generate Kindle, paperback, and hardcover covers with KDP-accurate dimensions.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No projects need covers yet. Create a book first.
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
                <CardDescription>Cover design workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${p.id}/cover`}>
                    Open cover studio <ArrowRight className="h-4 w-4" />
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
