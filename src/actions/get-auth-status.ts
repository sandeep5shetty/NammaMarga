"use server";

import { db } from "@/lib";
import { createClient } from "@/lib/supabase/server";

const getAuthStatus = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id || !user.email) {
    return { error: "User not found" };
  }

  const supabaseId = user.id;
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const existingUser = await db.user.findFirst({
    where: { supabaseId },
  });

  if (!existingUser) {
    await db.user.create({
      data: {
        supabaseId,
        email: user.email,
        name,
        image: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        emailVerified: user.email_confirmed_at
          ? new Date(user.email_confirmed_at)
          : null,
      },
    });
  }

  return { success: true };
};

export default getAuthStatus;
