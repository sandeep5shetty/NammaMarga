import { haversineDistance } from "@/lib/geo/haversine";
import { db } from "@/lib/prisma";
import type { IssueStatus } from "@prisma/client";

const VERIFY_STATUSES: IssueStatus[] = ["RESOLVED", "IN_PROGRESS"];
const DEFAULT_RADIUS_M = 5000;
const DEFAULT_LIMIT = 20;

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

export type PendingVerificationIssue = {
  id: string;
  title: string;
  type: string;
  status: IssueStatus;
  severity: string;
  imageUrl: string;
  afterImageUrl: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  resolvedAt: Date | null;
  updatedAt: Date;
  verificationCount: number;
  ward: { name: string; number: number } | null;
};

export async function findIssuesPendingVerification(params: {
  userId: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  limit?: number;
}): Promise<PendingVerificationIssue[]> {
  const radiusM = params.radiusMeters ?? DEFAULT_RADIUS_M;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const hasGeo =
    params.latitude != null &&
    params.longitude != null &&
    !Number.isNaN(params.latitude) &&
    !Number.isNaN(params.longitude);

  const box = hasGeo
    ? boundingBox(params.latitude!, params.longitude!, radiusM)
    : null;

  const candidates = await db.issue.findMany({
    where: {
      duplicateOfId: null,
      status: { in: VERIFY_STATUSES },
      verifications: { none: { verifierId: params.userId } },
      ...(box && {
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      }),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      severity: true,
      imageUrl: true,
      afterImageUrl: true,
      latitude: true,
      longitude: true,
      resolvedAt: true,
      updatedAt: true,
      ward: { select: { name: true, number: true } },
      _count: { select: { verifications: true } },
    },
    orderBy: [{ resolvedAt: "desc" }, { updatedAt: "desc" }],
    take: hasGeo ? 80 : limit,
  });

  const origin = hasGeo
    ? { latitude: params.latitude!, longitude: params.longitude! }
    : null;

  let withDistance = candidates.map((issue) => {
    const distanceMeters = origin
      ? haversineDistance(origin, {
          latitude: issue.latitude,
          longitude: issue.longitude,
        }) * 1000
      : null;
    return {
      id: issue.id,
      title: issue.title,
      type: issue.type,
      status: issue.status,
      severity: issue.severity,
      imageUrl: issue.imageUrl,
      afterImageUrl: issue.afterImageUrl,
      latitude: issue.latitude,
      longitude: issue.longitude,
      distanceMeters: distanceMeters != null ? Math.round(distanceMeters) : null,
      resolvedAt: issue.resolvedAt,
      updatedAt: issue.updatedAt,
      verificationCount: issue._count.verifications,
      ward: issue.ward,
    };
  });

  if (hasGeo) {
    withDistance = withDistance
      .filter((i) => i.distanceMeters != null && i.distanceMeters <= radiusM)
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }

  return withDistance.slice(0, limit);
}

export { DEFAULT_RADIUS_M, DEFAULT_LIMIT };
