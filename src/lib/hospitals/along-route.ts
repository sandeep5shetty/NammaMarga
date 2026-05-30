import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
import type { RouteCoordinate } from "@/lib/routing/emergency-route";
import type { HealthFacilityKind } from "@prisma/client";

/** Max distance from route polyline to show a facility (km). */
export const ALONG_ROUTE_BUFFER_KM = 0.4;

export type AlongRouteFacility = {
  id: string;
  name: string;
  kind: HealthFacilityKind;
  latitude: number;
  longitude: number;
  phone: string | null;
  address: string | null;
  briefInfo: string | null;
  hasIcu: boolean;
  hasBloodBank: boolean;
  hasEmergency: boolean;
  distanceFromRouteM: number;
  routeIds: string[];
};

function pointToSegmentDistanceKm(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  let min = Infinity;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const sLat = lat1 + t * (lat2 - lat1);
    const sLng = lng1 + t * (lng2 - lng1);
    const d = haversineDistance(
      { latitude: lat, longitude: lng },
      { latitude: sLat, longitude: sLng },
    );
    min = Math.min(min, d);
  }
  return min;
}

export function minDistanceToRouteKm(
  lat: number,
  lng: number,
  geometry: RouteCoordinate[],
): number {
  let min = Infinity;
  for (let i = 0; i < geometry.length - 1; i++) {
    const [lng1, lat1] = geometry[i];
    const [lng2, lat2] = geometry[i + 1];
    min = Math.min(min, pointToSegmentDistanceKm(lat, lng, lat1, lng1, lat2, lng2));
  }
  return min;
}

function corridorBounds(geometry: RouteCoordinate[], padDeg = 0.025) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lng, lat] of geometry) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return {
    minLat: minLat - padDeg,
    maxLat: maxLat + padDeg,
    minLng: minLng - padDeg,
    maxLng: maxLng + padDeg,
  };
}

export async function findAlongRouteFacilities(params: {
  routes: Array<{ id: string; geometry: RouteCoordinate[] }>;
  excludeHospitalId?: string;
  bufferKm?: number;
}): Promise<AlongRouteFacility[]> {
  const buffer = params.bufferKm ?? ALONG_ROUTE_BUFFER_KM;
  if (params.routes.length === 0) return [];

  const bounds = params.routes.reduce(
    (acc, r) => {
      const b = corridorBounds(r.geometry);
      return {
        minLat: Math.min(acc.minLat, b.minLat),
        maxLat: Math.max(acc.maxLat, b.maxLat),
        minLng: Math.min(acc.minLng, b.minLng),
        maxLng: Math.max(acc.maxLng, b.maxLng),
      };
    },
    { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity },
  );

  const facilities = await db.hospital.findMany({
    where: {
      latitude: { gte: bounds.minLat, lte: bounds.maxLat },
      longitude: { gte: bounds.minLng, lte: bounds.maxLng },
      ...(params.excludeHospitalId ? { id: { not: params.excludeHospitalId } } : {}),
    },
    select: {
      id: true,
      name: true,
      kind: true,
      latitude: true,
      longitude: true,
      phone: true,
      address: true,
      briefInfo: true,
      hasIcu: true,
      hasBloodBank: true,
      hasEmergency: true,
    },
  });

  const byId = new Map<string, AlongRouteFacility>();

  for (const f of facilities) {
    const routeIds: string[] = [];
    let minDistKm = Infinity;

    for (const route of params.routes) {
      const d = minDistanceToRouteKm(f.latitude, f.longitude, route.geometry);
      if (d <= buffer) {
        routeIds.push(route.id);
        minDistKm = Math.min(minDistKm, d);
      }
    }

    if (routeIds.length === 0) continue;

    byId.set(f.id, {
      id: f.id,
      name: f.name,
      kind: f.kind,
      latitude: f.latitude,
      longitude: f.longitude,
      phone: f.phone,
      address: f.address,
      briefInfo: f.briefInfo,
      hasIcu: f.hasIcu,
      hasBloodBank: f.hasBloodBank,
      hasEmergency: f.hasEmergency,
      distanceFromRouteM: Math.round(minDistKm * 1000),
      routeIds,
    });
  }

  return [...byId.values()].sort((a, b) => a.distanceFromRouteM - b.distanceFromRouteM);
}
