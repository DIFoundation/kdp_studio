"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { generateCoverConcepts, approveCoverConcept } from "@/lib/actions/visuals";
import { Check, Loader2, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CoverConcept {
  prompt: string;
  url: string | null;
  status: string;
}

export interface CoverData {
  type: "kindle" | "paperback" | "hardcover";
  widthPx: number | null;
  heightPx: number | null;
  spinePx: number | null;
  approvedConcept: number | null;
  concepts: CoverConcept[];
}

const TYPES = [
  { id: "kindle", label: "Kindle", dims: "2560×1600 px" },
  { id: "paperback", label: "Paperback", dims: "computed from trim + spine" },
  { id: "hardcover", label: "Hardcover", dims: "computed from trim + spine" },
] as const;

export function CoverDesigner({
  projectId,
  covers,
  trimLabel,
}: {
  projectId: string;
  covers: CoverData[];
  trimLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("kindle");
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState("2");

  const active = covers.find((c) => c.type === type);

  function generate() {
    startTransition(async () => {
      const res = await generateCoverConcepts(
        projectId,
        type,
        theme || undefined,
        Number(count) || 2,
      );
      if (res && "error" in res && res.error) toast.error(res.error);
      else if (res && "count" in res) {
        toast.success(`${res.count} cover concept(s) generated`);
        router.refresh();
      }
    });
  }

  function approve(index: number) {
    startTransition(async () => {
      const res = await approveCoverConcept(projectId, type, index);
      if (res && "error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Cover concept approved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Format</label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Art direction (optional)</label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. dark academia, minimalist botanical, retro thriller"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Concepts</label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="h-9 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4"].map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {pending ? "Generating…" : "Generate concepts"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {type === "kindle"
            ? "Kindle cover: 2560×1600 px (1.6:1), 72 DPI minimum — KDP recommends 2560×1600."
            : `${type === "paperback" ? "Paperback" : "Hardcover"} wraparound computed at 300 DPI from trim ${trimLabel} + page count + spine. Re-validate against current KDP specs before export.`}
        </p>
      </div>

      {/* Concepts */}
      {!active || active.concepts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Palette className="mx-auto mb-2 h-8 w-8" />
          No {type} concepts yet — generate some above.
        </div>
      ) : (
        <div className="space-y-3">
          {active.widthPx && active.heightPx && (
            <p className="text-xs text-muted-foreground">
              Target: {active.widthPx}×{active.heightPx} px
              {active.spinePx ? ` (spine ${active.spinePx}px)` : ""}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {active.concepts.map((c, i) => (
              <div
                key={i}
                className={cn(
                  "overflow-hidden rounded-lg border-2",
                  c.status === "approved" ? "border-emerald-500" : "border-transparent",
                )}
              >
                <div className="bg-muted" style={{ aspectRatio: "2/3" }}>
                  {c.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.url} alt={c.prompt} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="line-clamp-1 flex-1 text-xs text-muted-foreground">{c.prompt}</p>
                  {c.status === "approved" ? (
                    <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approve(i)}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
