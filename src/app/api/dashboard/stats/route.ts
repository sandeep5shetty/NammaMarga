import { getAuthUser } from "@/lib/auth/get-user";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [myIssues, resolved, verifications, recentIssues] = await Promise.all([
      db.issue.count({ where: { reporterId: user.id, duplicateOfId: null } }),
      db.issue.count({
        where: {
          reporterId: user.id,
          status: { in: ["RESOLVED", "VERIFIED"] },
          duplicateOfId: null,
        },
      }),
      db.verification.count({ where: { verifierId: user.id } }),
      db.issue.findMany({
        where: { reporterId: user.id, duplicateOfId: null },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { ward: { select: { name: true, number: true } } },
      }),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendIssues = await db.issue.findMany({
      where: { reporterId: user.id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    const byDay: Record<string, number> = {};
    trendIssues.forEach((i) => {
      const day = i.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    });

    const trend = Object.entries(byDay).map(([date, count]) => ({ date, count }));

    const statusCounts = await db.issue.groupBy({
      by: ["status"],
      where: { reporterId: user.id, duplicateOfId: null },
      _count: true,
    });

    const statusChart = statusCounts.map((s) => ({
      status: s.status,
      count: s._count,
    }));

    return NextResponse.json({
      data: {
        myIssues,
        resolved,
        verifications,
        reputation: user.reputation,
        resolutionRate: myIssues ? resolved / myIssues : 0,
        recentIssues,
        trend,
        statusChart,
      },
    });
  } catch (error) {
    console.error("[Dashboard stats]", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
