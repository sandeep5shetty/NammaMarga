import type { RouteCoordinate } from "@/lib/routing/emergency-route";

export const DEMO_CORRIDOR_ISSUE_PREFIX = "demo-corridor-";

type DemoIssueRow = {
  id: string;
  title: string;
  type: "POTHOLE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  latitude: number;
  longitude: number;
  priorityScore: number;
};

/**
 * Place demo potholes along each Mapbox leg — sparse on the recommended leg,
 * dense on alternates so the green corridor wins on safety score.
 */
export function injectDemoCorridorIssues<T extends DemoIssueRow>(
  mapboxRoutes: Array<{ geometry: RouteCoordinate[] }>,
  existing: T[],
  recommendedRouteIndex = 0,
): T[] {
  if (mapboxRoutes.length === 0) return existing;

  const demos: DemoIssueRow[] = [];

  mapboxRoutes.forEach((route, routeIndex) => {
    const geom = route.geometry;
    if (geom.length < 6) return;

    const isRecommendedLeg = routeIndex === recommendedRouteIndex;
    const potholeCount = isRecommendedLeg ? 2 : 5 + routeIndex * 2;
    const severities: DemoIssueRow["severity"][] = isRecommendedLeg
      ? ["LOW", "MEDIUM"]
      : ["HIGH", "HIGH", "CRITICAL", "HIGH", "MEDIUM", "CRITICAL", "HIGH", "HIGH"];

    const step = Math.max(1, Math.floor(geom.length / (potholeCount + 2)));

    for (let n = 0; n < potholeCount; n++) {
      const idx = Math.min(geom.length - 2, step * (n + 1));
      const [lng, lat] = geom[idx];
      const offset = (n % 2 === 0 ? 1 : -1) * 0.00035 * (routeIndex + 1);
      const severity = severities[n % severities.length] ?? "HIGH";

      demos.push({
        id: `${DEMO_CORRIDOR_ISSUE_PREFIX}${routeIndex}-${n}`,
        title: isRecommendedLeg
          ? `[Demo] Minor surface crack`
          : `[Demo] Pothole cluster — high-risk leg ${routeIndex + 1}`,
        type: "POTHOLE",
        severity,
        latitude: lat + offset,
        longitude: lng + offset,
        priorityScore: severity === "CRITICAL" ? 92 : severity === "HIGH" ? 78 : 55,
      });
    }
  });

  return [...existing, ...(demos as T[])];
}

export function isDemoCorridorIssue(id: string): boolean {
  return id.startsWith(DEMO_CORRIDOR_ISSUE_PREFIX);
}
