import { db } from "@/lib/prisma";
import { healthScoreColor, healthScoreLabel } from "@/lib/scoring/road-health";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId");

    const segments = await db.roadSegment.findMany({
      where: wardId ? { wardId } : undefined,
      include: {
        ward: { select: { name: true, number: true } },
        _count: { select: { issues: true } },
      },
      orderBy: { healthScore: "asc" },
    });

    const data = segments.map((s) => ({
      id: s.id,
      name: s.name,
      ward: s.ward,
      healthScore: s.healthScore,
      label: healthScoreLabel(s.healthScore),
      color: healthScoreColor(s.healthScore),
      issueCount: s._count.issues,
      coordinates: [
        [s.longitudeStart, s.latitudeStart],
        [s.longitudeEnd, s.latitudeEnd],
      ] as [number, number][],
      lastScoredAt: s.lastScoredAt,
    }));

    const avgHealth = data.length
      ? Math.round(data.reduce((a, b) => a + b.healthScore, 0) / data.length)
      : 100;

    return NextResponse.json({
      data: {
        segments: data,
        averageHealth: avgHealth,
        criticalRoads: data.filter((s) => s.healthScore < 40).length,
      },
    });
  } catch (error) {
    console.error("[road-health]", error);
    return NextResponse.json({ error: "Failed to fetch road health" }, { status: 500 });
  }
}
