"use client";

import type { AlongRouteFacility } from "@/lib/hospitals/along-route";
import type { CorridorHazard, RouteAnalysis } from "@/lib/routing/emergency-route";
import { getRouteColor } from "@/lib/routing/emergency-route";
import {
  FACILITY_KIND_LABELS,
  FACILITY_KIND_MAP_COLOR,
} from "@/types/emergency";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS } from "@/types/civic";
import type { IssueType, Severity } from "@prisma/client";
import { cn } from "@/utils";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";
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
  showPotholesOnly?: boolean;
  showHeatmap?: boolean;
  comparisonMode?: boolean;
  className?: string;
};

function hazardAffiliation(h: CorridorHazard, recommendedId: string): string {
  if (h.onRecommendedRoute) return "on-recommended";
  if (h.onRoutes.length > 0) return "on-alternate";
  if (h.nearestRouteM < 200) return "near-corridor";
  return "corridor";
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
  showPotholesOnly = false,
  showHeatmap = true,
  comparisonMode = false,
  className,
}: EmergencyRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const lastStyleRef = useRef<string | null>(null);
  const layersReadyRef = useRef(false);
  const hazardEventsBoundRef = useRef(false);
  const facilityEventsBoundRef = useRef(false);
  const routeEventsBoundRef = useRef(false);
  const didFitBoundsRef = useRef(false);
  const onSelectRouteRef = useRef(onSelectRoute);
  const { resolvedTheme } = useTheme();

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

  const filteredHazards = showPotholesOnly ? hazards.filter((h) => h.isPothole) : hazards;

  const visibleFacilities = alongRouteFacilities.filter((f) =>
    focusRouteId ? f.routeIds.includes(focusRouteId) : true,
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

  const syncLayers = useCallback(
    (map: mapboxgl.Map) => {
      const removeLayer = (id: string) => {
        if (map.getLayer(id)) map.removeLayer(id);
      };
      const removeSource = (id: string) => {
        if (map.getSource(id)) map.removeSource(id);
      };

      [
        "route-line",
        "route-line-hit",
        "facility-points",
        "facility-labels",
        "hazard-heatmap",
        "hazard-clusters",
        "hazard-cluster-count",
        "hazard-points",
        "hazard-pothole-ring",
        "hazard-critical-pulse",
      ].forEach(removeLayer);
      ["routes", "facilities", "hazards"].forEach(removeSource);

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (routes.length > 0) {
        const routeFeatures = [...routes]
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
              geometry: { type: "LineString" as const, coordinates: r.geometry },
            };
          });

        map.addSource("routes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: routeFeatures },
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

      if (visibleFacilities.length > 0) {
        map.addSource("facilities", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: visibleFacilities.map((f) => ({
              type: "Feature",
              properties: {
                id: f.id,
                kind: f.kind,
                name: f.name,
                color: FACILITY_KIND_MAP_COLOR[f.kind],
                hasIcu: f.hasIcu ? 1 : 0,
              },
              geometry: {
                type: "Point",
                coordinates: [f.longitude, f.latitude],
              },
            })),
          },
        });

        map.addLayer({
          id: "facility-points",
          type: "circle",
          source: "facilities",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              ["case", ["==", ["get", "hasIcu"], 1], 9, 7],
              14,
              ["case", ["==", ["get", "hasIcu"], 1], 12, 9],
            ],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": strokeColor,
            "circle-opacity": 0.92,
          },
        });

        map.addLayer({
          id: "facility-labels",
          type: "symbol",
          source: "facilities",
          minzoom: 12,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 10,
            "text-offset": [0, 1.4],
            "text-anchor": "top",
            "text-max-width": 12,
          },
          paint: {
            "text-color": isLight ? "#334155" : "#e2e8f0",
            "text-halo-color": isLight ? "#ffffff" : "#0f172a",
            "text-halo-width": 1.5,
          },
        });

        if (!facilityEventsBoundRef.current) {
          facilityEventsBoundRef.current = true;
          map.on("click", "facility-points", (e) => {
            const f = e.features?.[0];
            const id = f?.properties?.id as string | undefined;
            if (!id) return;
            const facility = alongRouteFacilities.find((x) => x.id === id);
            if (!facility) return;
            popupRef.current?.remove();
            popupRef.current = new mapboxgl.Popup({ offset: 14, maxWidth: "280px" })
              .setLngLat(e.lngLat)
              .setHTML(buildFacilityPopup(facility, isLight))
              .addTo(map);
          });
          map.on("mouseenter", "facility-points", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "facility-points", () => {
            map.getCanvas().style.cursor = "";
          });
        }
      }

      if (filteredHazards.length > 0) {
        const hazardFeatures = filteredHazards.map((h) => ({
          type: "Feature" as const,
          properties: {
            id: h.id,
            severity: h.severity,
            type: h.type,
            isPothole: h.isPothole ? 1 : 0,
            isCritical: h.severity === "CRITICAL" ? 1 : 0,
            affiliation: hazardAffiliation(h, recommendedId),
            color: SEVERITY_COLORS[h.severity as Severity],
          },
          geometry: {
            type: "Point" as const,
            coordinates: [h.longitude, h.latitude],
          },
        }));

        map.addSource("hazards", {
          type: "geojson",
          data: { type: "FeatureCollection", features: hazardFeatures },
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 45,
        });

        if (showHeatmap) {
          map.addLayer({
            id: "hazard-heatmap",
            type: "heatmap",
            source: "hazards",
            maxzoom: 14,
            paint: {
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["+", ["get", "isPothole"], ["get", "isCritical"]],
                0,
                0.4,
                2,
                2.5,
              ],
              "heatmap-intensity": 1,
              "heatmap-radius": 26,
              "heatmap-opacity": 0.48,
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(34,197,94,0)",
                0.3,
                "rgba(234,179,8,0.32)",
                0.6,
                "rgba(249,115,22,0.52)",
                1,
                "rgba(239,68,68,0.72)",
              ],
            },
          });
        }

        map.addLayer({
          id: "hazard-clusters",
          type: "circle",
          source: "hazards",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#eab308",
              5,
              "#f97316",
              15,
              "#ef4444",
            ],
            "circle-radius": ["step", ["get", "point_count"], 14, 8, 20, 20, 26],
            "circle-stroke-width": 2,
            "circle-stroke-color": strokeColor,
          },
        });

        map.addLayer({
          id: "hazard-cluster-count",
          type: "symbol",
          source: "hazards",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 12,
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          },
          paint: { "text-color": isLight ? "#0f172a" : "#fff" },
        });

        map.addLayer({
          id: "hazard-points",
          type: "circle",
          source: "hazards",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "affiliation"],
              "on-recommended",
              "#ef4444",
              "on-alternate",
              "#f97316",
              "near-corridor",
              "#eab308",
              "#94a3b8",
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              ["case", ["==", ["get", "isPothole"], 1], 7, 5],
              14,
              ["case", ["==", ["get", "isPothole"], 1], 11, 8],
            ],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": strokeColor,
            "circle-opacity": 0.82,
          },
        });

        map.addLayer({
          id: "hazard-pothole-ring",
          type: "circle",
          source: "hazards",
          filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isPothole"], 1]],
          paint: {
            "circle-radius": 16,
            "circle-color": "transparent",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#f97316",
            "circle-opacity": 0.55,
          },
        });

        map.addLayer({
          id: "hazard-critical-pulse",
          type: "circle",
          source: "hazards",
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            ["==", ["get", "severity"], "CRITICAL"],
          ],
          paint: {
            "circle-color": "#ef4444",
            "circle-radius": 18,
            "circle-opacity": 0.14,
          },
        });

        if (!hazardEventsBoundRef.current) {
          hazardEventsBoundRef.current = true;
          map.on("click", "hazard-points", (e) => {
            const feat = e.features?.[0];
            if (!feat?.properties?.id) return;
            const hazard = filteredHazards.find((h) => h.id === feat.properties!.id);
            if (!hazard) return;
            popupRef.current?.remove();
            popupRef.current = new mapboxgl.Popup({ offset: 12, maxWidth: "260px" })
              .setLngLat(e.lngLat)
              .setHTML(buildHazardPopup(hazard, isLight))
              .addTo(map);
          });
          map.on("mouseenter", "hazard-points", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "hazard-points", () => {
            map.getCanvas().style.cursor = "";
          });
        }
      }

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

      if (!didFitBoundsRef.current && (routes.length > 0 || source)) {
        const bounds = new mapboxgl.LngLatBounds();
        routes.forEach((r) => r.geometry.forEach(([lng, lat]) => bounds.extend([lng, lat])));
        filteredHazards.forEach((h) => bounds.extend([h.longitude, h.latitude]));
        visibleFacilities.forEach((f) => bounds.extend([f.longitude, f.latitude]));
        if (source) bounds.extend([source.longitude, source.latitude]);
        if (destination) bounds.extend([destination.longitude, destination.latitude]);
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 800 });
        didFitBoundsRef.current = true;
      }

      layersReadyRef.current = true;
    },
    [
      routes,
      filteredHazards,
      visibleFacilities,
      alongRouteFacilities,
      source,
      destination,
      focusRoute,
      recommendedId,
      showHeatmap,
      comparisonMode,
      strokeColor,
      isLight,
      bindRouteInteractions,
    ],
  );

  useEffect(() => {
    didFitBoundsRef.current = false;
  }, [routes.length, source?.latitude, destination?.latitude]);

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
        hazardEventsBoundRef.current = false;
        facilityEventsBoundRef.current = false;
        routeEventsBoundRef.current = false;
        didFitBoundsRef.current = false;
      };
    }

    if (lastStyleRef.current !== mapStyle) {
      lastStyleRef.current = mapStyle;
      layersReadyRef.current = false;
      routeEventsBoundRef.current = false;
      mapRef.current.setStyle(mapStyle);
      mapRef.current.once("load", () => {
        if (mapRef.current) syncLayers(mapRef.current);
      });
    } else if (layersReadyRef.current) {
      syncLayers(mapRef.current);
    } else {
      mapRef.current.once("load", () => {
        if (mapRef.current) syncLayers(mapRef.current);
      });
    }
  }, [token, mapStyle, syncLayers]);

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
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[210px] pointer-events-none">
          <div className="rounded-lg border border-border/60 bg-background/75 backdrop-blur-md px-3 py-2 text-[10px] shadow-sm space-y-1 pointer-events-auto">
            <p className="font-semibold text-xs mb-1">Tap a route to switch</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded-full bg-green-500" />
              Green corridor
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded-full bg-blue-500" />
              Fastest / alternate
            </div>
            <p className="font-semibold text-xs mt-2 mb-1">On the way</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Blood bank
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              ICU / clinic
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              Pharmacy
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-orange-400" />
              Pothole
            </div>
          </div>
          {focusRouteMeta && (
            <p className="text-[10px] text-muted-foreground bg-background/70 backdrop-blur px-2 py-1 rounded-md border border-border/50">
              Viewing: {focusRouteMeta.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
