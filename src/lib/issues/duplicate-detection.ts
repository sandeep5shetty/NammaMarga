import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
import type { IssueType } from "@prisma/client";

const DUPLICATE_RADIUS_METERS = 50;

export async function findDuplicateIssue(params: {
  latitude: number;
  longitude: number;
  type: IssueType;
}) {
  const candidates = await db.issue.findMany({
    where: {
      type: params.type,
      status: { notIn: ["VERIFIED", "REJECTED", "MERGED"] },
      duplicateOfId: null,
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      title: true,
      reportCount: true,
    },
  });

  for (const issue of candidates) {
    const distanceM =
      haversineDistance(
        { latitude: params.latitude, longitude: params.longitude },
        { latitude: issue.latitude, longitude: issue.longitude },
      ) * 1000;

    if (distanceM <= DUPLICATE_RADIUS_METERS) {
      return { issue, distanceMeters: distanceM };
    }
  }

  return null;
}

export async function mergeIntoExistingIssue(
  existingIssueId: string,
  reporterId: string,
) {
  const issue = await db.issue.update({
    where: { id: existingIssueId },
    data: { reportCount: { increment: 1 } },
  });

  await db.activityLog.create({
    data: {
      action: "DUPLICATE_MERGED",
      details: `Report merged from citizen ${reporterId}`,
      issueId: existingIssueId,
      userId: reporterId,
    },
  });

  return issue;
}
