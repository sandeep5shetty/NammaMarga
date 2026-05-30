"use client";

import { PlaceSearch, type PlaceSelection } from "@/components/routing/place-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HazardIssue, RouteAnalysis } from "@/lib/routing/emergency-route";
import { getRouteColor } from "@/lib/routing/emergency-route";
import {
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  Hospital,
  MapPin,
  Navigation,
  Route,
  Shield,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";

type HospitalResult = {
  id: string;
  name: string;
  hasIcu: boolean;
  distanceKm: number;
  etaMinutes: number;
  score: number;
};

const DEFAULT_SOURCE: PlaceSelection = {
  name: "MG Road",
  placeName: "MG Road, Bengaluru, Karnataka, India",
  latitude: 12.9716,
  longitude: 77.5946,
};

const DEFAULT_DEST: PlaceSelection = {
  name: "Koramangala",
  placeName: "Koramangala, Bengaluru, Karnataka, India",
  latitude: 12.9352,
  longitude: 77.6245,
};

export default function EmergencyRoutePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const lastStyleRef = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStyle =
    mounted && resolvedTheme === "light"
      ? "mapbox://styles/mapbox/light-v11"
      : "mapbox://styles/mapbox/dark-v11";

  const [source, setSource] = useState<PlaceSelection | null>(DEFAULT_SOURCE);
  const [destination, setDestination] = useState<PlaceSelection | null>(DEFAULT_DEST);
  const [loading, setLoading] = useState(false);
  const [recommended, setRecommended] = useState<RouteAnalysis | null>(null);
  const [routes, setRoutes] = useState<RouteAnalysis[]>([]);
  const [hazards, setHazards] = useState<HazardIssue[]>([]);
  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [nearestIcu, setNearestIcu] = useState<HospitalResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mapContainer.current || !token || !mounted) return;

    if (!mapRef.current) {
      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [77.5946, 12.9716],
        zoom: 11,
      });
      lastStyleRef.current = mapStyle;
      return () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        mapRef.current?.remove();
        mapRef.current = null;
        lastStyleRef.current = null;
      };
    }

    if (lastStyleRef.current !== mapStyle) {
      lastStyleRef.current = mapStyle;
      mapRef.current.setStyle(mapStyle);
    }
  }, [token, mounted, mapStyle]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSource({
          name: "Your location",
          placeName: "Current location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const clearMapLayers = useCallback((map: mapboxgl.Map) => {
    ["route-line", "hazards-circle", "hazards-circle-outline"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ["routes", "hazards"].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
  }, []);

  const drawMap = useCallback(
    (
      routeList: RouteAnalysis[],
      hazardList: HazardIssue[],
      src: PlaceSelection,
      dest: PlaceSelection,
      focusId: string | null,
    ) => {
      const map = mapRef.current;
      if (!map) return;

      const run = () => {
        clearMapLayers(map);
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const focusRoute = focusId
          ? routeList.find((r) => r.id === focusId)
          : routeList.find((r) => r.isRecommended);

        const routeFeatures = routeList.map((r) => ({
          type: "Feature" as const,
          properties: {
            id: r.id,
            isRecommended: r.isRecommended,
            opacity: focusRoute && r.id !== focusRoute.id ? 0.35 : r.isRecommended ? 1 : 0.55,
            width: r.isRecommended ? 7 : r.id === focusRoute?.id ? 6 : 4,
            color: getRouteColor(r),
          },
          geometry: { type: "LineString" as const, coordinates: r.geometry },
        }));

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

        if (hazardList.length > 0) {
          map.addSource("hazards", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: hazardList.map((h) => ({
                type: "Feature",
                properties: { severity: h.severity, type: h.type },
                geometry: { type: "Point", coordinates: [h.longitude, h.latitude] },
              })),
            },
          });
          map.addLayer({
            id: "hazards-circle",
            type: "circle",
            source: "hazards",
            paint: {
              "circle-radius": 6,
              "circle-color": [
                "match",
                ["get", "severity"],
                "CRITICAL",
                "#ef4444",
                "HIGH",
                "#f97316",
                "MEDIUM",
                "#eab308",
                "#94a3b8",
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#fff",
            },
          });
        }

        const srcMarker = new mapboxgl.Marker({ color: "#22c55e" })
          .setLngLat([src.longitude, src.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Start</strong><br/>${src.placeName}`))
          .addTo(map);
        const destMarker = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat([dest.longitude, dest.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Destination</strong><br/>${dest.placeName}`))
          .addTo(map);
        markersRef.current.push(srcMarker, destMarker);

        const bounds = new mapboxgl.LngLatBounds();
        routeList.forEach((r) => r.geometry.forEach(([lng, lat]) => bounds.extend([lng, lat])));
        bounds.extend([src.longitude, src.latitude]);
        bounds.extend([dest.longitude, dest.latitude]);
        map.fitBounds(bounds, { padding: 72, maxZoom: 14 });
      };

      if (map.isStyleLoaded()) run();
      else map.once("load", run);
    },
    [clearMapLayers],
  );

  const calculateRoutes = async () => {
    if (!source || !destination) {
      toast.error("Select both start and destination from search");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/emergency-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLat: source.latitude,
          sourceLng: source.longitude,
          destLat: destination.latitude,
          destLng: destination.longitude,
          sourceLabel: source.placeName,
          destLabel: destination.placeName,
          includeHospitals: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");

      const rec = json.data.recommended as RouteAnalysis;
      const allRoutes = json.data.routes as RouteAnalysis[];
      setRecommended(rec);
      setRoutes(allRoutes);
      setHazards(json.data.hazardsOnMap ?? []);
      setHospitals(json.data.hospitals ?? []);
      setNearestIcu(json.data.nearestIcuHospital ?? null);
      setSelectedRouteId(rec?.id ?? null);
      drawMap(allRoutes, json.data.hazardsOnMap ?? [], source, destination, rec?.id ?? null);
      toast.success("Green corridor route ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Route failed");
    } finally {
      setLoading(false);
    }
  };

  const focusRoute = (route: RouteAnalysis) => {
    setSelectedRouteId(route.id);
    if (source && destination) {
      drawMap(routes, hazards, source, destination, route.id);
    }
  };

  const alternatives = routes.filter((r) => !r.isRecommended);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <Ambulance className="h-6 w-6 text-red-500" />
          Emergency Route Intelligence
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Mapbox driving routes scored against live potholes and road hazards. The green corridor
          minimizes hazard exposure using weighted path analysis — faster routes are shown for
          comparison only.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Plan corridor
            </CardTitle>
            <CardDescription>Search places in Bengaluru — no coordinates needed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlaceSearch
              id="source"
              label="Pickup / ambulance start"
              placeholder="e.g. MG Road, Indiranagar, your hospital"
              value={source}
              onChange={setSource}
              icon="source"
            />
            <PlaceSearch
              id="destination"
              label="Destination"
              placeholder="e.g. Manipal Hospital, Koramangala"
              value={destination}
              onChange={setDestination}
              icon="destination"
            />
            <Button className="w-full" onClick={calculateRoutes} disabled={loading || !source || !destination}>
              {loading ? "Analyzing routes..." : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Find green corridor
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Uses Mapbox Directions for alternate paths, then scores each against active potholes
              and civic issues within 60m of the corridor.
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-border overflow-hidden h-[420px] relative">
            {!token && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                <p className="text-sm text-muted-foreground">Mapbox token required</p>
              </div>
            )}
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            {routes.length > 0 && (
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 z-10">
                <Badge className="bg-green-600 hover:bg-green-600 text-white border-0">Green corridor</Badge>
                <Badge variant="secondary" className="bg-background/90">Fastest</Badge>
                <Badge variant="outline" className="bg-background/90">Potholes on map</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {recommended && !loading && (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-600 hover:bg-green-600 text-white border-0 gap-1">
                <Shield className="h-3 w-3" />
                Recommended — Green corridor
              </Badge>
              {recommended.isFastest && (
                <Badge variant="secondary">Also fastest</Badge>
              )}
            </div>
            <CardTitle className="text-lg mt-2">{recommended.label}</CardTitle>
            <CardDescription>
              {recommended.distanceKm.toFixed(1)} km · ~{Math.round(recommended.durationMinutes)} min ·
              Safety {recommended.safetyScore}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Why this route
              </p>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                {recommended.reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-green-600 shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
              {recommended.warnings.length > 0 && (
                <ul className="text-sm space-y-1 text-amber-700 dark:text-amber-400">
                  {recommended.warnings.map((w) => (
                    <li key={w} className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Stat label="Potholes" value={recommended.potholeCount} />
              <Stat label="All hazards" value={recommended.issueCount} />
              <Stat label="Critical" value={recommended.criticalCount} warn={recommended.criticalCount > 0} />
              <Stat label="Safety" value={`${recommended.safetyScore}`} suffix="/100" highlight />
            </div>
          </CardContent>
        </Card>
      )}

      {alternatives.length > 0 && !loading && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Other routes — not recommended
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {alternatives.map((r) => (
              <Card
                key={r.id}
                className={`opacity-90 cursor-pointer transition-all hover:border-muted-foreground/30 ${
                  selectedRouteId === r.id ? "ring-2 ring-muted-foreground/20" : ""
                }`}
                onClick={() => focusRoute(r)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {r.isFastest ? (
                        <Badge variant="secondary" className="text-[10px]">Fastest</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Alternate</Badge>
                      )}
                      {r.label}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(r.durationMinutes)} min
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    {r.distanceKm.toFixed(1)} km · Safety {r.safetyScore}/100 · {r.potholeCount} potholes
                  </p>
                  {r.comparisonNote && (
                    <p className="text-red-600/90 dark:text-red-400 font-medium">{r.comparisonNote}</p>
                  )}
                  {r.warnings.map((w) => (
                    <p key={w} className="flex gap-1 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      {w}
                    </p>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); focusRoute(r); }}>
                    <MapPin className="h-3 w-3 mr-1" />
                    Preview on map
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {hospitals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hospital className="h-4 w-4" />
              Nearest hospitals from start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hospitals.slice(0, 3).map((h) => (
              <div key={h.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="font-medium">{h.name}</span>
                <span className="text-muted-foreground">{h.distanceKm} km · ~{h.etaMinutes} min</span>
              </div>
            ))}
            {nearestIcu && (
              <div className="pt-2 flex items-center gap-2">
                <Badge variant="secondary">Nearest ICU</Badge>
                <span className="text-sm font-medium">{nearestIcu.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  warn,
  highlight,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  warn?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/80 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`text-xl font-bold ${warn ? "text-amber-600" : highlight ? "text-green-600" : ""}`}
      >
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
