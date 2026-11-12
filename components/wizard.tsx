"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_PRESETS } from "@/lib/kdp/presets";
import { TRIM_SIZES } from "@/lib/kdp/sizes";
import { createProject, type WizardInput } from "@/lib/actions/projects";
import type { BookCategory } from "@/lib/types";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Category",
  "Basics",
  "Audience & Style",
  "Scope",
  "Format & Visuals",
  "Review",
] as const;

const FORMATS = [
  { id: "kindle", label: "Kindle eBook" },
  { id: "paperback", label: "Paperback" },
  { id: "hardcover", label: "Hardcover" },
] as const;

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "pt", label: "Portuguese" },
  { id: "it", label: "Italian" },
];

const TONES = [
  "engaging, polished", "warm, playful, gentle", "dark, atmospheric",
  "authoritative, practical", "whimsical", "emotional, heartfelt",
  "fast-paced, gripping", "calm, reflective", "educational, clear",
];

interface WizardProps {
  initialCategory?: string;
  defaultAuthorName?: string;
}

export function Wizard({ initialCategory, defaultAuthorName }: WizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<WizardInput>({
    title: "",
    category: (initialCategory as BookCategory) || "fiction",
    formats: ["paperback"],
    language: "en",
    needs_illustrations: false,
    needs_cover: true,
    author_name: defaultAuthorName || "",
  });

  const preset = useMemo(
    () => CATEGORY_PRESETS.find((p) => p.category === form.category),
    [form.category],
  );

  const set = <K extends keyof WizardInput>(key: K, value: WizardInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function applyPreset(category: BookCategory) {
    const p = CATEGORY_PRESETS.find((x) => x.category === category);
    setForm((f) => ({
      ...f,
      category,
      subcategory: undefined,
      formats: p?.defaults.formats ?? f.formats,
      trim_size: p?.defaults.trimSize,
      needs_illustrations: p?.defaults.needsIllustrations ?? false,
      needs_cover: p?.defaults.needsCover ?? true,
      word_count_target: p?.defaults.wordCountTarget,
      page_count_target: p?.defaults.pageCountTarget,
      chapter_count: p?.defaults.chapterCount,
      age_range: p?.defaults.ageRange,
      tone: p?.defaults.tone,
    }));
  }

  function toggleFormat(id: string) {
    setForm((f) => {
      const has = f.formats.includes(id);
      const next = has ? f.formats.filter((x) => x !== id) : [...f.formats, id];
      return { ...f, formats: next.length ? next : f.formats };
    });
  }

  function canContinue(): boolean {
    switch (step) {
      case 0: return Boolean(form.category);
      case 1: return Boolean(form.title.trim()) && Boolean(form.topic?.trim());
      case 2: return true;
      case 3: return true;
      case 4: return form.formats.length > 0;
      case 5: return true;
      default: return false;
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await createProject(form);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Book setup</CardTitle>
            <CardDescription>
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </CardDescription>
          </div>
          <Badge variant="secondary">{preset?.label}</Badge>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 0 — Category */}
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORY_PRESETS.map((p) => (
              <button
                key={p.category}
                type="button"
                onClick={() => applyPreset(p.category)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors hover:border-primary/50",
                  form.category === p.category && "border-primary bg-accent/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.label}</span>
                  {form.category === p.category && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 1 — Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Book title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="The Midnight Orchard"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={form.subtitle ?? ""}
                  onChange={(e) => set("subtitle", e.target.value)}
                  placeholder="A novel of secrets and orchards"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / central idea *</Label>
              <Textarea
                id="topic"
                value={form.topic ?? ""}
                onChange={(e) => set("topic", e.target.value)}
                placeholder="Describe your book's idea, premise, or what it should teach/entertain…"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={form.subcategory ?? ""}
                onValueChange={(v) => set("subcategory", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {preset?.subcategories.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2 — Audience & style */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Target audience</Label>
                <Input
                  value={form.target_audience ?? ""}
                  onChange={(e) => set("target_audience", e.target.value)}
                  placeholder="e.g. busy parents, aspiring entrepreneurs"
                />
              </div>
              <div className="space-y-2">
                <Label>Age range</Label>
                <Select value={form.age_range ?? ""} onValueChange={(v) => set("age_range", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age range" />
                  </SelectTrigger>
                  <SelectContent>
                    {["0-3", "4-6", "7-9", "10-12", "13-17", "18+"].map((a) => (
                      <SelectItem key={a} value={a}>Ages {a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Writing style / tone</Label>
                <Select value={form.tone ?? ""} onValueChange={(v) => set("tone", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language ?? "en"} onValueChange={(v) => set("language", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author name / pen name</Label>
              <Input
                id="author"
                value={form.author_name ?? ""}
                onChange={(e) => set("author_name", e.target.value)}
                placeholder="Your name or pen name"
              />
            </div>
          </div>
        )}

        {/* Step 3 — Scope */}
        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="wc">Target word count</Label>
              <Input
                id="wc"
                type="number"
                value={form.word_count_target ?? ""}
                onChange={(e) => set("word_count_target", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="60000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc">Target page count</Label>
              <Input
                id="pc"
                type="number"
                value={form.page_count_target ?? ""}
                onChange={(e) => set("page_count_target", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc">Chapters / sections</Label>
              <Input
                id="cc"
                type="number"
                value={form.chapter_count ?? ""}
                onChange={(e) => set("chapter_count", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="20"
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              Leave fields blank and the AI will recommend scope during blueprinting.
            </p>
          </div>
        )}

        {/* Step 4 — Format & visuals */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Publishing formats</Label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFormat(f.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      form.formats.includes(f.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {form.formats.some((f) => f !== "kindle") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trim size</Label>
                  <Select value={form.trim_size ?? ""} onValueChange={(v) => set("trim_size", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trim size" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIM_SIZES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={form.orientation ?? "portrait"}
                    onValueChange={(v) => set("orientation", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.needs_illustrations ?? false}
                  onChange={(e) => set("needs_illustrations", e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Interior illustrations required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.needs_cover ?? true}
                  onChange={(e) => set("needs_cover", e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Generate book cover
              </label>
            </div>
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["Title", form.title],
                ["Subtitle", form.subtitle],
                ["Category", preset?.label],
                ["Subcategory", form.subcategory],
                ["Topic", form.topic],
                ["Audience", form.target_audience],
                ["Age range", form.age_range],
                ["Tone", form.tone],
                ["Language", form.language],
                ["Word count", form.word_count_target?.toLocaleString()],
                ["Pages", form.page_count_target],
                ["Chapters", form.chapter_count],
                ["Formats", form.formats.join(", ")],
                ["Trim size", form.trim_size],
                ["Illustrations", form.needs_illustrations ? "Yes" : "No"],
                ["Cover", form.needs_cover ? "Yes" : "No"],
                ["Author", form.author_name],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-start gap-2 rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              After creation you can generate a concept, blueprint, and chapter-by-chapter
              manuscript — every AI output requires your approval before it becomes final.
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={pending || !canContinue()}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
