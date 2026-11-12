"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookPlus,
  Library,
  Palette,
  Image as ImageIcon,
  Search,
  Settings,
  BookOpen,
  Feather,
  Baby,
  Palette as PaletteIcon,
  GraduationCap,
  Newspaper,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create a Book", icon: BookPlus },
];

const CATEGORY_LINKS = [
  { href: "/create?category=fiction", label: "Fiction & Literature", icon: Feather },
  { href: "/create?category=childrens", label: "Children's Books", icon: Baby },
  { href: "/create?category=colouring", label: "Colouring Books", icon: PaletteIcon },
  { href: "/create?category=educational", label: "Educational Books", icon: GraduationCap },
  { href: "/create?category=nonfiction", label: "Nonfiction", icon: Newspaper },
  { href: "/create?category=journal", label: "Journals & Planners", icon: NotebookPen },
];

const TOOL_LINKS = [
  { href: "/covers", label: "AI Cover Designer", icon: Palette },
  { href: "/illustrations", label: "Illustration Studio", icon: ImageIcon },
  { href: "/research", label: "KDP SEO Research", icon: Search },
];

const BOTTOM_LINKS = [
  { href: "/library", label: "My Library", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookOpen className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">KDP Studio</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </p>
        {CATEGORY_LINKS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tools
        </p>
        {TOOL_LINKS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <Separator className="my-3" />
        {BOTTOM_LINKS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 truncate px-3 text-sm text-muted-foreground">{userName}</div>
        <form action={signOut}>
          <Button variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
