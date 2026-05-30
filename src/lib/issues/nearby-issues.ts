import { haversineDistance } from "@/lib/geo/haversine";
import { db } from "@/lib/prisma";
import type { IssueStatus } from "@prisma/client";

const ACTIVE_STATUSES: IssueStatus[] = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS"];

const DEFAULT_RADIUS_M = 2000;
const DEFAULT_LIMIT = 12;

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

export type NearbyIssueResult = {
  id: string;
  title: string;
  type: string;
  status: IssueStatus;
  severity: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  voteCount: number;
  reportCount: number;
  distanceMeters: number;
  createdAt: Date;
  ward: { name: string; number: number } | null;
  userHasConfirmed: boolean;
};

export async function findNearbyIssues(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
  userId?: string;
}): Promise<NearbyIssueResult[]> {
  const radiusM = params.radiusMeters ?? DEFAULT_RADIUS_M;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const box = boundingBox(params.latitude, params.longitude, radiusM);

  const candidates = await db.issue.findMany({
    where: {
      duplicateOfId: null,
      status: { in: ACTIVE_STATUSES },
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      severity: true,
      imageUrl: true,
      latitude: true,
      longitude: true,
      voteCount: true,
      reportCount: true,
      createdAt: true,
      reporterId: true,
      ward: { select: { name: true, number: true } },
    },
    take: 80,
  });

  const origin = { latitude: params.latitude, longitude: params.longitude };

  let withDistance = candidates
    .map((issue) => ({
      ...issue,
      distanceMeters:
        haversineDistance(origin, {
          latitude: issue.latitude,
          longitude: issue.longitude,
        }) * 1000,
    }))
    .filter((issue) => issue.distanceMeters <= radiusM)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);

  let confirmedIds = new Set<string>();
  if (params.userId && withDistance.length > 0) {
    const votes = await db.issueVote.findMany({
      where: {
        userId: params.userId,
        issueId: { in: withDistance.map((i) => i.id) },
      },
      select: { issueId: true },
    });
    confirmedIds = new Set(votes.map((v) => v.issueId));
  }

  return withDistance.map((issue) => ({
    id: issue.id,
    title: issue.title,
    type: issue.type,
    status: issue.status,
    severity: issue.severity,
    imageUrl: issue.imageUrl,
    latitude: issue.latitude,
    longitude: issue.longitude,
    voteCount: issue.voteCount,
    reportCount: issue.reportCount,
    distanceMeters: Math.round(issue.distanceMeters),
    createdAt: issue.createdAt,
    ward: issue.ward,
    userHasConfirmed:
      confirmedIds.has(issue.id) ||
      (!!params.userId && issue.reporterId === params.userId),
  }));
}

export { DEFAULT_RADIUS_M, DEFAULT_LIMIT };
