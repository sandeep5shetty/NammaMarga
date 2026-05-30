import { getAuthUser } from "@/lib/auth/get-user";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["AUTHORITY", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId") ?? user.wardId ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const issues = await db.issue.findMany({
      where: {
        duplicateOfId: null,
        status: { in: ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS"] },
        ...(wardId ? { wardId } : {}),
      },
      include: {
        ward: { select: { name: true, number: true } },
        reporter: { select: { name: true, email: true } },
        _count: { select: { votes: true, comments: true } },
      },
      orderBy: [{ priorityScore: "desc" }, { severity: "desc" }, { createdAt: "asc" }],
      take: limit,
    });

    const wardStats = await db.issue.groupBy({
      by: ["wardId"],
      where: {
        duplicateOfId: null,
        status: { in: ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS"] },
        wardId: { not: null },
      },
      _count: true,
    });

    const wards = await db.ward.findMany();
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    const rankings = wardStats
      .map((w) => ({
        wardId: w.wardId,
        wardName: w.wardId ? wardMap[w.wardId!]?.name : "Unknown",
        activeIssues: w._count,
      }))
      .sort((a, b) => b.activeIssues - a.activeIssues);

    return NextResponse.json({
      data: {
        queue: issues,
        wardRankings: rankings,
      },
    });
  } catch (error) {
    console.error("[ward-queue]", error);
    return NextResponse.json({ error: "Failed to fetch ward queue" }, { status: 500 });
  }
}
