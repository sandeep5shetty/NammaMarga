import { classifyIssue } from "@/lib/ai";
import { classifyRequestSchema } from "@/lib/ai/schemas";
import { getAuthUser } from "@/lib/auth/get-user";
import { withRateLimit } from "@/lib/api/middleware-helpers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = withRateLimit(request, user.id, 15);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = classifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await classifyIssue(
      parsed.data.imageUrl,
      parsed.data.description,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[AI classify]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 },
    );
  }
}
