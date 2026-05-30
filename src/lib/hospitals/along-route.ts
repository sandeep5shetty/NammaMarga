import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
import type { RouteCoordinate } from "@/lib/routing/emergency-route";
import type { HealthFacilityKind, Prisma } from "@prisma/client";

/** Default max distance from route polyline (km). */
export const ALONG_ROUTE_BUFFER_KM = 1.5;

const WIDE_BUFFER_KM = 3;

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

const FACILITY_SELECT = {
  id: true,
  name: true,
  kind: true,
  latitude: true,
  longitude: true,
  phone: true,
  address: true,
  briefInfo: true,
  hasIcu: true,
  hasEmergency: true,
} as const;

type HospitalRow = {
  id: string;
  name: string;
  kind: HealthFacilityKind;
  latitude: number;
  longitude: number;
  phone: string | null;
  address: string | null;
  briefInfo: string | null;
  hasIcu: boolean;
  hasEmergency: boolean;
  hasBloodBank: boolean;
};

async function fetchHospitalsInBounds(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  excludeHospitalId?: string,
): Promise<HospitalRow[]> {
  const where: Prisma.HospitalWhereInput = {
    latitude: { gte: bounds.minLat, lte: bounds.maxLat },
    longitude: { gte: bounds.minLng, lte: bounds.maxLng },
    ...(excludeHospitalId ? { id: { not: excludeHospitalId } } : {}),
  };

  try {
    const rows = await db.hospital.findMany({
      where,
      select: { ...FACILITY_SELECT, hasBloodBank: true },
    });
    return rows;
  } catch {
    const rows = await db.hospital.findMany({ where, select: FACILITY_SELECT });
    return rows.map((r) => ({
      ...r,
      hasBloodBank: r.kind === "BLOOD_BANK",
    }));
  }
}

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

function corridorBounds(geometries: RouteCoordinate[][], padDeg = 0.06) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const geometry of geometries) {
    for (const [lng, lat] of geometry) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }
  return {
    minLat: minLat - padDeg,
    maxLat: maxLat + padDeg,
    minLng: minLng - padDeg,
    maxLng: maxLng + padDeg,
  };
}

function matchFacilitiesToRoutes(
  hospitals: HospitalRow[],
  routes: Array<{ id: string; geometry: RouteCoordinate[] }>,
  bufferKm: number,
): AlongRouteFacility[] {
  const byId = new Map<string, AlongRouteFacility>();

  for (const f of hospitals) {
    const routeIds: string[] = [];
    let minDistKm = Infinity;

    for (const route of routes) {
      const d = minDistanceToRouteKm(f.latitude, f.longitude, route.geometry);
      if (d <= bufferKm) {
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

export function filterFacilitiesForRoute(
  facilities: AlongRouteFacility[],
  routeId: string | null,
): AlongRouteFacility[] {
  if (!routeId) return facilities;
  return facilities.filter((f) => f.routeIds.includes(routeId));
}

export async function findAlongRouteFacilities(params: {
  routes: Array<{ id: string; geometry: RouteCoordinate[] }>;
  excludeHospitalId?: string;
  bufferKm?: number;
}): Promise<AlongRouteFacility[]> {
  if (params.routes.length === 0) return [];

  const geometries = params.routes.map((r) => r.geometry);
  const bounds = corridorBounds(geometries);
  const hospitals = await fetchHospitalsInBounds(bounds, params.excludeHospitalId);

  const buffer = params.bufferKm ?? ALONG_ROUTE_BUFFER_KM;
  let matched = matchFacilitiesToRoutes(hospitals, params.routes, buffer);

  if (matched.length === 0 && hospitals.length > 0) {
    matched = matchFacilitiesToRoutes(hospitals, params.routes, WIDE_BUFFER_KM);
  }

  return matched.slice(0, 24);
}
