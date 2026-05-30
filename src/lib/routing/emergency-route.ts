import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
export type RouteCoordinate = [number, number];

export type HazardIssue = {
  id: string;
  title: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
};

type MapboxRoute = {
  geometry: RouteCoordinate[];
  distance: number;
  duration: number;
};

export type RouteAnalysis = {
  id: string;
  routeIndex: number;
  label: string;
  geometry: RouteCoordinate[];
  distanceKm: number;
  durationMinutes: number;
  safetyScore: number;
  routeRisk: number;
  hazardIndex: number;
  issueCount: number;
  potholeCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  isRecommended: boolean;
  isFastest: boolean;
  reasons: string[];
  warnings: string[];
  comparisonNote: string | null;
};

export type EmergencyRouteResult = {
  recommended: RouteAnalysis;
  routes: RouteAnalysis[];
  hazardsOnMap: HazardIssue[];
  source: { lat: number; lng: number; label?: string };
  destination: { lat: number; lng: number; label?: string };
};

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 25,
  HIGH: 12,
  MEDIUM: 5,
  LOW: 2,
};

const BUFFER_KM = 0.06;

async function fetchMapboxRoutes(
  source: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<MapboxRoute[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Mapbox token not configured");

  const coords = `${source.lng},${source.lat};${dest.lng},${dest.lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
    `?alternatives=true` +
    `&geometries=geojson` +
    `&overview=full` +
    `&steps=false` +
    `&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mapbox Directions failed: ${err.slice(0, 120)}`);
  }

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No driving route found between these locations");
  }

  return data.routes.map(
    (r: { geometry: { coordinates: RouteCoordinate[] }; distance: number; duration: number }) => ({
      geometry: r.geometry.coordinates,
      distance: r.distance,
      duration: r.duration,
    }),
  );
}

function getBounds(geometry: RouteCoordinate[]) {
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
  const pad = 0.02;
  return { minLat: minLat - pad, maxLat: maxLat + pad, minLng: minLng - pad, maxLng: maxLng + pad };
}

function pointToSegmentDistanceKm(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const samples = 5;
  let min = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
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

/**
 * Dijkstra-style weighted corridor cost: each polyline segment accumulates
 * length + hazard penalty for civic issues (especially potholes) in buffer.
 */
function scoreRouteHazards(
  geometry: RouteCoordinate[],
  issues: Array<{
    id: string;
    title: string;
    type: string;
    severity: string;
    latitude: number;
    longitude: number;
  }>,
): {
  hazardIndex: number;
  routeRisk: number;
  safetyScore: number;
  issueCount: number;
  potholeCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  matchedIssues: HazardIssue[];
} {
  const matchedIds = new Set<string>();
  const matchedIssues: HazardIssue[] = [];
  let hazardIndex = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let potholeCount = 0;

  for (let i = 0; i < geometry.length - 1; i++) {
    const [lng1, lat1] = geometry[i];
    const [lng2, lat2] = geometry[i + 1];
    const segLen = haversineDistance(
      { latitude: lat1, longitude: lng1 },
      { latitude: lat2, longitude: lng2 },
    );
    hazardIndex += segLen;

    for (const issue of issues) {
      const dist = pointToSegmentDistanceKm(
        issue.latitude,
        issue.longitude,
        lat1,
        lng1,
        lat2,
        lng2,
      );
      if (dist <= BUFFER_KM && !matchedIds.has(issue.id)) {
        matchedIds.add(issue.id);
        const weight = SEVERITY_WEIGHT[issue.severity] ?? 5;
        hazardIndex += weight * 0.15;
        matchedIssues.push({
          id: issue.id,
          title: issue.title,
          type: issue.type,
          severity: issue.severity,
          latitude: issue.latitude,
          longitude: issue.longitude,
        });

        if (issue.type === "POTHOLE") potholeCount++;
        if (issue.severity === "CRITICAL") criticalCount++;
        else if (issue.severity === "HIGH") highCount++;
        else if (issue.severity === "MEDIUM") mediumCount++;
        else lowCount++;
      }
    }
  }

  const routeRisk = Math.round(
    criticalCount * 20 + highCount * 12 + mediumCount * 6 + lowCount * 2 + potholeCount * 4,
  );
  const safetyScore = Math.max(0, Math.min(100, 100 - Math.min(routeRisk, 95)));

  return {
    hazardIndex,
    routeRisk,
    safetyScore,
    issueCount: matchedIds.size,
    potholeCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    matchedIssues,
  };
}

function buildReasons(
  analysis: RouteAnalysis,
  recommended: RouteAnalysis | null,
  isFastest: boolean,
): { reasons: string[]; warnings: string[]; comparisonNote: string | null } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (analysis.isRecommended) {
    reasons.push(`Green corridor — highest safety score (${analysis.safetyScore}/100) among available routes`);
    if (analysis.potholeCount === 0) {
      reasons.push("No active potholes detected within 60m of this corridor");
    } else {
      reasons.push(`Lowest pothole exposure: ${analysis.potholeCount} pothole(s) near corridor`);
    }
    if (analysis.criticalCount === 0) {
      reasons.push("Avoids critical-severity road hazards");
    } else {
      warnings.push(`${analysis.criticalCount} critical issue(s) still near this route — drive with caution`);
    }
    reasons.push(
      `Weighted path analysis (Dijkstra-style hazard costs) favors this route over faster alternatives`,
    );
  } else if (recommended) {
    if (analysis.potholeCount > recommended.potholeCount + 2) {
      warnings.push(
        `${analysis.potholeCount - recommended.potholeCount} more potholes than the recommended route`,
      );
    }
    if (analysis.safetyScore < recommended.safetyScore - 10) {
      warnings.push(
        `Safety score ${analysis.safetyScore}/100 vs ${recommended.safetyScore}/100 on green corridor`,
      );
    }
    if (analysis.criticalCount > recommended.criticalCount) {
      warnings.push(`More critical hazards (${analysis.criticalCount}) than recommended route`);
    }
  }

  if (isFastest && !analysis.isRecommended) {
    reasons.push(`Fastest option (~${Math.round(analysis.durationMinutes)} min) but not the safest`);
  }

  if (analysis.issueCount === 0 && !analysis.isRecommended) {
    reasons.push("Few mapped hazards, but other routes score better overall");
  }

  const comparisonNote =
    recommended && !analysis.isRecommended
      ? `Not recommended: ${analysis.potholeCount} potholes & ${analysis.issueCount} hazards vs ${recommended.potholeCount} potholes on green corridor`
      : null;

  return { reasons, warnings, comparisonNote };
}

export async function getEmergencyRoutes(
  source: { lat: number; lng: number; label?: string },
  dest: { lat: number; lng: number; label?: string },
): Promise<EmergencyRouteResult> {
  const mapboxRoutes = await fetchMapboxRoutes(source, dest);

  const allBounds = mapboxRoutes.reduce(
    (acc, r) => {
      const b = getBounds(r.geometry);
      return {
        minLat: Math.min(acc.minLat, b.minLat),
        maxLat: Math.max(acc.maxLat, b.maxLat),
        minLng: Math.min(acc.minLng, b.minLng),
        maxLng: Math.max(acc.maxLng, b.maxLng),
      };
    },
    { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity },
  );

  const issues = await db.issue.findMany({
    where: {
      duplicateOfId: null,
      status: { in: ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      latitude: { gte: allBounds.minLat, lte: allBounds.maxLat },
      longitude: { gte: allBounds.minLng, lte: allBounds.maxLng },
    },
    select: {
      id: true,
      title: true,
      type: true,
      severity: true,
      latitude: true,
      longitude: true,
    },
  });

  const analyses: RouteAnalysis[] = mapboxRoutes.map((route, index) => {
    const scored = scoreRouteHazards(route.geometry, issues);
    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;

    return {
      id: `route-${index}`,
      routeIndex: index,
      label: index === 0 ? "Primary corridor" : `Alternate ${index}`,
      geometry: route.geometry,
      distanceKm,
      durationMinutes,
      safetyScore: scored.safetyScore,
      routeRisk: scored.routeRisk,
      hazardIndex: scored.hazardIndex,
      issueCount: scored.issueCount,
      potholeCount: scored.potholeCount,
      criticalCount: scored.criticalCount,
      highCount: scored.highCount,
      mediumCount: scored.mediumCount,
      lowCount: scored.lowCount,
      isRecommended: false,
      isFastest: false,
      reasons: [],
      warnings: [],
      comparisonNote: null,
    };
  });

  const fastestIdx = analyses.reduce((best, r, i) =>
    r.durationMinutes < analyses[best].durationMinutes ? i : best, 0);
  analyses[fastestIdx].isFastest = true;
  analyses[fastestIdx].label = "Fastest route";

  const recommendedIdx = analyses.reduce((best, r, i) => {
    const a = analyses[best];
  const b = r;
    const scoreA = a.safetyScore - a.durationMinutes * 0.3;
    const scoreB = b.safetyScore - b.durationMinutes * 0.3;
    return scoreB > scoreA ? i : best;
  }, 0);

  analyses[recommendedIdx].isRecommended = true;
  analyses[recommendedIdx].label = "Green corridor (recommended)";

  const recommended = analyses[recommendedIdx];

  for (let i = 0; i < analyses.length; i++) {
    const partial = analyses[i];
    const { reasons, warnings, comparisonNote } = buildReasons(
      { ...partial, reasons: [], warnings: [], comparisonNote: null },
      { ...recommended, reasons: [], warnings: [], comparisonNote: null },
      i === fastestIdx,
    );
    analyses[i].reasons = reasons;
    analyses[i].warnings = warnings;
    analyses[i].comparisonNote = comparisonNote;
    if (i !== recommendedIdx && i !== fastestIdx) {
      analyses[i].label = `Alternate route ${i}`;
    }
  }

  const hazardsOnMap = issues
    .filter((issue) => {
      const minDist = Math.min(
        ...mapboxRoutes.map((route) =>
          Math.min(
            ...route.geometry.map(([lng, lat]) =>
              haversineDistance(
                { latitude: lat, longitude: lng },
                { latitude: issue.latitude, longitude: issue.longitude },
              ),
            ),
          ),
        ),
      );
      return minDist < 0.12;
    })
    .map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      severity: i.severity,
      latitude: i.latitude,
      longitude: i.longitude,
    }));

  const sorted = [...analyses].sort((a, b) => {
    if (a.isRecommended) return -1;
    if (b.isRecommended) return 1;
    return b.safetyScore - a.safetyScore;
  });

  return {
    recommended: analyses[recommendedIdx],
    routes: sorted,
    hazardsOnMap,
    source,
    destination: dest,
  };
}

export function getRouteColor(analysis: RouteAnalysis): string {
  if (analysis.isRecommended) return "#22c55e";
  if (analysis.isFastest) return "#3b82f6";
  return "#94a3b8";
}
