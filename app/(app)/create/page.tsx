import { createClient } from "@/lib/supabase/server";
import { Wizard } from "@/components/wizard";


export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("pen_name, display_name").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create a Book</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about your book — presets fill in sensible defaults per category.
        </p>
      </div>
      <Wizard
        initialCategory={category}
        defaultAuthorName={profile?.pen_name || profile?.display_name || ""}
      />
    </div>
  );
}
