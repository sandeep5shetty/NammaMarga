import { findDuplicateIssue } from "@/lib/issues/duplicate-detection";
import { ISSUE_TYPE_LABELS } from "@/types/civic";
import { IssueType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  type: z.nativeEnum(IssueType),
  wardId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const duplicate = await findDuplicateIssue(parsed.data);

    if (!duplicate) {
      return NextResponse.json({
        data: {
          isDuplicate: false,
          duplicate: null,
          distanceMeters: null,
          matchRadiusMeters: null,
          recommendation: "No nearby duplicate found. You can submit a new report.",
        },
      });
    }

    const { issue, distanceMeters, matchRadiusMeters } = duplicate;

    return NextResponse.json({
      data: {
        isDuplicate: true,
        duplicate: {
          id: issue.id,
          title: issue.title,
          type: issue.type,
          typeLabel: ISSUE_TYPE_LABELS[issue.type],
          status: issue.status,
          reportCount: issue.reportCount,
          voteCount: issue.voteCount,
          distanceMeters: Math.round(distanceMeters),
          matchRadiusMeters,
        },
        distanceMeters: Math.round(distanceMeters),
        matchRadiusMeters,
        recommendation:
          "A similar issue was already reported nearby. Confirm if you've seen it too — no need to file a separate report.",
      },
    });
  } catch (error) {
    console.error("[duplicate-check]", error);
    return NextResponse.json({ error: "Duplicate check failed" }, { status: 500 });
  }
}
