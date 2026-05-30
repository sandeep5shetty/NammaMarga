"use client";

import type { CorridorHazard, RouteAnalysis } from "@/lib/routing/emergency-route";
import { getRouteColor } from "@/lib/routing/emergency-route";
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
  source: PlacePoint | null;
  destination: PlacePoint | null;
  focusRouteId: string | null;
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

export function EmergencyRouteMap({
  routes,
  hazards,
  source,
  destination,
  focusRouteId,
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
  const eventsBoundRef = useRef(false);
  const { resolvedTheme } = useTheme();

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const isLight = resolvedTheme === "light";
  const mapStyle = isLight
    ? "mapbox://styles/mapbox/light-v11"
    : "mapbox://styles/mapbox/dark-v11";
  const strokeColor = isLight ? "#ffffff" : "#18181b";

  const recommendedId = routes.find((r) => r.isRecommended)?.id ?? "";

  const filteredHazards = showPotholesOnly ? hazards.filter((h) => h.isPothole) : hazards;

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
        "hazard-heatmap",
        "hazard-clusters",
        "hazard-cluster-count",
        "hazard-points",
        "hazard-pothole-ring",
        "hazard-critical-pulse",
      ].forEach(removeLayer);
      ["routes", "hazards"].forEach(removeSource);

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const focusRoute = focusRouteId
        ? routes.find((r) => r.id === focusRouteId)
        : routes.find((r) => r.isRecommended);

      if (routes.length > 0) {
        map.addSource("routes", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: routes.map((r) => ({
              type: "Feature",
              properties: {
                id: r.id,
                color: getRouteColor(r),
                width: r.isRecommended ? 8 : r.id === focusRoute?.id ? 7 : 5,
                opacity: comparisonMode
                  ? r.id === focusRoute?.id
                    ? 0.95
                    : r.isRecommended
                      ? 0.88
                      : 0.65
                  : focusRoute && r.id !== focusRoute.id
                    ? 0.28
                    : r.isRecommended
                      ? 0.95
                      : 0.55,
              },
              geometry: { type: "LineString", coordinates: r.geometry },
            })),
          },
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

        if (!eventsBoundRef.current) {
          eventsBoundRef.current = true;
          map.on("click", "hazard-points", (e) => {
            const f = e.features?.[0];
            if (!f?.properties?.id) return;
            const hazard = filteredHazards.find((h) => h.id === f.properties!.id);
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

      if (routes.length > 0 || source) {
        const bounds = new mapboxgl.LngLatBounds();
        routes.forEach((r) => r.geometry.forEach(([lng, lat]) => bounds.extend([lng, lat])));
        filteredHazards.forEach((h) => bounds.extend([h.longitude, h.latitude]));
        if (source) bounds.extend([source.longitude, source.latitude]);
        if (destination) bounds.extend([destination.longitude, destination.latitude]);
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 800 });
      }

      layersReadyRef.current = true;
    },
    [
      routes,
      filteredHazards,
      source,
      destination,
      focusRouteId,
      recommendedId,
      showHeatmap,
      comparisonMode,
      strokeColor,
      isLight,
    ],
  );

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
        eventsBoundRef.current = false;
      };
    }

    if (lastStyleRef.current !== mapStyle) {
      lastStyleRef.current = mapStyle;
      layersReadyRef.current = false;
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

  return (
    <div className={cn("relative rounded-xl border border-border overflow-hidden", className)}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {routes.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[200px]">
          <div className="rounded-lg border border-border/60 bg-background/75 backdrop-blur-md px-3 py-2 text-[10px] shadow-sm space-y-1">
            <p className="font-semibold text-xs mb-1.5">Map legend</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded-full bg-green-500" />
              Green corridor
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded-full bg-blue-500" />
              Fastest / alternate
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-orange-400" />
              Pothole on route
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              Hazard on alternate only
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Nearby in corridor
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
