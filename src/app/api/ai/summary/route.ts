import { generateIssueSummary } from "@/lib/ai";
import { summaryRequestSchema } from "@/lib/ai/schemas";
import { getAuthUser } from "@/lib/auth/get-user";
import { db } from "@/lib/prisma";
import { withRateLimit } from "@/lib/api/middleware-helpers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["AUTHORITY", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimited = withRateLimit(request, user.id, 5);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = summaryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = {};
    if (parsed.data.wardId) where.wardId = parsed.data.wardId;
    if (parsed.data.issueIds?.length) where.id = { in: parsed.data.issueIds };

    const issues = await db.issue.findMany({
      where,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { ward: true },
    });

    const ward = parsed.data.wardId
      ? await db.ward.findUnique({ where: { id: parsed.data.wardId } })
      : null;

    const result = await generateIssueSummary({
      issues: issues.map((i) => ({
        type: i.type,
        severity: i.severity,
        status: i.status,
        title: i.title,
        ward: i.ward?.name,
      })),
      period: parsed.data.period,
      wardName: ward?.name,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[AI summary]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary generation failed" },
      { status: 500 },
    );
  }
}
