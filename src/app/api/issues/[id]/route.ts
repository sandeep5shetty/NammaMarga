import { getAuthUser } from "@/lib/auth/get-user";
import { recalculateRoadHealth } from "@/lib/issues/issue-lifecycle";
import { notifyStatusChange } from "@/lib/notifications";
import { db } from "@/lib/prisma";
import { IssueStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  status: z.nativeEnum(IssueStatus).optional(),
  assigneeId: z.string().optional(),
  contractorId: z.string().optional(),
  aiSummary: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const issue = await db.issue.findUnique({
      where: { id },
      include: {
        ward: true,
        reporter: { select: { id: true, name: true, image: true, reputation: true } },
        assignee: { select: { id: true, name: true } },
        contractor: true,
        verifications: {
          include: { verifier: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: { author: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
        },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        detection: true,
        votes: { include: { user: { select: { name: true } } } },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: { changedBy: { select: { name: true } } },
        },
        roadSegment: { select: { name: true, healthScore: true } },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({ data: issue });
  } catch (error) {
    console.error("[Issue GET]", error);
    return NextResponse.json({ error: "Failed to fetch issue" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["AUTHORITY", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const existing = await db.issue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const issue = await db.issue.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.status === "RESOLVED" && { resolvedAt: new Date() }),
        ...(parsed.data.status === "VERIFIED" && { resolvedAt: existing.resolvedAt ?? new Date() }),
      },
    });

    if (parsed.data.contractorId && parsed.data.contractorId !== existing.contractorId) {
      const contractor = await db.contractor.findUnique({
        where: { id: parsed.data.contractorId },
      });
      await db.issueStatusHistory.create({
        data: {
          issueId: id,
          changedByUserId: user.id,
          fromStatus: existing.status,
          toStatus: existing.status,
          note: contractor
            ? `Contractor assigned: ${contractor.name}${contractor.company ? ` (${contractor.company})` : ""}`
            : "Contractor assigned",
        },
      });
      await db.activityLog.create({
        data: {
          action: "CONTRACTOR_ASSIGNED",
          details: contractor
            ? `${contractor.name} assigned to this issue`
            : "Contractor assigned",
          issueId: id,
          userId: user.id,
        },
      });
    }

    if (parsed.data.status) {
      await db.issueStatusHistory.create({
        data: {
          issueId: id,
          changedByUserId: user.id,
          fromStatus: existing.status,
          toStatus: parsed.data.status,
        },
      });

      if (existing.roadSegmentId) {
        await recalculateRoadHealth(existing.roadSegmentId);
      }

      await db.activityLog.create({
        data: {
          action: "STATUS_CHANGED",
          details: `Status changed to ${parsed.data.status}`,
          issueId: id,
          userId: user.id,
        },
      });

      await notifyStatusChange(
        issue.reporterId,
        id,
        issue.title,
        parsed.data.status,
      );
    }

    return NextResponse.json({ data: issue });
  } catch (error) {
    console.error("[Issue PATCH]", error);
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}
