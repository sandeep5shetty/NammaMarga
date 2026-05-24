"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationMenu, ProfileMenu } from "@/components/dashboard/notification-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useDbUser } from "@/hooks/use-db-user";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function DashboardHeader({ title }: { title?: string }) {
  const { user } = useDbUser();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
      {title && (
        <h1 className="text-lg font-semibold hidden sm:block">{title}</h1>
      )}
      <div className="flex-1" />
      <ThemeToggle />
      <NotificationMenu userId={user?.id} />
      <ProfileMenu
        name={user?.name}
        email={user?.email}
        image={user?.image}
        onSignOut={handleSignOut}
      />
    </header>
  );
}

export function DashboardSearch() {
  return (
    <div className="px-3 py-2">
      <Input placeholder="Search..." className="h-9 bg-muted/50 border-none" />
    </div>
  );
}
