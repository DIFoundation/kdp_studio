import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { listTextProviders, listImageProviders } from "@/lib/ai";
import { CheckCircle2, XCircle } from "lucide-react";


export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: usage } = await supabase
    .from("usage_events")
    .select("kind, provider, model, prompt_tokens, completion_tokens, image_count, estimated_cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const textProviders = listTextProviders();
  const imageProviders = listImageProviders();
  const totalCost = (usage ?? []).reduce((s, u) => s + Number(u.estimated_cost_usd ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Account, providers, and usage</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Signed in as {user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Display name</span>
              <span className="font-medium">{profile?.display_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pen name</span>
              <span className="font-medium">{profile?.pen_name ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Providers</CardTitle>
            <CardDescription>Configured via environment variables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="mb-1 font-medium">Text generation</p>
              <div className="flex flex-wrap gap-2">
                {textProviders.map((p) => (
                  <Badge key={p.id} variant={p.configured ? "success" : "outline"}>
                    {p.configured ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                    {p.displayName}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-1 font-medium">Image generation</p>
              <div className="flex flex-wrap gap-2">
                {imageProviders.map((p) => (
                  <Badge key={p.id} variant={p.configured ? "success" : "outline"}>
                    {p.configured ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                    {p.displayName}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Provider order and keys are set in <code>.env.local</code> — see{" "}
              <code>env.example</code>. No keys are stored in the database.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage & cost</CardTitle>
          <CardDescription>
            Estimated spend across recent generations: ${totalCost.toFixed(4)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!usage || usage.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI generations recorded yet. Usage is logged automatically when
              text or image generation runs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Kind</th>
                    <th className="pb-2 pr-4 font-medium">Provider</th>
                    <th className="pb-2 pr-4 font-medium">Model</th>
                    <th className="pb-2 pr-4 font-medium">Tokens / images</th>
                    <th className="pb-2 font-medium">Est. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 capitalize">{u.kind}</td>
                      <td className="py-2 pr-4">{u.provider}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{u.model}</td>
                      <td className="py-2 pr-4">
                        {u.kind === "text"
                          ? `${(u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0)} tok`
                          : `${u.image_count ?? 1} img`}
                      </td>
                      <td className="py-2">
                        {u.estimated_cost_usd != null ? `$${Number(u.estimated_cost_usd).toFixed(4)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
