import type { AlongRouteFacility } from "@/lib/hospitals/along-route";
import { minDistanceToRouteKm } from "@/lib/hospitals/along-route";
import type { RouteCoordinate } from "@/lib/routing/emergency-route";
import type { MapsLatLng } from "@/lib/routing/google-maps-directions";

export type RouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  kind: AlongRouteFacility["kind"];
};

/** Max intermediate stops for Google Maps directions URLs. */
export const MAX_ROUTE_STOPS = 8;

export function facilityToRouteStop(f: AlongRouteFacility): RouteStop {
  return {
    id: f.id,
    name: f.name,
    latitude: f.latitude,
    longitude: f.longitude,
    address: f.address,
    kind: f.kind,
  };
}

export function routeStopToMapsLatLng(stop: RouteStop): MapsLatLng {
  return {
    latitude: stop.latitude,
    longitude: stop.longitude,
    label: stop.name,
    address: stop.address ?? undefined,
  };
}

function projectOnSegment(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { t: number; distKm: number } {
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) {
    const dLat = lat - lat1;
    const dLng = lng - lng1;
    return { t: 0, distKm: Math.sqrt(dLat * dLat + dLng * dLng) * 111 };
  }
  let t = ((lng - lng1) * dx + (lat - lat1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const pLat = lat1 + t * dy;
  const pLng = lng1 + t * dx;
  const dLat = lat - pLat;
  const dLng = lng - pLng;
  return { t, distKm: Math.sqrt(dLat * dLat + dLng * dLng) * 111 };
}

/** 0 = route start, 1 = route end — used to order Google Maps waypoints. */
export function positionAlongRoute(
  latitude: number,
  longitude: number,
  geometry: RouteCoordinate[],
): number {
  if (geometry.length < 2) return 0;

  let bestScore = Infinity;
  const segments = geometry.length - 1;

  for (let i = 0; i < segments; i++) {
    const [lng1, lat1] = geometry[i];
    const [lng2, lat2] = geometry[i + 1];
    const { t, distKm } = projectOnSegment(latitude, longitude, lat1, lng1, lat2, lng2);
    const score = i + t + distKm * 0.01;
    if (score < bestScore) bestScore = score;
  }

  return bestScore / segments;
}

export function sortStopsAlongRoute(
  stops: RouteStop[],
  geometry: RouteCoordinate[],
): RouteStop[] {
  if (geometry.length < 2) return stops;
  return [...stops].sort(
    (a, b) =>
      positionAlongRoute(a.latitude, a.longitude, geometry) -
      positionAlongRoute(b.latitude, b.longitude, geometry),
  );
}

export function sortMapsWaypointsAlongRoute(
  waypoints: MapsLatLng[],
  geometry: RouteCoordinate[],
): MapsLatLng[] {
  if (geometry.length < 2) return waypoints;
  return [...waypoints].sort(
    (a, b) =>
      positionAlongRoute(a.latitude, a.longitude, geometry) -
      positionAlongRoute(b.latitude, b.longitude, geometry),
  );
}

/** Drop stops that drifted off the active corridor when the user switches routes. */
export function filterStopsForRoute(
  stops: RouteStop[],
  geometry: RouteCoordinate[],
  bufferKm = 2,
): RouteStop[] {
  if (geometry.length < 2) return stops;
  return stops.filter(
    (s) => minDistanceToRouteKm(s.latitude, s.longitude, geometry) <= bufferKm,
  );
}
