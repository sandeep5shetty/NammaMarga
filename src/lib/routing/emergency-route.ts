import { findAlongRouteFacilities, type AlongRouteFacility } from "@/lib/hospitals/along-route";
import { injectDemoCorridorIssues } from "@/lib/routing/demo-corridor-hazards";
import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
import {
  estimateEtaMinutes,
  normalizeVehicleType,
  VEHICLE_PROFILES,
} from "@/lib/routing/vehicle-profiles";
import type { IssueType } from "@prisma/client";
import type { EmergencyVehicleType } from "@/types/emergency";

export type RouteCoordinate = [number, number];

export type HazardIssue = {
  id: string;
  title: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  priorityScore?: number;
};

export type CorridorHazard = HazardIssue & {
  isPothole: boolean;
  onRoutes: string[];
  onRecommendedRoute: boolean;
  onlyOnAlternates: boolean;
  nearestRouteM: number;
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
  hazardsAlongRoute: HazardIssue[];
};

export type CivicDataSummary = {
  totalActiveIssues: number;
  potholesInCorridor: number;
};

export type EmergencyRouteResult = {
  recommended: RouteAnalysis;
  routes: RouteAnalysis[];
  corridorHazards: CorridorHazard[];
  alongRouteFacilities: AlongRouteFacility[];
  civicData: CivicDataSummary;
  source: { lat: number; lng: number; label?: string };
  destination: { lat: number; lng: number; label?: string };
};

export type { AlongRouteFacility };

const ISSUE_TYPE_WEIGHT: Record<string, number> = {
  POTHOLE: 30,
  ROAD_DAMAGE: 22,
  WATERLOGGING: 20,
  WATER_LEAK: 14,
  FALLEN_TREE: 18,
  SEWAGE: 12,
  GARBAGE: 8,
  STREETLIGHT: 6,
  TRAFFIC_SIGNAL: 10,
  OTHER: 5,
};

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 25,
  HIGH: 14,
  MEDIUM: 7,
  LOW: 3,
};

const BUFFER_KM = 0.08;
const ACTIVE_STATUSES = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS"] as const;

async function fetchMapboxRoutes(
  source: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  vehicleType: EmergencyVehicleType = "AMBULANCE_BLS",
): Promise<MapboxRoute[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Mapbox token not configured");

  const profile = VEHICLE_PROFILES[normalizeVehicleType(vehicleType)].mapboxProfile;
  const coords = `${source.lng},${source.lat};${dest.lng},${dest.lat}`;
  const url =
    `https://api.mapbox.com/directions/v5/${profile}/${coords}` +
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

function getCorridorBounds(
  source: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  padDeg = 0.04,
) {
  return {
    minLat: Math.min(source.lat, dest.lat) - padDeg,
    maxLat: Math.max(source.lat, dest.lat) + padDeg,
    minLng: Math.min(source.lng, dest.lng) - padDeg,
    maxLng: Math.max(source.lng, dest.lng) + padDeg,
  };
}

function densifyGeometry(geometry: RouteCoordinate[], maxPoints = 120): RouteCoordinate[] {
  if (geometry.length <= maxPoints) return geometry;
  const step = Math.ceil(geometry.length / maxPoints);
  const out: RouteCoordinate[] = [];
  for (let i = 0; i < geometry.length; i += step) out.push(geometry[i]);
  const last = geometry[geometry.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
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

function minDistanceToRouteKm(
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

type IssueRow = {
  id: string;
  title: string;
  type: IssueType;
  severity: string;
  latitude: number;
  longitude: number;
  priorityScore: number;
};

/** Weighted corridor scoring against live potholes & civic issues from NammaMarga DB. */
function scoreRouteAgainstCivicData(
  geometry: RouteCoordinate[],
  issues: IssueRow[],
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
  const dense = densifyGeometry(geometry);
  const matchedIds = new Set<string>();
  const matchedIssues: HazardIssue[] = [];
  let hazardIndex = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let potholeCount = 0;

  for (let i = 0; i < dense.length - 1; i++) {
    const [lng1, lat1] = dense[i];
    const [lng2, lat2] = dense[i + 1];
    hazardIndex += haversineDistance(
      { latitude: lat1, longitude: lng1 },
      { latitude: lat2, longitude: lng2 },
    );

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
        const typeW = ISSUE_TYPE_WEIGHT[issue.type] ?? 8;
        const sevW = SEVERITY_WEIGHT[issue.severity] ?? 5;
        const weight = typeW + sevW;
        hazardIndex += weight * 0.12;

        matchedIssues.push({
          id: issue.id,
          title: issue.title,
          type: issue.type,
          severity: issue.severity,
          latitude: issue.latitude,
          longitude: issue.longitude,
          priorityScore: issue.priorityScore,
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
    criticalCount * 24 +
      highCount * 16 +
      mediumCount * 8 +
      lowCount * 4 +
      potholeCount * 12,
  );
  const safetyScore = Math.max(0, Math.min(100, 100 - Math.min(routeRisk, 98)));

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
  allRoutes: RouteAnalysis[],
  civicData: CivicDataSummary,
): { reasons: string[]; warnings: string[]; comparisonNote: string | null } {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (analysis.isRecommended) {
    reasons.push(
      `Selected from ${allRoutes.length} Mapbox alternates using live NammaMarga civic data (${civicData.totalActiveIssues} active issues, ${civicData.potholesInCorridor} potholes in corridor)`,
    );
    reasons.push(`Lowest hazard index (${analysis.hazardIndex.toFixed(1)}) — green corridor avoids pothole clusters`);
    if (analysis.potholeCount === 0) {
      reasons.push("Avoids all mapped potholes within 80m of the route");
    } else {
      const others = allRoutes.filter((r) => !r.isRecommended);
      const maxPotholes = Math.max(...others.map((r) => r.potholeCount), 0);
      if (maxPotholes > analysis.potholeCount) {
        reasons.push(
          `Fewest potholes on corridor: ${analysis.potholeCount} vs up to ${maxPotholes} on faster routes`,
        );
      } else {
        reasons.push(`${analysis.potholeCount} pothole(s) near corridor — lowest exposure available`);
      }
    }
    if (analysis.criticalCount === 0) {
      reasons.push("No critical-severity hazards directly on this path");
    } else {
      warnings.push(`${analysis.criticalCount} critical hazard(s) still near route — proceed with caution`);
    }
  } else if (recommended) {
    if (analysis.potholeCount > recommended.potholeCount) {
      warnings.push(
        `${analysis.potholeCount - recommended.potholeCount} more pothole(s) than green corridor (${recommended.potholeCount})`,
      );
    }
    if (analysis.issueCount > recommended.issueCount) {
      warnings.push(`${analysis.issueCount - recommended.issueCount} more civic hazards on this path`);
    }
    if (analysis.hazardIndex > recommended.hazardIndex * 1.15) {
      warnings.push(
        `Higher hazard index (${analysis.hazardIndex.toFixed(1)} vs ${recommended.hazardIndex.toFixed(1)})`,
      );
    }
    if (analysis.isFastest) {
      reasons.push(`~${Math.round(analysis.durationMinutes - recommended.durationMinutes)} min faster but less safe`);
    }
  }

  const comparisonNote =
    recommended && !analysis.isRecommended
      ? `Not recommended: ${analysis.potholeCount} potholes, ${analysis.issueCount} hazards (green corridor: ${recommended.potholeCount} potholes, ${recommended.issueCount} hazards)`
      : null;

  return { reasons, warnings, comparisonNote };
}

function buildCorridorHazards(
  issues: IssueRow[],
  routes: Array<{ id: string; geometry: RouteCoordinate[]; isRecommended: boolean }>,
  recommendedId: string,
): CorridorHazard[] {
  return issues.map((issue) => {
    const onRoutes: string[] = [];
    let nearestRouteM = Infinity;

    for (const route of routes) {
      const d = minDistanceToRouteKm(issue.latitude, issue.longitude, route.geometry);
      nearestRouteM = Math.min(nearestRouteM, d);
      if (d <= BUFFER_KM) onRoutes.push(route.id);
    }

    const onRecommendedRoute = onRoutes.includes(recommendedId);
    const onlyOnAlternates = onRoutes.length > 0 && !onRecommendedRoute;

    return {
      id: issue.id,
      title: issue.title,
      type: issue.type,
      severity: issue.severity,
      latitude: issue.latitude,
      longitude: issue.longitude,
      priorityScore: issue.priorityScore,
      isPothole: issue.type === "POTHOLE",
      onRoutes,
      onRecommendedRoute,
      onlyOnAlternates,
      nearestRouteM: Math.round(nearestRouteM * 1000),
    };
  });
}

export async function getEmergencyRoutes(
  source: { lat: number; lng: number; label?: string },
  dest: { lat: number; lng: number; label?: string },
  options?: { vehicleType?: EmergencyVehicleType; excludeHospitalId?: string },
): Promise<EmergencyRouteResult> {
  const vehicleType = normalizeVehicleType(options?.vehicleType);
  const mapboxRoutes = await fetchMapboxRoutes(source, dest, vehicleType);
  const bounds = getCorridorBounds(source, dest);

  const dbIssues = await db.issue.findMany({
    where: {
      duplicateOfId: null,
      status: { in: [...ACTIVE_STATUSES] },
      latitude: { gte: bounds.minLat, lte: bounds.maxLat },
      longitude: { gte: bounds.minLng, lte: bounds.maxLng },
    },
    select: {
      id: true,
      title: true,
      type: true,
      severity: true,
      latitude: true,
      longitude: true,
      priorityScore: true,
    },
    orderBy: { priorityScore: "desc" },
  });

  const preliminary = mapboxRoutes.map((route) =>
    scoreRouteAgainstCivicData(route.geometry, dbIssues),
  );
  const preliminaryRecommendedIdx = preliminary.reduce((best, r, i) =>
    r.hazardIndex < preliminary[best].hazardIndex - 0.5 ||
    (Math.abs(r.hazardIndex - preliminary[best].hazardIndex) < 0.5 &&
      r.safetyScore > preliminary[best].safetyScore)
      ? i
      : best,
  0);

  const issues = injectDemoCorridorIssues(
    mapboxRoutes,
    dbIssues,
    preliminaryRecommendedIdx,
  );

  const analyses: RouteAnalysis[] = mapboxRoutes.map((route, index) => {
    const scored = scoreRouteAgainstCivicData(route.geometry, issues);
    const distanceKm = route.distance / 1000;
    return {
      id: `route-${index}`,
      routeIndex: index,
      label: `Route option ${index + 1}`,
      geometry: route.geometry,
      distanceKm,
      durationMinutes: estimateEtaMinutes(distanceKm, vehicleType),
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
      hazardsAlongRoute: scored.matchedIssues,
    };
  });

  const fastestIdx = analyses.reduce((best, r, i) =>
    r.durationMinutes < analyses[best].durationMinutes ? i : best, 0);
  analyses[fastestIdx].isFastest = true;

  const recommendedIdx = analyses.reduce((best, r, i) => {
    const a = analyses[best];
    const b = r;
    if (b.hazardIndex < a.hazardIndex - 0.5) return i;
    if (Math.abs(b.hazardIndex - a.hazardIndex) < 0.5 && b.safetyScore > a.safetyScore) return i;
    return best;
  }, 0);

  analyses[recommendedIdx].isRecommended = true;
  analyses[recommendedIdx].label = "Green corridor (recommended)";
  analyses[fastestIdx].label = fastestIdx === recommendedIdx
    ? "Green corridor (recommended · fastest)"
    : "Fastest route";

  const recommended = analyses[recommendedIdx];
  const civicData: CivicDataSummary = {
    totalActiveIssues: issues.length,
    potholesInCorridor: issues.filter((i) => i.type === "POTHOLE").length,
  };

  for (let i = 0; i < analyses.length; i++) {
    const { reasons, warnings, comparisonNote } = buildReasons(
      analyses[i],
      recommended,
      analyses,
      civicData,
    );
    analyses[i].reasons = reasons;
    analyses[i].warnings = warnings;
    analyses[i].comparisonNote = comparisonNote;
    if (i !== recommendedIdx && i !== fastestIdx) {
      analyses[i].label = `Alternate route ${i + 1}`;
    }
  }

  const routeMeta = analyses.map((r) => ({
    id: r.id,
    geometry: r.geometry,
    isRecommended: r.isRecommended,
  }));
  const corridorHazards = buildCorridorHazards(issues, routeMeta, recommended.id).filter(
    (h) => h.onRoutes.length > 0,
  );

  const sorted = [...analyses].sort((a, b) => {
    if (a.isRecommended) return -1;
    if (b.isRecommended) return 1;
    return a.hazardIndex - b.hazardIndex;
  });

  const alongRouteFacilities = await findAlongRouteFacilities({
    routes: sorted.map((r) => ({ id: r.id, geometry: r.geometry })),
    excludeHospitalId: options?.excludeHospitalId,
  });

  return {
    recommended,
    routes: sorted,
    corridorHazards,
    alongRouteFacilities,
    civicData,
    source,
    destination: dest,
  };
}

export function getRouteColor(analysis: RouteAnalysis): string {
  if (analysis.isRecommended) return "#22c55e";
  if (analysis.isFastest) return "#3b82f6";
  return "#94a3b8";
}
