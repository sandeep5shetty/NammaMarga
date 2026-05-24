import type { GeoPoint } from "@/types/civic";

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function isWithinRadius(
  a: GeoPoint,
  b: GeoPoint,
  radiusMeters: number,
): boolean {
  return haversineDistance(a, b) * 1000 <= radiusMeters;
}

export function isWithinGeoFence(
  userLocation: GeoPoint,
  issueLocation: GeoPoint,
  radiusMeters = 100,
): boolean {
  return isWithinRadius(userLocation, issueLocation, radiusMeters);
}
