"use client";

import type { AlongRouteFacility } from "@/lib/hospitals/along-route";
import type { CorridorHazard, RouteAnalysis } from "@/lib/routing/emergency-route";
import { getRouteColor } from "@/lib/routing/emergency-route";
import {
  getMapPotholesForRoute,
  NEARBY_POTHOLE_RADIUS_KM,
} from "@/lib/routing/nearby-route-potholes";
import {
  FACILITY_KIND_LABELS,
  FACILITY_KIND_MAP_COLOR,
} from "@/types/emergency";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS } from "@/types/civic";
import type { IssueType, Severity } from "@prisma/client";
import { cn } from "@/utils";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type PlacePoint = { latitude: number; longitude: number; placeName: string };

type EmergencyRouteMapProps = {
  routes: RouteAnalysis[];
  hazards: CorridorHazard[];
  alongRouteFacilities?: AlongRouteFacility[];
  source: PlacePoint | null;
  destination: PlacePoint | null;
  focusRouteId: string | null;
  onSelectRoute?: (routeId: string) => void;
  showNearbyPotholes?: boolean;
  showHealthcareStops?: boolean;
  highlightFacilityId?: string | null;
  onFacilitySelect?: (facility: AlongRouteFacility) => void;
  comparisonMode?: boolean;
  className?: string;
};

function createPotholeMarkerElement(h: CorridorHazard): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.title = h.title;
  el.setAttribute("aria-label", h.title);
  const color =
    h.severity === "CRITICAL" ? "#ef4444" : h.severity === "HIGH" ? "#f97316" : "#eab308";
  el.className =
    "block h-4 w-4 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform";
  el.style.backgroundColor = color;
  return el;
}

function createFacilityMarkerElement(
  f: AlongRouteFacility,
  selected: boolean,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.title = f.name;
  el.setAttribute("aria-label", f.name);
  const color = FACILITY_KIND_MAP_COLOR[f.kind];
  el.className = [
    "health-facility-pin flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg",
    "transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
    selected ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/40" : "",
  ].join(" ");
  el.style.backgroundColor = color;
  const label = FACILITY_KIND_LABELS[f.kind].charAt(0);
  el.innerHTML = `<span class="text-[11px] font-bold text-white leading-none">${label}</span>`;
  return el;
}

function buildHazardPopup(h: CorridorHazard, isLight: boolean) {
  const muted = isLight ? "#64748b" : "#a1a1aa";
  const typeLabel = ISSUE_TYPE_LABELS[h.type as IssueType] ?? h.type;
  const onRoute =
    h.onRecommendedRoute
      ? '<span style="color:#22c55e;font-weight:600">On green corridor</span>'
      : h.onRoutes.length > 0
        ? '<span style="color:#f97316">On alternate route only</span>'
        : `<span style="color:${muted}">${h.nearestRouteM}m from nearest route</span>`;

  return `
    <div style="font-family:system-ui;min-width:180px;padding:2px 0">
      <p style="font-weight:600;margin:0 0 4px;font-size:13px">${h.title}</p>
      <p style="margin:0 0 6px;font-size:11px;color:${muted}">${typeLabel}</p>
      <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;color:#fff;background:${SEVERITY_COLORS[h.severity as Severity]}">${h.severity}</span>
      ${h.isPothole ? '<span style="margin-left:6px;font-size:10px;color:#f97316">⬤ Pothole</span>' : ""}
      <p style="margin:8px 0 0;font-size:11px">${onRoute}</p>
      <a href="/dashboard/reports/${h.id}" style="display:inline-block;margin-top:8px;font-size:11px;color:#3b82f6">View report →</a>
    </div>
  `;
}

function buildFacilityPopup(f: AlongRouteFacility, isLight: boolean) {
  const muted = isLight ? "#64748b" : "#a1a1aa";
  const tags: string[] = [];
  if (f.hasIcu) tags.push("ICU");
  if (f.hasBloodBank) tags.push("Blood bank");
  if (f.hasEmergency) tags.push("24/7 ER");

  return `
    <div style="font-family:system-ui;min-width:200px;padding:2px 0">
      <p style="font-weight:600;margin:0 0 4px;font-size:13px">${f.name}</p>
      <p style="margin:0 0 6px;font-size:11px;color:${FACILITY_KIND_MAP_COLOR[f.kind]};font-weight:600">${FACILITY_KIND_LABELS[f.kind]}</p>
      ${tags.length ? `<p style="margin:0 0 6px;font-size:10px;color:${muted}">${tags.join(" · ")}</p>` : ""}
      <p style="margin:0;font-size:11px;color:${muted}">${f.distanceFromRouteM}m from route</p>
      ${f.briefInfo ? `<p style="margin:8px 0 0;font-size:11px">${f.briefInfo}</p>` : ""}
      ${f.phone ? `<p style="margin:6px 0 0;font-size:11px">📞 ${f.phone}</p>` : ""}
    </div>
  `;
}

/** Extend polyline to destination when Mapbox ends on the road network. */
function routeDisplayCoordinates(
  geometry: RouteAnalysis["geometry"],
  dest: PlacePoint | null,
): RouteAnalysis["geometry"] {
  if (!dest || geometry.length === 0) return geometry;
  const [lastLng, lastLat] = geometry[geometry.length - 1];
  const dLat = dest.latitude - lastLat;
  const dLng = dest.longitude - lastLng;
  const approxM = Math.sqrt(dLat * dLat + dLng * dLng) * 111_000;
  if (approxM < 40) return geometry;
  return [...geometry, [dest.longitude, dest.latitude]];
}

function routePaintProps(
  r: RouteAnalysis,
  focusRoute: RouteAnalysis | undefined,
  comparisonMode: boolean,
) {
  const isFocused = r.id === focusRoute?.id;
  const color = getRouteColor(r);
  return {
    id: r.id,
    color,
    width: isFocused ? 9 : r.isRecommended ? 7 : 5,
    opacity: comparisonMode
      ? isFocused
        ? 1
        : r.isRecommended
          ? 0.75
          : 0.45
      : isFocused
        ? 1
        : 0.35,
    zIndex: isFocused ? 3 : r.isRecommended ? 2 : 1,
  };
}

export function EmergencyRouteMap({
  routes,
  hazards,
  alongRouteFacilities = [],
  source,
  destination,
  focusRouteId,
  onSelectRoute,
  showNearbyPotholes = true,
  showHealthcareStops = true,
  highlightFacilityId = null,
  onFacilitySelect,
  comparisonMode = false,
  className,
}: EmergencyRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const facilityMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const potholeMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const lastStyleRef = useRef<string | null>(null);
  const layersReadyRef = useRef(false);
  const routeEventsBoundRef = useRef(false);
  const didFitBoundsRef = useRef(false);
  const lastFitKeyRef = useRef("");
  const lastDataSyncKeyRef = useRef("");
  const hazardsRef = useRef<CorridorHazard[]>([]);
  const onSelectRouteRef = useRef(onSelectRoute);
  const onFacilitySelectRef = useRef(onFacilitySelect);
  const { resolvedTheme } = useTheme();

  onFacilitySelectRef.current = onFacilitySelect;
  onSelectRouteRef.current = onSelectRoute;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const isLight = resolvedTheme === "light";
  const mapStyle = isLight
    ? "mapbox://styles/mapbox/light-v11"
    : "mapbox://styles/mapbox/dark-v11";
  const strokeColor = isLight ? "#ffffff" : "#18181b";

  const recommendedId = routes.find((r) => r.isRecommended)?.id ?? "";
  const focusRoute =
    routes.find((r) => r.id === focusRouteId) ?? routes.find((r) => r.isRecommended);

  const mapPotholes = useMemo(() => {
    if (!showNearbyPotholes) return [];
    return getMapPotholesForRoute(hazards, focusRoute);
  }, [showNearbyPotholes, hazards, focusRoute]);

  hazardsRef.current = mapPotholes;

  const visibleFacilities = useMemo(
    () =>
      alongRouteFacilities.filter((f) =>
        focusRouteId ? f.routeIds.includes(focusRouteId) : true,
      ),
    [alongRouteFacilities, focusRouteId],
  );

  const routesDataKey = useMemo(
    () => routes.map((r) => `${r.id}:${r.geometry.length}`).join("|"),
    [routes],
  );

  const hazardsDataKey = useMemo(
    () => hazards.map((h) => h.id).join(","),
    [hazards],
  );

  const potholeViewKey = useMemo(
    () =>
      `${showNearbyPotholes}|${focusRouteId ?? ""}|${mapPotholes.map((h) => h.id).join(",")}`,
    [showNearbyPotholes, focusRouteId, mapPotholes],
  );

  const facilitiesKey = useMemo(
    () => visibleFacilities.map((f) => f.id).join(","),
    [visibleFacilities],
  );

  const endpointsKey = useMemo(
    () =>
      `${source?.latitude ?? ""},${source?.longitude ?? ""}|${destination?.latitude ?? ""},${destination?.longitude ?? ""}`,
    [source?.latitude, source?.longitude, destination?.latitude, destination?.longitude],
  );

  const buildRouteFeatures = useCallback(() => {
    return [...routes]
      .sort((a, b) => {
        const pa = routePaintProps(a, focusRoute, comparisonMode).zIndex;
        const pb = routePaintProps(b, focusRoute, comparisonMode).zIndex;
        return pa - pb;
      })
      .map((r) => {
        const p = routePaintProps(r, focusRoute, comparisonMode);
        return {
          type: "Feature" as const,
          properties: {
            id: p.id,
            color: p.color,
            width: p.width,
            opacity: p.opacity,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: routeDisplayCoordinates(r.geometry, destination),
          },
        };
      });
  }, [routes, focusRoute, comparisonMode, destination]);

  const updateRoutesSource = useCallback(
    (map: mapboxgl.Map) => {
      const source = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({ type: "FeatureCollection", features: buildRouteFeatures() });
    },
    [buildRouteFeatures],
  );

  const syncFacilityMarkers = useCallback(
    (map: mapboxgl.Map) => {
      facilityMarkersRef.current.forEach((m) => m.remove());
      facilityMarkersRef.current = [];

      if (!showHealthcareStops) return;

      for (const f of visibleFacilities) {
        const selected = f.id === highlightFacilityId;
        const el = createFacilityMarkerElement(f, selected);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onFacilitySelectRef.current?.(f);
          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            offset: 16,
            maxWidth: "280px",
            closeOnClick: true,
          })
            .setLngLat([f.longitude, f.latitude])
            .setHTML(buildFacilityPopup(f, isLight))
            .addTo(map);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([f.longitude, f.latitude])
          .addTo(map);
        facilityMarkersRef.current.push(marker);
      }
    },
    [visibleFacilities, showHealthcareStops, highlightFacilityId, isLight],
  );

  const fitMapToCorridor = useCallback(
    (map: mapboxgl.Map) => {
      const fitKey = `${routesDataKey}|${endpointsKey}`;
      if (didFitBoundsRef.current && lastFitKeyRef.current === fitKey) return;
      if (routes.length === 0 && !source) return;

      const bounds = new mapboxgl.LngLatBounds();
      routes.forEach((r) => r.geometry.forEach(([lng, lat]) => bounds.extend([lng, lat])));
      mapPotholes.forEach((h) => bounds.extend([h.longitude, h.latitude]));
      visibleFacilities.forEach((f) => bounds.extend([f.longitude, f.latitude]));
      if (source) bounds.extend([source.longitude, source.latitude]);
      if (destination) bounds.extend([destination.longitude, destination.latitude]);

      if (bounds.isEmpty()) return;

      lastFitKeyRef.current = fitKey;
      didFitBoundsRef.current = true;
      map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 0 });
    },
    [
      routes,
      routesDataKey,
      endpointsKey,
      mapPotholes,
      visibleFacilities,
      source,
      destination,
    ],
  );

  const bindRouteInteractions = useCallback((map: mapboxgl.Map) => {
    if (routeEventsBoundRef.current) return;
    routeEventsBoundRef.current = true;

    const handleRouteClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) onSelectRouteRef.current?.(id);
    };

    map.on("click", "route-line-hit", handleRouteClick);
    map.on("mouseenter", "route-line-hit", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "route-line-hit", () => {
      map.getCanvas().style.cursor = "";
    });
  }, []);

  const clearLegacyHazardLayers = useCallback((map: mapboxgl.Map) => {
    for (const id of [
      "hazard-heatmap",
      "hazard-clusters",
      "hazard-cluster-count",
      "hazard-points",
      "hazard-pothole-ring",
      "hazard-critical-pulse",
    ]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource("hazards")) map.removeSource("hazards");
  }, []);

  const syncPotholeMarkers = useCallback(
    (map: mapboxgl.Map) => {
      clearLegacyHazardLayers(map);
      potholeMarkersRef.current.forEach((m) => m.remove());
      potholeMarkersRef.current = [];

      if (!showNearbyPotholes || mapPotholes.length === 0) return;

      for (const h of mapPotholes) {
        const el = createPotholeMarkerElement(h);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({ offset: 12, maxWidth: "260px" })
            .setLngLat([h.longitude, h.latitude])
            .setHTML(buildHazardPopup(h, isLight))
            .addTo(map);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([h.longitude, h.latitude])
          .addTo(map);
        potholeMarkersRef.current.push(marker);
      }
    },
    [mapPotholes, showNearbyPotholes, isLight, clearLegacyHazardLayers],
  );

  const syncLayers = useCallback(
    (map: mapboxgl.Map) => {
      const removeLayer = (id: string) => {
        if (map.getLayer(id)) map.removeLayer(id);
      };
      const removeSource = (id: string) => {
        if (map.getSource(id)) map.removeSource(id);
      };

      ["route-line", "route-line-hit"].forEach(removeLayer);
      if (map.getSource("routes")) removeSource("routes");
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (routes.length > 0) {
        map.addSource("routes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: buildRouteFeatures() },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "routes",
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["get", "width"],
            "line-opacity": ["get", "opacity"],
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });

        map.addLayer({
          id: "route-line-hit",
          type: "line",
          source: "routes",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 18,
            "line-opacity": 0.01,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });

        bindRouteInteractions(map);
      }

      syncPotholeMarkers(map);

      if (source) {
        const m = new mapboxgl.Marker({ color: "#22c55e" })
          .setLngLat([source.longitude, source.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Start</strong><br/>${source.placeName}`))
          .addTo(map);
        markersRef.current.push(m);
      }
      if (destination) {
        const m = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([destination.longitude, destination.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(`<strong>Destination</strong><br/>${destination.placeName}`),
          )
          .addTo(map);
        markersRef.current.push(m);
      }

      fitMapToCorridor(map);
      syncFacilityMarkers(map);
      layersReadyRef.current = true;
    },
    [
      routes,
      source,
      destination,
      bindRouteInteractions,
      buildRouteFeatures,
      fitMapToCorridor,
      syncFacilityMarkers,
      syncPotholeMarkers,
    ],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReadyRef.current) return;
    syncPotholeMarkers(map);
  }, [potholeViewKey, syncPotholeMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReadyRef.current) return;
    syncFacilityMarkers(map);
  }, [facilitiesKey, showHealthcareStops, highlightFacilityId, syncFacilityMarkers]);

  const lastHighlightRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !highlightFacilityId) {
      lastHighlightRef.current = highlightFacilityId;
      return;
    }
    if (lastHighlightRef.current === highlightFacilityId) return;
    lastHighlightRef.current = highlightFacilityId;

    const f = visibleFacilities.find((x) => x.id === highlightFacilityId);
    if (!f) return;
    map.easeTo({
      center: [f.longitude, f.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [highlightFacilityId, visibleFacilities]);

  useEffect(() => {
    const fitKey = `${routesDataKey}|${endpointsKey}`;
    if (lastFitKeyRef.current !== fitKey) {
      didFitBoundsRef.current = false;
    }
  }, [routesDataKey, endpointsKey]);

  useEffect(() => {
    const map = mapRef.current;
    const el = mapContainer.current;
    if (!map || !el) return;

    const resize = () => map.resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    document.addEventListener("fullscreenchange", resize);
    return () => {
      ro.disconnect();
      document.removeEventListener("fullscreenchange", resize);
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    if (!mapRef.current) {
      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [77.5946, 12.9716],
        zoom: 11,
      });
      lastStyleRef.current = mapStyle;

      mapRef.current.on("load", () => {
        if (mapRef.current) syncLayers(mapRef.current);
      });

      return () => {
        popupRef.current?.remove();
        markersRef.current.forEach((m) => m.remove());
        mapRef.current?.remove();
        mapRef.current = null;
        layersReadyRef.current = false;
        facilityMarkersRef.current.forEach((m) => m.remove());
        potholeMarkersRef.current.forEach((m) => m.remove());
        routeEventsBoundRef.current = false;
        didFitBoundsRef.current = false;
      };
    }

    if (lastStyleRef.current !== mapStyle) {
      lastStyleRef.current = mapStyle;
      layersReadyRef.current = false;
      lastDataSyncKeyRef.current = "";
      routeEventsBoundRef.current = false;
      mapRef.current.setStyle(mapStyle);
      mapRef.current.once("load", () => {
        if (mapRef.current) syncLayers(mapRef.current);
      });
    } else if (layersReadyRef.current) {
      const dataKey = `${routesDataKey}|${hazardsDataKey}|${endpointsKey}|${mapStyle}`;
      if (dataKey !== lastDataSyncKeyRef.current) {
        lastDataSyncKeyRef.current = dataKey;
        syncLayers(mapRef.current);
      } else {
        updateRoutesSource(mapRef.current);
        syncFacilityMarkers(mapRef.current);
      }
    } else {
      mapRef.current.once("load", () => {
        if (mapRef.current) {
          lastDataSyncKeyRef.current = `${routesDataKey}|${hazardsDataKey}|${endpointsKey}|${mapStyle}`;
          syncLayers(mapRef.current);
        }
      });
    }
  }, [
    token,
    mapStyle,
    syncLayers,
    routesDataKey,
    hazardsDataKey,
    endpointsKey,
    updateRoutesSource,
    syncFacilityMarkers,
  ]);

  const focusRouteMeta = routes.find((r) => r.id === focusRouteId);

  return (
    <div className={cn("relative rounded-xl border border-border overflow-hidden", className)}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {routes.length > 1 && onSelectRoute && (
        <div className="absolute bottom-3 left-3 right-3 z-20 flex gap-2 overflow-x-auto pb-1 pointer-events-auto">
          {routes.map((r) => {
            const selected = r.id === (focusRouteId ?? focusRoute?.id);
            const color = getRouteColor(r);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRoute(r.id)}
                className={cn(
                  "shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-md transition-all",
                  selected
                    ? "bg-background border-foreground/30 ring-2 ring-offset-1 ring-offset-transparent"
                    : "bg-background/80 border-border/60 hover:bg-background",
                )}
                style={selected ? { boxShadow: `0 0 0 2px ${color}55` } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="whitespace-nowrap">
                  {r.isRecommended ? "Green corridor" : r.isFastest ? "Fastest" : `Route ${r.routeIndex + 1}`}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  ~{Math.round(r.durationMinutes)}m
                </span>
              </button>
            );
          })}
        </div>
      )}

      {routes.length > 0 && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none max-w-[200px]">
          <div className="rounded-lg border border-border/60 bg-background/80 backdrop-blur-md px-2.5 py-2 text-[10px] shadow-sm pointer-events-auto">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 rounded-full bg-green-500" />
                Green
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 rounded-full bg-blue-500" />
                Alternate
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 ring-1 ring-orange-400" />
                Hazard
              </span>
            </div>
            {showNearbyPotholes && mapPotholes.length > 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
                {mapPotholes.length} pothole
                {mapPotholes.length !== 1 ? "s" : ""} within {NEARBY_POTHOLE_RADIUS_KM} km
              </p>
            )}
            {showHealthcareStops && visibleFacilities.length > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground border-t border-border/50 pt-1.5">
                {visibleFacilities.length} healthcare stop
                {visibleFacilities.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {focusRouteMeta && (
            <p className="mt-1 text-[10px] text-muted-foreground bg-background/75 backdrop-blur px-2 py-0.5 rounded border border-border/50 truncate">
              {focusRouteMeta.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
