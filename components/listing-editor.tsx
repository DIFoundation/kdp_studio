"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  generateKeywords,
  generateListing,
  critiqueListing,
  saveListing,
} from "@/lib/actions/listing";
import { KeyRound, Loader2, MessageSquareWarning, Save, Search, Sparkles } from "lucide-react";

export interface ListingData {
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  categories: string[];
  targetAudience: string;
  authorBio: string;
  seriesName: string;
  seriesDescription: string;
}

export interface ResearchData {
  primary_keywords?: { term: string; intent: string; relevance: number; rationale: string }[];
  long_tail_keywords?: { term: string; intent: string; relevance: number; rationale: string }[];
  negative_keywords?: string[];
  category_suggestions?: string[];
  audience_segments?: string[];
  competition_notes?: string;
  title_keyword_opportunities?: string[];
}

export interface CritiqueData {
  score?: number;
  strengths?: string[];
  issues?: { area: string; problem: string; fix: string }[];
  optimized_title?: string | null;
  optimized_subtitle?: string | null;
  missing_elements?: string[];
}

export function ListingEditor({
  projectId,
  initial,
  research,
}: {
  projectId: string;
  initial: ListingData;
  research: ResearchData | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [critique, setCritique] = useState<CritiqueData | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof ListingData>(k: K, v: ListingData[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  function run(action: string, fn: () => Promise<{ error?: string; success?: boolean; critique?: unknown } | undefined>) {
    setBusy(action);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (res && "critique" in res && res.critique) {
        setCritique(res.critique as CritiqueData);
        toast.success("Critique ready");
        return;
      }
      toast.success("Done");
      setDirty(false);
      router.refresh();
    });
  }

  function save() {
    run("save", () =>
      saveListing(projectId, {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        keywords: form.keywords,
        categories: form.categories,
        target_audience: form.targetAudience,
        author_bio: form.authorBio,
        series_name: form.seriesName,
        series_description: form.seriesDescription,
      }),
    );
  }

  const kwText = form.keywords.join(", ");
  const catText = form.categories.join(", ");

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("keywords", () => generateKeywords(projectId))}>
          {busy === "keywords" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {busy === "keywords" ? "Researching…" : "Research keywords"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("listing", () => generateListing(projectId))}>
          {busy === "listing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy === "listing" ? "Generating…" : "Generate listing"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending || !form.title} onClick={() => run("critique", () => critiqueListing(projectId))}>
          {busy === "critique" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareWarning className="h-4 w-4" />}
          {busy === "critique" ? "Reviewing…" : "Critique listing"}
        </Button>
        <Button size="sm" className="ml-auto" disabled={pending || !dirty} onClick={save}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      {/* Critique panel */}
      {critique && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4 text-amber-600" />
            <span className="font-medium">Listing critique</span>
            {critique.score != null && (
              <Badge variant="secondary">Score: {critique.score}/10</Badge>
            )}
          </div>
          {critique.strengths?.length ? (
            <p className="mb-1 text-sm"><span className="font-medium">Strengths:</span> {critique.strengths.join("; ")}</p>
          ) : null}
          {critique.issues?.length ? (
            <ul className="mb-1 list-inside list-disc text-sm">
              {critique.issues.map((i, idx) => (
                <li key={idx}><span className="font-medium">{i.area}:</span> {i.problem} → {i.fix}</li>
              ))}
            </ul>
          ) : null}
          {critique.missing_elements?.length ? (
            <p className="text-sm"><span className="font-medium">Missing:</span> {critique.missing_elements.join("; ")}</p>
          ) : null}
        </div>
      )}

      {/* Keyword research */}
      {research && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4" /> Keyword research
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Primary keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {(research.primary_keywords ?? []).slice(0, 15).map((k) => (
                  <Badge key={k.term} variant="secondary" title={`${k.intent} · relevance ${k.relevance}/10 — ${k.rationale}`}>
                    {k.term}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Long-tail</p>
              <div className="flex flex-wrap gap-1.5">
                {(research.long_tail_keywords ?? []).slice(0, 15).map((k) => (
                  <Badge key={k.term} variant="outline" title={k.rationale}>{k.term}</Badge>
                ))}
              </div>
            </div>
          </div>
          {research.competition_notes && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">Competition notes:</span> {research.competition_notes}
            </p>
          )}
          {research.audience_segments?.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Audiences:</span> {research.audience_segments.join("; ")}
            </p>
          ) : null}
        </div>
      )}

      {/* Listing fields */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
            <p className="text-xs text-muted-foreground">{form.title.length}/200</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subtitle</label>
            <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description (HTML supported)</label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Amazon supports &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;&lt;li&gt; tags.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Backend keywords (comma-separated)</label>
            <Textarea
              value={kwText}
              onChange={(e) => set("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categories (comma-separated)</label>
            <Textarea
              value={catText}
              onChange={(e) => set("categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              rows={4}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target audience</label>
            <Input value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Series name</label>
            <Input value={form.seriesName} onChange={(e) => set("seriesName", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Author bio</label>
          <Textarea value={form.authorBio} onChange={(e) => set("authorBio", e.target.value)} rows={4} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Series description</label>
          <Textarea value={form.seriesDescription} onChange={(e) => set("seriesDescription", e.target.value)} rows={3} />
        </div>
      </div>
    </div>
  );
}
