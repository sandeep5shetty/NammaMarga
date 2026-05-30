import type { RouteCoordinate } from "@/lib/routing/emergency-route";

export type MapsLatLng = {
  latitude: number;
  longitude: number;
  label?: string;
};

/** Keep few stops — Google Maps handles 3–4 intermediate points reliably. */
const MAX_WAYPOINTS = 3;

function formatLatLng({ latitude, longitude }: MapsLatLng): string {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

/**
 * Sample a few interior points so Google Maps approximates the corridor
 * without overloading the directions UI.
 */
export function sampleRouteWaypoints(
  geometry: RouteCoordinate[],
  maxPoints = MAX_WAYPOINTS,
): MapsLatLng[] {
  if (geometry.length < 3 || maxPoints < 1) return [];

  const interior = geometry.slice(1, -1);
  if (interior.length === 0) return [];

  const step = Math.max(1, Math.floor(interior.length / maxPoints));
  const out: MapsLatLng[] = [];

  for (let i = 0; i < interior.length && out.length < maxPoints; i += step) {
    const [lng, lat] = interior[i];
    out.push({ latitude: lat, longitude: lng });
  }

  return out;
}

export type GoogleMapsDirectionsParams = {
  origin: MapsLatLng;
  destination: MapsLatLng;
  geometry?: RouteCoordinate[];
  navigate?: boolean;
};

/**
 * Build a Google Maps directions URL for the green corridor.
 * Uses plain lat,lng (no "via:" prefix — that breaks in the Maps app).
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(params: GoogleMapsDirectionsParams): string {
  const { origin, destination, geometry, navigate = true } = params;

  const search = new URLSearchParams({
    api: "1",
    origin: formatLatLng(origin),
    destination: formatLatLng(destination),
    travelmode: "driving",
  });

  if (navigate) {
    search.set("dir_action", "navigate");
  }

  const waypoints = geometry ? sampleRouteWaypoints(geometry) : [];
  if (waypoints.length > 0) {
    search.set("waypoints", waypoints.map((p) => formatLatLng(p)).join("|"));
  }

  return `https://www.google.com/maps/dir/?${search.toString()}`;
}
