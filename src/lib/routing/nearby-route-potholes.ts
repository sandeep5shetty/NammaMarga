import { minDistanceToRouteKm } from "@/lib/hospitals/along-route";
import type {
  CorridorHazard,
  HazardIssue,
  RouteAnalysis,
  RouteCoordinate,
} from "@/lib/routing/emergency-route";

/** Show potholes within this distance of the active route polyline. */
export const NEARBY_POTHOLE_RADIUS_KM = 1.5;

export function filterNearbyPotholesForRoute(
  hazards: CorridorHazard[],
  geometry: RouteCoordinate[] | undefined,
  radiusKm: number = NEARBY_POTHOLE_RADIUS_KM,
): CorridorHazard[] {
  if (!geometry?.length) return [];

  return hazards.filter((h) => {
    if (!h.isPothole) return false;
    return minDistanceToRouteKm(h.latitude, h.longitude, geometry) <= radiusKm;
  });
}

function toCorridorHazard(issue: HazardIssue, route: RouteAnalysis): CorridorHazard {
  return {
    ...issue,
    isPothole: issue.type === "POTHOLE",
    onRoutes: [route.id],
    onRecommendedRoute: route.isRecommended,
    onlyOnAlternates: !route.isRecommended,
    nearestRouteM: 0,
  };
}

/** Potholes to draw for the active route — radius filter + scored-on-route + corridor tags. */
export function getMapPotholesForRoute(
  corridorHazards: CorridorHazard[],
  route: RouteAnalysis | undefined,
  radiusKm: number = NEARBY_POTHOLE_RADIUS_KM,
): CorridorHazard[] {
  if (!route?.geometry?.length) return [];

  const byId = new Map<string, CorridorHazard>();

  for (const h of filterNearbyPotholesForRoute(corridorHazards, route.geometry, radiusKm)) {
    byId.set(h.id, h);
  }

  for (const h of corridorHazards) {
    if (!h.isPothole) continue;
    if (h.onRoutes.includes(route.id)) {
      byId.set(h.id, h);
    }
  }

  for (const issue of route.hazardsAlongRoute) {
    if (issue.type !== "POTHOLE") continue;
    byId.set(issue.id, toCorridorHazard(issue, route));
  }

  return [...byId.values()];
}

export function countNearbyPotholesForRoute(
  corridorHazards: CorridorHazard[],
  route: RouteAnalysis | undefined,
  radiusKm: number = NEARBY_POTHOLE_RADIUS_KM,
): number {
  return getMapPotholesForRoute(corridorHazards, route, radiusKm).length;
}
