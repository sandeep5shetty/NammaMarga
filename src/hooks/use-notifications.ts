"use client";

import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  type?: string;
  createdAt: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const knownIds = useRef(new Set<string>());
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const items: AppNotification[] = json.data ?? [];

      items.forEach((n) => {
        if (!knownIds.current.has(n.id) && knownIds.current.size > 0) {
          toast.info(n.title, { description: n.message });
        }
        knownIds.current.add(n.id);
      });

      setNotifications(items);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    const poll = setInterval(fetchNotifications, 15000);

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("broadcast", { event: "new_notification" }, ({ payload }) => {
        const n = payload as AppNotification;
        if (knownIds.current.has(n.id)) return;
        knownIds.current.add(n.id);
        setNotifications((prev) => [n, ...prev]);
        toast.info(n.title, { description: n.message });
      })
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllRead,
    markRead,
    refetch: fetchNotifications,
  };
}
