"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportManuscript, getExportDownloadUrl, type ExportFormat } from "@/lib/actions/export";
import { Download, FileText, Loader2 } from "lucide-react";

export interface ExportRecord {
  id: string;
  format: string;
  fileSizeBytes: number | null;
  status: string;
  createdAt: string;
}

const FORMATS: { id: ExportFormat; label: string; desc: string }[] = [
  { id: "docx", label: "DOCX", desc: "Editable manuscript for Word / Google Docs" },
  { id: "pdf", label: "PDF", desc: "Print-friendly manuscript (screen PDF)" },
  { id: "epub", label: "EPUB", desc: "Kindle eBook upload file" },
];

export function ExportPanel({
  projectId,
  exports,
}: {
  projectId: string;
  exports: ExportRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyFormat, setBusyFormat] = useState<string | null>(null);

  function runExport(format: ExportFormat) {
    setBusyFormat(format);
    startTransition(async () => {
      const res = await exportManuscript(projectId, format);
      setBusyFormat(null);
      if (res && "error" in res && res.error) toast.error(res.error);
      else {
        toast.success(`${format.toUpperCase()} export ready`);
        router.refresh();
      }
    });
  }

  async function download(id: string) {
    const res = await getExportDownloadUrl(projectId, id);
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    if (res && "url" in res && res.url) {
      window.open(res.url, "_blank");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <div key={f.id} className="flex flex-col rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">{f.label}</span>
            </div>
            <p className="mb-3 flex-1 text-xs text-muted-foreground">{f.desc}</p>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runExport(f.id)}
            >
              {busyFormat === f.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export {f.label}
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Exports include only sections with approved content. Run Quality Check
        first to catch issues before publishing.
      </p>

      {exports.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-2 text-sm font-medium">Generated files</div>
          <ul className="divide-y">
            {exports.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="uppercase">{e.format}</Badge>
                  <span className="text-muted-foreground">
                    {e.fileSizeBytes ? `${(e.fileSizeBytes / 1024).toFixed(0)} KB` : "—"} ·{" "}
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(e.id)}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
