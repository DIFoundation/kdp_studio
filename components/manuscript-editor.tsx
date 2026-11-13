"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  generateConcept,
  generateBlueprint,
  generateSection,
  saveSectionContent,
  approveSection,
  rejectSection,
  deleteSection,
} from "@/lib/actions/writing";
import type { Section, SectionVersion } from "@/lib/types";
import {
  Sparkles, Check, X, Save, Trash2, FileText,
  ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionWithVersion extends Section {
  latest?: SectionVersion;
  versionCount: number;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export function ManuscriptEditor({
  projectId,
  sections,
  hasBible,
}: {
  projectId: string;
  sections: SectionWithVersion[];
  hasBible: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const selected = sections.find((s) => s.id === selectedId) ?? null;

  function selectSection(s: SectionWithVersion) {
    setSelectedId(s.id);
    setEditContent(s.latest?.content ?? "");
    setEditTitle(s.title);
    setInstructions("");
    setShowInstructions(false);
  }

  function run(fn: () => Promise<{ error?: string; success?: boolean } | undefined>) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });
  }

  const dirty = selected && editContent !== (selected.latest?.content ?? "");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Section list */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Sections ({sections.length})</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => generateConcept(projectId))}
              title="Generate/revise concept"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending || sections.length > 0}
              onClick={() => run(() => generateBlueprint(projectId))}
              title="Generate blueprint"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="h-140 overflow-y-auto">
          {sections.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {!hasBible
                ? "Generate a concept first to build the book bible."
                : "No sections yet — generate a blueprint to create the table of contents."}
            </div>
          ) : (
            <ul className="divide-y">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectSection(s)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent/50",
                      selectedId === s.id && "bg-accent",
                    )}
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.type.replace("_", " ")}
                        {s.word_count_target ? ` · ~${s.word_count_target.toLocaleString()}w` : ""}
                        {s.latest ? ` · v${s.latest.version}` : ""}
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn("shrink-0 text-[10px]", STATUS_STYLE[s.status])}>
                      {s.status.replace("_", " ")}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Editor pane */}
      <div className="rounded-lg border">
        {!selected ? (
          <div className="flex h-140 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>Select a section to view or edit its content.</p>
            {sections.length === 0 && hasBible && (
              <Button
                disabled={pending}
                onClick={() => run(() => generateBlueprint(projectId))}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate blueprint
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8 max-w-70 text-sm font-medium"
              />
              <Badge variant="secondary" className={STATUS_STYLE[selected.status]}>
                {selected.status.replace("_", " ")}
              </Badge>
              {selected.latest && (
                <span className="text-xs text-muted-foreground">
                  v{selected.latest.version} · {selected.latest.source === "ai" ? "AI" : "human"} ·{" "}
                  {selected.latest.content.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setShowInstructions((v) => !v)}
                >
                  Instructions
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      generateSection(
                        projectId,
                        selected.id,
                        instructions || undefined,
                      ),
                    )
                  }
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {selected.latest ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>

            {showInstructions && (
              <div className="border-b px-4 py-2">
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Optional guidance for the next draft (e.g. 'more dialogue', 'shorter', 'focus on the orchard scene')"
                  className="h-8 text-sm"
                />
              </div>
            )}

            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={
                selected.latest
                  ? ""
                  : "No content yet — click Generate to draft this section with AI."
              }
              className="min-h-95 flex-1 resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus-visible:ring-0"
            />

            <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !dirty}
                onClick={() =>
                  run(() => saveSectionContent(projectId, selected.id, editContent))
                }
              >
                <Save className="h-4 w-4" /> Save as new version
              </Button>
              <Button
                size="sm"
                disabled={pending || !selected.latest}
                onClick={() => run(() => approveSection(projectId, selected.id))}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => rejectSection(projectId, selected.id))}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete "${selected.title}"? This cannot be undone.`)) {
                    run(() => deleteSection(projectId, selected.id));
                    setSelectedId(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {dirty ? "Unsaved changes" : "All changes saved"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
