import { findDuplicateIssue } from "@/lib/issues/duplicate-detection";
import { IssueType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  type: z.nativeEnum(IssueType),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const duplicate = await findDuplicateIssue(parsed.data);

    return NextResponse.json({
      data: {
        isDuplicate: !!duplicate,
        duplicate: duplicate?.issue ?? null,
        distanceMeters: duplicate?.distanceMeters ?? null,
        recommendation: duplicate
          ? "Upvote the existing issue instead of creating a duplicate."
          : "No nearby duplicate found.",
      },
    });
  } catch (error) {
    console.error("[duplicate-check]", error);
    return NextResponse.json({ error: "Duplicate check failed" }, { status: 500 });
  }
}
