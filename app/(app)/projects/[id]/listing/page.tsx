import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import type { Project } from "@/lib/types";


export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();
  const p = project as Project;

  const { data: listing } = await supabase.from("listings").select("*").eq("project_id", id).single();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">KDP Listing</h2>
        <p className="text-sm text-muted-foreground">
          Title, description, keywords, and categories — Phase 5 module.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing assets</CardTitle>
          <CardDescription>
            {listing ? "Listing draft exists" : "No listing generated yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ["Title", listing?.title ?? p.title],
            ["Subtitle", listing?.subtitle ?? p.subtitle],
            ["Description", listing?.description ? "Generated" : "Not generated"],
            ["Keywords", listing?.keywords?.length ? `${listing.keywords.length} terms` : "Not generated"],
            ["Categories", listing?.categories?.length ? listing.categories.join(", ") : "Not generated"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-right font-medium">{v || "—"}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
            <Search className="mt-0.5 h-4 w-4 shrink-0" />
            Listing generation will include search-intent analysis and clearly
            label AI estimates vs. verified research data.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
