"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DashboardHeader, DashboardSearch } from "@/components/dashboard/dashboard-header";
import { useDbUser } from "@/hooks/use-db-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils";
import { DEFAULT_AVATAR_URL } from "@/utils/constants/misc";
import {
  BarChart3,
  Camera,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

type ShellVariant = "citizen" | "bbmp";

const citizenNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/reports", label: "My Reports", icon: ClipboardList },
  { href: "/dashboard/map", label: "Civic Map", icon: Map },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/report", label: "Report Issue", icon: Camera },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

const bbmpNav = [
  { href: "/bbmp", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bbmp/issues", label: "Issues", icon: ClipboardList },
  { href: "/bbmp/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/bbmp/contractors", label: "Contractors", icon: Users },
  { href: "/bbmp/citizens", label: "Citizens", icon: Users },
];

export function DashboardShell({
  variant,
  children,
}: {
  variant: ShellVariant;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useDbUser();
  const nav = variant === "bbmp" ? bbmpNav : citizenNav;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(variant === "bbmp" ? "/auth/bbmp/sign-in" : "/auth/sign-in");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "NM";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[260px] flex-col border-r border-border bg-card/30">
        <div className="flex h-14 items-center px-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-heading text-lg">
              {variant === "bbmp" ? "BBMP Console" : "NammaMarg"}
            </span>
          </Link>
        </div>

        <DashboardSearch />

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" &&
                href !== "/bbmp" &&
                pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Support card */}
        <div className="mx-3 mb-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Need support?</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Contact BBMP helpline for urgent civic issues.
          </p>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link href="/resources/help">Contact us</Link>
          </Button>
        </div>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image ?? `${DEFAULT_AVATAR_URL}${user?.name}`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name ?? "Citizen"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
