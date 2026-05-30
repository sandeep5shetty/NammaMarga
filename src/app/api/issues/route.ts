import { getAuthUser } from "@/lib/auth/get-user";
import {
  findDuplicateIssue,
  mergeIntoExistingIssue,
} from "@/lib/issues/duplicate-detection";
import { enrichAndCreateIssue } from "@/lib/issues/issue-lifecycle";
import {
  isReportableIssueType,
  validateReportableIssueType,
} from "@/lib/issues/reportable-types";
import { notifyIssueUpdate } from "@/lib/notifications";
import { db } from "@/lib/prisma";
import { withRateLimit } from "@/lib/api/middleware-helpers";
import { IssueType, Severity } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const createIssueSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType).refine(isReportableIssueType, {
    message: "Issue type is not a supported civic category",
  }),
  severity: z.nativeEnum(Severity),
  confidence: z.number().min(0).max(1),
  aiSummary: z.string().optional(),
  imageUrl: z.string().url(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  /** When true, skip duplicate merge and create a new issue (user override). */
  forceNew: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get("wardId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const reporterId = searchParams.get("reporterId");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 500);

    const issues = await db.issue.findMany({
      where: {
        ...(wardId && { wardId }),
        ...(status && { status: status as never }),
        ...(type && { type: type as never }),
        ...(reporterId && { reporterId }),
        duplicateOfId: null,
      },
      include: {
        ward: { select: { name: true, number: true } },
        reporter: { select: { name: true, image: true } },
        contractor: { select: { name: true, company: true } },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({ data: issues });
  } catch (error) {
    console.error("[Issues GET]", error);
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = withRateLimit(request, user.id, 20);
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = createIssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const typeCheck = validateReportableIssueType(parsed.data.type);
    if (!typeCheck.ok) {
      return NextResponse.json(
        { error: typeCheck.message, code: "UNSUPPORTED_ISSUE_TYPE" },
        { status: 422 },
      );
    }

    if (!parsed.data.forceNew) {
      const duplicate = await findDuplicateIssue({
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        type: parsed.data.type,
        wardId: parsed.data.wardId,
      });

      if (duplicate) {
        const mergeResult = await mergeIntoExistingIssue(duplicate.issue.id, user.id, {
          severityConfirmation: parsed.data.severity,
        });

        const message = mergeResult.alreadyReported
          ? "You already added your report to this nearby issue."
          : `Your report was merged with an existing ${parsed.data.type} issue nearby (${Math.round(duplicate.distanceMeters)}m away).`;

        await notifyIssueUpdate(
          user.id,
          mergeResult.issue.id,
          mergeResult.alreadyReported ? "Already reported" : "Duplicate report merged",
          message,
        );

        return NextResponse.json({
          data: mergeResult.issue,
          merged: true,
          alreadyReported: mergeResult.alreadyReported,
          distanceMeters: duplicate.distanceMeters,
        });
      }
    }

    const issue = await enrichAndCreateIssue({
      ...parsed.data,
      reporterId: user.id,
      detection:
        body.detection && typeof body.detection === "object"
          ? {
              modelProvider:
                (body.detection as { modelProvider?: string }).modelProvider ?? "openai",
              modelVersion: (body.detection as { modelVersion?: string }).modelVersion,
              detectedCategory: parsed.data.type,
              confidence: parsed.data.confidence,
              severityHint: parsed.data.severity,
              rawResponse: (body.detection as { rawResponse?: unknown }).rawResponse,
            }
          : undefined,
    });

    await db.activityLog.create({
      data: {
        action: "ISSUE_REPORTED",
        details: `New ${issue.type} reported`,
        issueId: issue.id,
        userId: user.id,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { reputation: { increment: 10 } },
    });

    return NextResponse.json({ data: issue, merged: false }, { status: 201 });
  } catch (error) {
    console.error("[Issues POST]", error);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
