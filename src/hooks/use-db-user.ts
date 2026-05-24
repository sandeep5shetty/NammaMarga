"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@prisma/client";

interface DbUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  reputation: number;
  badges: string[];
  image: string | null;
}

export function useDbUser() {
  const [user, setUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setUser(json?.data ?? null))
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading };
}
