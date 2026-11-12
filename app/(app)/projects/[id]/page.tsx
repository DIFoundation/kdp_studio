import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  STATUS_LABELS, CATEGORY_LABELS,
  type Project, type Section,
} from "@/lib/types";
import {
  ArrowLeft, FileText, ImageIcon, Palette, Search, Download,
  BookOpen, ListChecks, ShieldCheck,
} from "lucide-react";


const WORKSPACE_TABS = [
  { href: "", label: "Overview", icon: BookOpen },
  { href: "/manuscript", label: "Manuscript", icon: FileText },
  { href: "/illustrations", label: "Illustrations", icon: ImageIcon },
  { href: "/cover", label: "Cover", icon: Palette },
  { href: "/listing", label: "KDP Listing", icon: Search },
  { href: "/export", label: "Export", icon: Download },
  { href: "/qa", label: "Quality Check", icon: ShieldCheck },
];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();
  const p = project as Project;

  const [sectionsRes, illustrationsRes, coversRes, exportsRes] = await Promise.all([
    supabase.from("sections").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("illustrations").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("covers").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("exports").select("id", { count: "exact", head: true }).eq("project_id", id),
  ]);

  const stats = [
    { label: "Sections", value: sectionsRes.count ?? 0 },
    { label: "Illustrations", value: illustrationsRes.count ?? 0 },
    { label: "Covers", value: coversRes.count ?? 0 },
    { label: "Exports", value: exportsRes.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/library" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{p.title}</h1>
          <Badge variant="secondary">{STATUS_LABELS[p.status]}</Badge>
          <Badge variant="outline">{CATEGORY_LABELS[p.category]}</Badge>
        </div>
        {p.subtitle && <p className="mt-1 text-muted-foreground">{p.subtitle}</p>}
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-px">
        {WORKSPACE_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/projects/${id}${tab.href}`}
            className="flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["Topic", p.topic],
                ["Audience", p.target_audience],
                ["Age range", p.age_range],
                ["Tone", p.tone],
                ["Language", p.language],
                ["Word target", p.word_count_target?.toLocaleString()],
                ["Page target", p.page_count_target],
                ["Chapters", p.chapter_count],
                ["Formats", p.formats.join(", ")],
                ["Trim", p.trim_size],
                ["Illustrations", p.needs_illustrations ? "Yes" : "No"],
                ["Cover", p.needs_cover ? "Yes" : "No"],
                ["Author", p.author_name],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ["Concept development", "concept"],
              ["Book blueprint", "blueprint"],
              ["Chapter writing", "writing"],
              ["Editing & proofreading", "editing"],
              ["Illustrations", "illustrating"],
              ["Cover design", "cover"],
              ["Export & QA", "exporting"],
            ].map(([label, status]) => {
              const order: Project["status"][] = [
                "draft", "concept", "blueprint", "writing", "editing",
                "illustrating", "cover", "exporting", "review", "completed",
              ];
              const current = order.indexOf(p.status);
              const target = order.indexOf(status as Project["status"]);
              const done = current > target || p.status === "completed";
              const active = current === target;
              return (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      done
                        ? "bg-emerald-100 text-emerald-700"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
                </div>
              );
            })}
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              AI generation modules activate in Phase 2+. The workspace is ready to
              receive your approved content.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
