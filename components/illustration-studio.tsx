"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateIllustration, setIllustrationStatus } from "@/lib/actions/visuals";
import { Check, Loader2, Sparkles, X } from "lucide-react";

export interface IllustrationItem {
  id: string;
  kind: string;
  prompt: string;
  status: string;
  url: string | null;
  sectionTitle: string | null;
  createdAt: string;
}

const KINDS = [
  { id: "scene", label: "Scene illustration" },
  { id: "character_sheet", label: "Character sheet" },
  { id: "coloring_page", label: "Colouring page" },
  { id: "diagram", label: "Diagram" },
  { id: "cover_element", label: "Cover element" },
];

const KIND_PLACEHOLDERS: Record<string, string> = {
  scene: "A lantern-lit orchard at dusk, a girl discovering an old gate…",
  character_sheet: "Friendly fox ranger, orange fur, green scarf, full body turnaround…",
  coloring_page: "A hot air balloon over mountains, bold outlines, no shading…",
  diagram: "Cross-section of a plant cell with labeled parts…",
  cover_element: "Ornamental floral border frame, art nouveau style…",
};

export function IllustrationStudio({
  projectId,
  illustrations,
  sections,
}: {
  projectId: string;
  illustrations: IllustrationItem[];
  sections: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState("scene");
  const [prompt, setPrompt] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [style, setStyle] = useState("");

  function generate() {
    if (!prompt.trim()) {
      toast.error("Describe the image first");
      return;
    }
    startTransition(async () => {
      const res = await generateIllustration(projectId, {
        kind,
        prompt: prompt.trim(),
        sectionId: sectionId || undefined,
        style: style || undefined,
      });
      if (res && "error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Illustration generated");
        setPrompt("");
        router.refresh();
      }
    });
  }

  function setStatus(id: string, status: "approved" | "rejected") {
    startTransition(async () => {
      const res = await setIllustrationStatus(projectId, id, status);
      if (res && "error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={KIND_PLACEHOLDERS[kind]}
            rows={2}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={sectionId || "none"} onValueChange={(v) => setSectionId(v === "none" ? "" : v)}>
            <SelectTrigger className="h-8 w-55 text-xs">
              <SelectValue placeholder="Link to section (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No section link</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Style override (optional)"
            className="h-8 w-55 text-xs"
          />
          <Button size="sm" onClick={generate} disabled={pending} className="ml-auto">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Generation uses your configured image provider (OpenAI Images, Stability, or Replicate)
          and is logged to usage tracking. No text is rendered inside images.
        </p>
      </div>

      {/* Gallery */}
      {illustrations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No illustrations yet — describe your first image above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {illustrations.map((ill) => (
            <div key={ill.id} className="overflow-hidden rounded-lg border">
              <div className="aspect-4/3 bg-muted">
                {ill.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ill.url} alt={ill.prompt} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Preview unavailable
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {ill.kind.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={
                      ill.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : ill.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : ""
                    }
                  >
                    {ill.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{ill.prompt}</p>
                {ill.sectionTitle && (
                  <p className="text-[10px] text-muted-foreground">§ {ill.sectionTitle}</p>
                )}
                <div className="flex gap-1 pt-1">
                  {ill.status !== "approved" && (
                    <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => setStatus(ill.id, "approved")}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                  )}
                  {ill.status !== "rejected" && (
                    <Button size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={() => setStatus(ill.id, "rejected")}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
