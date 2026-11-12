import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, KeyRound, AlertTriangle } from "lucide-react";


export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KDP SEO Research</h1>
        <p className="text-sm text-muted-foreground">
          Niche demand, keyword research, and listing optimization — Phase 5 module.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Search, title: "Niche research", desc: "Audience demand and competition mapping for your book's category." },
          { icon: KeyRound, title: "Keyword research", desc: "Amazon search terms with relevance scoring — no invented volume data." },
          { icon: TrendingUp, title: "Listing optimizer", desc: "Titles, subtitles, descriptions, and categories tuned for KDP search." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="mb-1 h-5 w-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 py-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Coming in Phase 5</p>
            <p className="mt-1">
              Market intelligence will distinguish verified data from AI estimates.
              No sales figures, rankings, or search volumes will be fabricated —
              unverified claims are always labeled as estimates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
