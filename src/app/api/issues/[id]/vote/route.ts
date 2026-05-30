import { getAuthUser } from "@/lib/auth/get-user";
import { refreshIssuePriority } from "@/lib/issues/issue-lifecycle";
import { db } from "@/lib/prisma";
import { Severity, VoteType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  voteType: z.nativeEnum(VoteType).optional(),
  severityConfirmation: z.nativeEnum(Severity).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let voteType: VoteType = "UPVOTE";
    let severityConfirmation: Severity | undefined;
    try {
      const body = await request.json();
      const parsed = schema.safeParse(body);
      if (parsed.success) {
        voteType = parsed.data.voteType ?? "UPVOTE";
        severityConfirmation = parsed.data.severityConfirmation;
      }
    } catch {
      // empty body = upvote only
    }

    await db.issueVote.upsert({
      where: { issueId_userId: { issueId: id, userId: user.id } },
      create: {
        issueId: id,
        userId: user.id,
        voteType,
        severityConfirmation,
      },
      update: { voteType, severityConfirmation },
    });

    const voteCount = await db.issueVote.count({ where: { issueId: id } });

    await db.issue.update({
      where: { id },
      data: { voteCount },
    });

    const issue = await refreshIssuePriority(id);

    await db.user.update({
      where: { id: user.id },
      data: { reputation: { increment: 2 } },
    });

    return NextResponse.json({ data: issue });
  } catch (error) {
    console.error("[vote]", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
