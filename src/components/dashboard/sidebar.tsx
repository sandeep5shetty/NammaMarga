"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import {
  Bell,
  Camera,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Shield,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useDbUser } from "@/hooks/use-db-user";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const citizenLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/report", label: "Report Issue", icon: Camera },
  { href: "/map", label: "Civic Map", icon: Map },
  { href: "/dashboard/reports", label: "My Reports", icon: Home },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useDbUser();
  const { unreadCount } = useNotifications();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-muted/20 min-h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-border">
        <Link href="/" className="text-lg font-bold font-heading">
          NammaMarg
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Citizen Dashboard</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {citizenLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {label === "Notifications" && unreadCount > 0 && (
              <Badge className="ml-auto h-5 min-w-5 px-1">{unreadCount}</Badge>
            )}
          </Link>
        ))}

        {user && ["AUTHORITY", "ADMIN"].includes(user.role) && (
          <Link
            href="/bbmp"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-amber-500 hover:bg-amber-500/10 mt-4"
          >
            <Shield className="h-4 w-4" />
            BBMP Console
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-amber-500" />
          <span className="text-muted-foreground">
            Reputation: {user?.reputation ?? 0}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
