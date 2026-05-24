import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [
      totalIssues,
      resolvedIssues,
      byType,
      bySeverity,
      byWard,
      byStatus,
      recentTrend,
    ] = await Promise.all([
      db.issue.count({ where: { duplicateOfId: null } }),
      db.issue.count({
        where: { status: { in: ["RESOLVED", "VERIFIED"] }, duplicateOfId: null },
      }),
      db.issue.groupBy({
        by: ["type"],
        _count: true,
        where: { duplicateOfId: null },
      }),
      db.issue.groupBy({
        by: ["severity"],
        _count: true,
        where: { duplicateOfId: null },
      }),
      db.issue.groupBy({
        by: ["wardId"],
        _count: true,
        where: { duplicateOfId: null, wardId: { not: null } },
      }),
      db.issue.groupBy({
        by: ["status"],
        _count: true,
        where: { duplicateOfId: null },
      }),
      db.issue.findMany({
        where: {
          duplicateOfId: null,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const wards = await db.ward.findMany();
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));

    return NextResponse.json({
      data: {
        totalIssues,
        resolvedIssues,
        resolutionRate: totalIssues ? resolvedIssues / totalIssues : 0,
        byType: byType.map((t) => ({ type: t.type, count: t._count })),
        bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count })),
        byWard: byWard.map((w) => ({
          wardId: w.wardId,
          wardName: w.wardId ? wardMap[w.wardId] : "Unknown",
          count: w._count,
        })),
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        recentTrend,
        totalCitizens: await db.user.count({ where: { role: "CITIZEN" } }),
        totalContractors: await db.contractor.count({ where: { active: true } }),
      },
    });
  } catch (error) {
    console.error("[Analytics]", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
