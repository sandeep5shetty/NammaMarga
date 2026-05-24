"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Users,
} from "lucide-react";

const links = [
  { href: "/bbmp", label: "Overview", icon: LayoutDashboard },
  { href: "/bbmp/issues", label: "Issue Management", icon: ClipboardList },
  { href: "/bbmp/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/bbmp/contractors", label: "Contractors", icon: Building2 },
  { href: "/bbmp/citizens", label: "Citizens", icon: Users },
];

export function BbmpSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-muted/10 min-h-screen">
      <div className="p-4 border-b border-border">
        <Link href="/bbmp" className="text-lg font-bold font-heading text-amber-500">
          BBMP Console
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Authority Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-amber-500/20 text-amber-500"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted mt-4"
        >
          ← Citizen Dashboard
        </Link>
      </nav>
    </aside>
  );
}
