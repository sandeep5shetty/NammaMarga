import { getAuthUser } from "@/lib/auth/get-user";
import { recalculateRoadHealth } from "@/lib/issues/issue-lifecycle";
import { notifyIssueUpdate } from "@/lib/notifications";
import { db } from "@/lib/prisma";
import { IssueStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.nativeEnum(IssueStatus),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !["AUTHORITY", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const existing = await db.issue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const issue = await db.issue.update({
      where: { id },
      data: {
        status: parsed.data.status,
        resolvedAt:
          ["RESOLVED", "VERIFIED"].includes(parsed.data.status) ? new Date() : existing.resolvedAt,
      },
    });

    await db.issueStatusHistory.create({
      data: {
        issueId: id,
        changedByUserId: user.id,
        fromStatus: existing.status,
        toStatus: parsed.data.status,
        note: parsed.data.note,
      },
    });

    if (existing.roadSegmentId) {
      await recalculateRoadHealth(existing.roadSegmentId);
    }

    if (existing.reporterId) {
      await notifyIssueUpdate(
        existing.reporterId,
        id,
        "Issue status updated",
        `Your report is now ${parsed.data.status.replace("_", " ").toLowerCase()}.`,
      );
    }

    return NextResponse.json({ data: issue });
  } catch (error) {
    console.error("[status]", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
