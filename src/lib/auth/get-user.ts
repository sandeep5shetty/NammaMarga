import { db } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const dbUser = await db.user.findUnique({
    where: { supabaseId: user.id },
    include: { ward: true },
  });

  return dbUser;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export async function requireAuthority() {
  return requireRole(["AUTHORITY", "ADMIN"]);
}
