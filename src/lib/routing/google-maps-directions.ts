import { haversineDistance } from "@/lib/geo/haversine";
import { minDistanceToRouteKm } from "@/lib/hospitals/along-route";
import type { RouteCoordinate } from "@/lib/routing/emergency-route";
import { sortMapsWaypointsAlongRoute } from "@/lib/routing/route-stops";

export type MapsLatLng = {
  latitude: number;
  longitude: number;
  label?: string;
  address?: string;
};

/**
 * Keep few stops — Google Maps reverse-geocodes raw coordinates to random
 * nearby businesses when there are too many waypoints.
 */
const MAX_INTERMEDIATE_STOPS = 3;

/** Shape anchors along the selected route only (no healthcare). */
const CORRIDOR_ANCHOR_COUNT = 2;

const ROUTE_STOP_BUFFER_KM = 1.5;

const MIN_ENDPOINT_SEPARATION_KM = 0.35;

function normalizeCoordinates(latitude: number, longitude: number): {
  latitude: number;
  longitude: number;
} {
  let lat = latitude;
  let lng = longitude;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { latitude: lat, longitude: lng };
  }

  if (lat >= 70 && lat <= 85 && lng >= 8 && lng <= 25) {
    return { latitude: lng, longitude: lat };
  }

  return { latitude: lat, longitude: lng };
}

function formatCoordinatePair(latitude: number, longitude: number): string {
  const { latitude: lat, longitude: lng } = normalizeCoordinates(latitude, longitude);
  return `${lat.toFixed(7)},${lng.toFixed(7)}`;
}

function coordKey(p: MapsLatLng): string {
  return formatCoordinatePair(p.latitude, p.longitude);
}

function normalizePoint(p: MapsLatLng): MapsLatLng {
  const { latitude, longitude } = normalizeCoordinates(p.latitude, p.longitude);
  return { ...p, latitude, longitude };
}

function pointKm(a: MapsLatLng, b: MapsLatLng): number {
  return haversineDistance(
    { latitude: a.latitude, longitude: a.longitude },
    { latitude: b.latitude, longitude: b.longitude },
  );
}

/** Avoid waypoints that snap to origin/destination neighbourhoods in Google Maps. */
function isAwayFromEndpoints(
  p: MapsLatLng,
  origin: MapsLatLng,
  destination: MapsLatLng,
): boolean {
  return (
    pointKm(p, origin) >= MIN_ENDPOINT_SEPARATION_KM &&
    pointKm(p, destination) >= MIN_ENDPOINT_SEPARATION_KM
  );
}

/**
 * Two interior anchors on this route's polyline (differs per Mapbox alternative).
 */
function sampleCorridorAnchors(geometry: RouteCoordinate[]): MapsLatLng[] {
  if (geometry.length < 2) return [];

  const last = geometry.length - 1;
  const fractions = CORRIDOR_ANCHOR_COUNT === 2 ? [0.38, 0.62] : [0.5];

  return fractions.map((fraction) => {
    const idx = Math.min(Math.round(fraction * last), last);
    const [lng, lat] = geometry[idx];
    return { latitude: lat, longitude: lng };
  });
}

/** @deprecated Use sampleCorridorAnchors — kept for imports */
export function sampleRouteWaypoints(
  geometry: RouteCoordinate[],
  maxPoints = CORRIDOR_ANCHOR_COUNT,
): MapsLatLng[] {
  return sampleCorridorAnchors(geometry).slice(0, maxPoints);
}

function filterUserStopsForGeometry(
  userStops: MapsLatLng[] | undefined,
  geometry: RouteCoordinate[],
): MapsLatLng[] {
  if (!userStops?.length || geometry.length < 2) return [];

  return userStops
    .map(normalizePoint)
    .filter(
      (s) => minDistanceToRouteKm(s.latitude, s.longitude, geometry) <= ROUTE_STOP_BUFFER_KM,
    );
}

/** Named place for healthcare; raw coordinates for corridor anchors only. */
function formatWaypointForUrl(p: MapsLatLng): string {
  if (p.label && p.address) {
    return `${p.label}, ${p.address}`;
  }
  if (p.label) {
    return `${p.label}, Bengaluru, Karnataka, India`;
  }
  return coordKey(p);
}

/**
 * Waypoints for exactly one route (green corridor OR alternate — never combined).
 */
function buildWaypoints(
  userStops: MapsLatLng[] | undefined,
  geometry: RouteCoordinate[] | undefined,
  origin: MapsLatLng,
  destination: MapsLatLng,
): MapsLatLng[] {
  if (!geometry?.length || geometry.length < 2) {
    return [];
  }

  const onThisRoute = filterUserStopsForGeometry(userStops, geometry);

  // Healthcare stops the user added on this route only
  if (onThisRoute.length > 0) {
    return sortMapsWaypointsAlongRoute(onThisRoute, geometry).slice(0, MAX_INTERMEDIATE_STOPS);
  }

  // No healthcare on this route — two shape anchors from this polyline only
  return sampleCorridorAnchors(geometry)
    .map(normalizePoint)
    .filter((p) => isAwayFromEndpoints(p, origin, destination))
    .slice(0, CORRIDOR_ANCHOR_COUNT);
}

export type GoogleMapsDirectionsParams = {
  origin: MapsLatLng;
  destination: MapsLatLng;
  geometry?: RouteCoordinate[];
  userStops?: MapsLatLng[];
  navigate?: boolean;
};

/**
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(params: GoogleMapsDirectionsParams): string {
  const { origin, destination, geometry, userStops, navigate = false } = params;

  const originNorm = normalizePoint(origin);
  const destNorm = normalizePoint(destination);
  const waypoints = buildWaypoints(userStops, geometry, originNorm, destNorm);

  const parts = [
    "api=1",
    `origin=${encodeURIComponent(coordKey(originNorm))}`,
    `destination=${encodeURIComponent(coordKey(destNorm))}`,
    "travelmode=driving",
  ];

  if (navigate) {
    parts.push("dir_action=navigate");
  }

  if (waypoints.length > 0) {
    const wp = waypoints.map((p) => encodeURIComponent(formatWaypointForUrl(p))).join("%7C");
    parts.push(`waypoints=${wp}`);
  }

  return `https://www.google.com/maps/dir/?${parts.join("&")}`;
}

export function countUserStopsOnRoute(
  userStops: MapsLatLng[] | undefined,
  geometry: RouteCoordinate[] | undefined,
): number {
  if (!geometry?.length) return 0;
  return Math.min(
    filterUserStopsForGeometry(userStops, geometry).length,
    MAX_INTERMEDIATE_STOPS,
  );
}
