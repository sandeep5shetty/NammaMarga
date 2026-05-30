import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";

function pointToSegmentDistanceKm(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const d1 = haversineDistance({ latitude: lat, longitude: lng }, { latitude: lat1, longitude: lng1 });
  const d2 = haversineDistance({ latitude: lat, longitude: lng }, { latitude: lat2, longitude: lng2 });
  const dMid = haversineDistance({ latitude: lat, longitude: lng }, { latitude: midLat, longitude: midLng });
  return Math.min(d1, d2, dMid);
}

export async function resolveRoadSegmentId(
  latitude: number,
  longitude: number,
  wardId?: string | null,
): Promise<string | null> {
  const segments = await db.roadSegment.findMany({
    where: wardId ? { wardId } : undefined,
  });

  if (!segments.length) {
    const all = await db.roadSegment.findMany();
    if (!all.length) return null;
    return findNearestSegment(latitude, longitude, all);
  }

  return findNearestSegment(latitude, longitude, segments);
}

function findNearestSegment(
  latitude: number,
  longitude: number,
  segments: Array<{
    id: string;
    latitudeStart: number;
    longitudeStart: number;
    latitudeEnd: number;
    longitudeEnd: number;
  }>,
): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const seg of segments) {
    const dist = pointToSegmentDistanceKm(
      latitude,
      longitude,
      seg.latitudeStart,
      seg.longitudeStart,
      seg.latitudeEnd,
      seg.longitudeEnd,
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestId = seg.id;
    }
  }

  return bestDist < 0.5 ? bestId : bestId;
}
