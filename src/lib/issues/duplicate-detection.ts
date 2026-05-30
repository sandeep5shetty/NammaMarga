import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
import { resolveRoadSegmentId } from "@/lib/geo/road-segment";
import { refreshIssuePriority } from "@/lib/issues/issue-lifecycle";
import type { IssueStatus, IssueType } from "@prisma/client";

const CLOSED_STATUSES: IssueStatus[] = ["RESOLVED", "VERIFIED", "REJECTED", "MERGED"];

/** Max search radius (m) — used for bounding-box prefilter. */
const MAX_SEARCH_RADIUS_M = 150;

/** Type-specific duplicate match radius in meters. */
const DUPLICATE_RADIUS_BY_TYPE: Partial<Record<IssueType, number>> & { default: number } = {
  default: 50,
  POTHOLE: 50,
  ROAD_DAMAGE: 45,
  GARBAGE: 100,
  WATERLOGGING: 120,
  SEWAGE: 90,
  WATER_LEAK: 80,
  STREETLIGHT: 35,
  TRAFFIC_SIGNAL: 30,
  FALLEN_TREE: 75,
  OTHER: 60,
};

export type DuplicateCandidate = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  reportCount: number;
  voteCount: number;
  status: IssueStatus;
  type: IssueType;
  roadSegmentId: string | null;
  createdAt: Date;
};

export type DuplicateMatch = {
  issue: DuplicateCandidate;
  distanceMeters: number;
  matchRadiusMeters: number;
};

function getDuplicateRadiusM(type: IssueType): number {
  return DUPLICATE_RADIUS_BY_TYPE[type] ?? DUPLICATE_RADIUS_BY_TYPE.default;
}

/** Rough lat/lng delta for bounding-box prefilter (~150m at Bengaluru latitude). */
function boundingBox(lat: number, lng: number, radiusM: number) {
  const latDelta = radiusM / 111_000;
  const lngDelta = radiusM / (111_000 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

function scoreCandidate(
  candidate: DuplicateCandidate,
  distanceM: number,
  matchRadiusM: number,
  roadSegmentId: string | null | undefined,
): number {
  if (distanceM > matchRadiusM) return -1;

  let score = 1000 - distanceM;

  if (roadSegmentId && candidate.roadSegmentId === roadSegmentId) {
    score += 25;
  } else if (roadSegmentId && candidate.roadSegmentId && candidate.roadSegmentId !== roadSegmentId) {
    score -= 15;
  }

  const ageHours = (Date.now() - candidate.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < 24) score += 10;
  else if (ageHours < 168) score += 5;

  if (candidate.reportCount > 1) score += Math.min(candidate.reportCount * 2, 10);

  return score;
}

export async function findDuplicateIssue(params: {
  latitude: number;
  longitude: number;
  type: IssueType;
  wardId?: string | null;
}): Promise<DuplicateMatch | null> {
  const matchRadiusM = getDuplicateRadiusM(params.type);
  const searchRadiusM = Math.max(matchRadiusM, MAX_SEARCH_RADIUS_M);
  const box = boundingBox(params.latitude, params.longitude, searchRadiusM);

  const roadSegmentId = await resolveRoadSegmentId(
    params.latitude,
    params.longitude,
    params.wardId,
  );

  const candidates = await db.issue.findMany({
    where: {
      type: params.type,
      status: { notIn: CLOSED_STATUSES },
      duplicateOfId: null,
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      reportCount: true,
      voteCount: true,
      status: true,
      type: true,
      roadSegmentId: true,
      createdAt: true,
    },
  });

  let best: DuplicateMatch | null = null;
  let bestScore = -1;

  for (const issue of candidates) {
    const distanceM =
      haversineDistance(
        { latitude: params.latitude, longitude: params.longitude },
        { latitude: issue.latitude, longitude: issue.longitude },
      ) * 1000;

    const candidateScore = scoreCandidate(issue, distanceM, matchRadiusM, roadSegmentId);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      best = { issue, distanceMeters: distanceM, matchRadiusMeters: matchRadiusM };
    }
  }

  return best;
}

export type MergeResult = {
  issue: Awaited<ReturnType<typeof db.issue.update>>;
  merged: boolean;
  alreadyReported: boolean;
};

export async function mergeIntoExistingIssue(
  existingIssueId: string,
  reporterId: string,
  options?: { severityConfirmation?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" },
): Promise<MergeResult> {
  const existing = await db.issue.findUnique({
    where: { id: existingIssueId },
    select: { id: true, reporterId: true, reportCount: true },
  });

  if (!existing) {
    throw new Error("Issue not found");
  }

  const existingVote = await db.issueVote.findUnique({
    where: { issueId_userId: { issueId: existingIssueId, userId: reporterId } },
  });

  if (existingVote || existing.reporterId === reporterId) {
    const issue = await db.issue.findUnique({
      where: { id: existingIssueId },
      include: { ward: true },
    });
    return {
      issue: issue!,
      merged: true,
      alreadyReported: true,
    };
  }

  await db.issueVote.create({
    data: {
      issueId: existingIssueId,
      userId: reporterId,
      voteType: "UPVOTE",
      severityConfirmation: options?.severityConfirmation ?? undefined,
    },
  });

  const voteCount = await db.issueVote.count({ where: { issueId: existingIssueId } });

  await db.issue.update({
    where: { id: existingIssueId },
    data: {
      voteCount,
      reportCount: { increment: 1 },
    },
  });

  const issue = await refreshIssuePriority(existingIssueId);
  if (!issue) {
    throw new Error("Failed to refresh issue after merge");
  }

  await db.activityLog.create({
    data: {
      action: "DUPLICATE_MERGED",
      details: `Citizen report merged (upvote) from user ${reporterId}`,
      issueId: existingIssueId,
      userId: reporterId,
    },
  });

  const withWard = await db.issue.findUnique({
    where: { id: existingIssueId },
    include: { ward: true },
  });

  return {
    issue: withWard ?? issue,
    merged: true,
    alreadyReported: false,
  };
}
