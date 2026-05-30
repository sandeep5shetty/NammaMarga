import { classifyIssue } from "@/lib/ai";
import { classifyRequestSchema } from "@/lib/ai/schemas";
import { detectWithRoboflow } from "@/lib/ai/roboflow";
import { getAuthUser } from "@/lib/auth/get-user";
import { withRateLimit } from "@/lib/api/middleware-helpers";
import { isReportableIssueType } from "@/lib/issues/reportable-types";
import { ISSUE_TYPE_LABELS } from "@/types/civic";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = withRateLimit(request, user.id, 15);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = classifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const roboflow = await detectWithRoboflow(parsed.data.imageUrl);

    if (roboflow && isReportableIssueType(roboflow.primaryType)) {
      return NextResponse.json({
        data: {
          accepted: true as const,
          type: roboflow.primaryType,
          severity: roboflow.severity,
          confidence: roboflow.confidence,
          title: `${ISSUE_TYPE_LABELS[roboflow.primaryType]} detected`,
          summary: `Roboflow detected ${roboflow.detections.length} object(s) with ${Math.round(roboflow.confidence * 100)}% confidence.`,
          reasoning: `YOLOv8 via Roboflow: ${roboflow.detections.map((d) => d.className).join(", ")}`,
          provider: "roboflow",
          raw: roboflow.raw,
        },
      });
    }

    const result = await classifyIssue(
      parsed.data.imageUrl,
      parsed.data.description,
    );

    if (!result.accepted) {
      return NextResponse.json({
        data: {
          accepted: false as const,
          reason: result.reason,
          summary: result.summary,
          provider: "openai",
        },
      });
    }

    return NextResponse.json({
      data: {
        accepted: true as const,
        type: result.type,
        severity: result.severity,
        confidence: result.confidence,
        title: result.title,
        summary: result.summary,
        reasoning: result.reasoning,
        provider: "openai",
      },
    });
  } catch (error) {
    console.error("[AI classify]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 },
    );
  }
}
