import { getAuthUser } from "@/lib/auth/get-user";
import { mergeIntoExistingIssue } from "@/lib/issues/duplicate-detection";
import { notifyIssueUpdate } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const mergeResult = await mergeIntoExistingIssue(id, user.id);

    if (!mergeResult.alreadyReported) {
      await notifyIssueUpdate(
        user.id,
        mergeResult.issue.id,
        "Report confirmed",
        "Thanks for confirming you also saw this issue nearby.",
      );
    }

    return NextResponse.json({
      data: mergeResult.issue,
      alreadyReported: mergeResult.alreadyReported,
    });
  } catch (error) {
    console.error("[also-seen]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm" },
      { status: 500 },
    );
  }
}
