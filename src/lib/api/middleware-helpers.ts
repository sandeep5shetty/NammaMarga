import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";

export async function withAuth(handler: (userId: string) => Promise<NextResponse>) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler(user.id);
}

export function withRateLimit(
  request: Request,
  userId: string,
  limit = 10,
) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = rateLimit(`api:${userId}:${ip}`, limit);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  return null;
}
