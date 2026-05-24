import { verifyFix } from "@/lib/ai";
import { getAuthUser } from "@/lib/auth/get-user";
import { isWithinGeoFence } from "@/lib/geo/haversine";
import { notifyIssueUpdate } from "@/lib/notifications";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const verifySchema = z.object({
  issueId: z.string(),
  imageUrl: z.string().url(),
  latitude: z.number(),
  longitude: z.number(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const issue = await db.issue.findUnique({ where: { id: parsed.data.issueId } });
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    if (issue.status !== "RESOLVED" && issue.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Issue is not ready for verification" },
        { status: 400 },
      );
    }

    const geoValidated = isWithinGeoFence(
      { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
      { latitude: issue.latitude, longitude: issue.longitude },
      150,
    );

    let aiResult = { verified: false, confidence: 0, reasoning: "AI unavailable", improvements: [] as string[] };

    try {
      aiResult = await verifyFix(
        issue.imageUrl,
        parsed.data.imageUrl,
        issue.type,
        issue.description ?? undefined,
      );
    } catch {
      aiResult.reasoning = "AI verification skipped — manual review required";
    }

    const verification = await db.verification.create({
      data: {
        issueId: issue.id,
        verifierId: user.id,
        imageUrl: parsed.data.imageUrl,
        confidence: aiResult.confidence,
        aiReasoning: aiResult.reasoning,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        geoValidated,
        status: aiResult.verified && geoValidated ? "APPROVED" : "PENDING",
      },
    });

    const approvalCount = await db.verification.count({
      where: { issueId: issue.id, status: "APPROVED" },
    });

    if (approvalCount >= 2 || (aiResult.verified && geoValidated && aiResult.confidence > 0.8)) {
      await db.issue.update({
        where: { id: issue.id },
        data: { status: "VERIFIED", afterImageUrl: parsed.data.imageUrl },
      });

      await db.user.update({
        where: { id: user.id },
        data: { reputation: { increment: 25 } },
      });

      await notifyIssueUpdate(
        issue.reporterId,
        issue.id,
        "Fix verified!",
        `Citizens verified the fix for "${issue.title}".`,
      );
    }

    return NextResponse.json({
      data: { verification, aiResult, geoValidated, approvalCount },
    });
  } catch (error) {
    console.error("[Verify POST]", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
