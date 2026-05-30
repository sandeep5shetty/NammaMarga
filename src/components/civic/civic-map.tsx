"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, STATUS_LABELS } from "@/types/civic";
import type { IssueType, Severity } from "@prisma/client";
import { healthScoreColor } from "@/lib/scoring/road-health";
import { cn } from "@/utils";
import {
  AlertTriangle,
  Crosshair,
  Layers,
  List,
  MapPin,
  Maximize2,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapIssue {
  id: string;
  title: string;
  type: IssueType;
  severity: Severity;
  status: string;
  latitude: number;
  longitude: number;
  priorityScore?: number;
  voteCount?: number;
  wardId?: string | null;
  ward?: { name: string; number: number } | null;
}

interface Ward {
  id: string;
  name: string;
  number: number;
}

const SEVERITY_LEGEND: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ACTIVE_STATUSES = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS"];

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

function buildPopupHtml(issue: MapIssue, isLight: boolean) {
  const muted = isLight ? "#64748b" : "#a1a1aa";
  return `
    <div class="civic-popup-inner">
      <p class="civic-popup-title">${issue.title}</p>
      <p class="civic-popup-meta">${ISSUE_TYPE_LABELS[issue.type]} · ${STATUS_LABELS[issue.status as keyof typeof STATUS_LABELS] ?? issue.status}</p>
      <div class="civic-popup-badges">
        <span class="civic-popup-severity" style="background:${SEVERITY_COLORS[issue.severity]}">${issue.severity}</span>
        ${issue.voteCount ? `<span class="civic-popup-votes" style="color:${muted}">${issue.voteCount} upvotes</span>` : ""}
      </div>
      <a href="/dashboard/reports/${issue.id}" class="civic-popup-link">View full report →</a>
    </div>
  `;
}

export function CivicMap({ embedded = false }: { embedded?: boolean }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const layersReadyRef = useRef(false);
  const eventsBoundRef = useRef(false);
  const lastStyleRef = useRef<string | null>(null);
  const filteredRef = useRef<MapIssue[]>([]);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<MapIssue | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRoadHealth, setShowRoadHealth] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"filters" | "list">("filters");
  const [roadSegments, setRoadSegments] = useState<
    Array<{ id: string; name: string; healthScore: number; coordinates: [number, number][] }>
  >([]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const isLight = mounted && resolvedTheme === "light";
  const mapStyle = isLight ? LIGHT_STYLE : DARK_STYLE;
  const strokeColor = isLight ? "#ffffff" : "#18181b";

  useEffect(() => setMounted(true), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [issuesRes, wardsRes, roadsRes] = await Promise.all([
        fetch("/api/issues?limit=500"),
        fetch("/api/wards"),
        fetch("/api/road-health"),
      ]);
      const [issuesJson, wardsJson, roadsJson] = await Promise.all([
        issuesRes.json(),
        wardsRes.json(),
        roadsRes.json(),
      ]);
      setIssues(issuesJson.data ?? []);
      setWards(wardsJson.data ?? []);
      setRoadSegments(roadsJson.data?.segments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (wardFilter !== "all" && i.wardId !== wardFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (statusFilter === "active" && !ACTIVE_STATUSES.includes(i.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "active" && i.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!i.title.toLowerCase().includes(q) && !i.ward?.name.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [issues, severityFilter, wardFilter, typeFilter, statusFilter, searchQuery]);

  filteredRef.current = filtered;

  const stats = useMemo(() => ({
    total: filtered.length,
    potholes: filtered.filter((i) => i.type === "POTHOLE").length,
    critical: filtered.filter((i) => i.severity === "CRITICAL").length,
    active: filtered.filter((i) => ACTIVE_STATUSES.includes(i.status)).length,
  }), [filtered]);

  const setupLayers = useCallback(
    (map: mapboxgl.Map) => {
      const list = filteredRef.current;
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: list.map((issue) => ({
          type: "Feature",
          properties: {
            id: issue.id,
            title: issue.title,
            type: issue.type,
            severity: issue.severity,
            status: issue.status,
            color: SEVERITY_COLORS[issue.severity],
            isCritical: issue.severity === "CRITICAL" ? 1 : 0,
          },
          geometry: {
            type: "Point",
            coordinates: [issue.longitude, issue.latitude],
          },
        })),
      };

      const roadGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: roadSegments.map((r) => ({
          type: "Feature",
          properties: {
            name: r.name,
            healthScore: r.healthScore,
            color: healthScoreColor(r.healthScore),
          },
          geometry: { type: "LineString", coordinates: r.coordinates },
        })),
      };

      const removeLayer = (id: string) => {
        if (map.getLayer(id)) map.removeLayer(id);
      };
      const removeSource = (id: string) => {
        if (map.getSource(id)) map.removeSource(id);
      };

      ["road-health", "road-health-label", "issue-heatmap", "clusters", "cluster-count", "unclustered-point", "critical-pulse"].forEach(removeLayer);
      ["roads", "issues"].forEach(removeSource);

      if (roadSegments.length) {
        map.addSource("roads", { type: "geojson", data: roadGeojson });
        map.addLayer({
          id: "road-health",
          type: "line",
          source: "roads",
          layout: { visibility: showRoadHealth ? "visible" : "none" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": 6,
            "line-opacity": 0.9,
          },
        });
      }

      map.addSource("issues", {
        type: "geojson",
        data: geojson,
        cluster: showClusters,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      if (showHeatmap) {
        map.addLayer({
          id: "issue-heatmap",
          type: "heatmap",
          source: "issues",
          maxzoom: 14,
          paint: {
            "heatmap-weight": [
              "interpolate", ["linear"], ["get", "isCritical"],
              0, 0.5, 1, 2,
            ],
            "heatmap-intensity": 1.4,
            "heatmap-radius": 32,
            "heatmap-opacity": showClusters ? 0.55 : 0.75,
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(34,197,94,0)",
              0.25, "rgba(234,179,8,0.5)",
              0.55, "rgba(249,115,22,0.75)",
              1, "rgba(239,68,68,0.95)",
            ],
          },
        });
      }

      if (showClusters) {
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "issues",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step", ["get", "point_count"],
              "#22c55e", 8,
              "#eab308", 20,
              "#f97316", 40,
              "#ef4444",
            ],
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 25, 28, 50, 34],
            "circle-opacity": 0.92,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": strokeColor,
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "issues",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 13,
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          },
          paint: { "text-color": isLight ? "#0f172a" : "#ffffff" },
        });
      }

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "issues",
        filter: showClusters ? ["!", ["has", "point_count"]] : undefined,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 5, 14, 10, 16, 12,
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": strokeColor,
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "critical-pulse",
        type: "circle",
        source: "issues",
        filter: showClusters
          ? ["all", ["!", ["has", "point_count"]], ["==", ["get", "severity"], "CRITICAL"]]
          : ["==", ["get", "severity"], "CRITICAL"],
        paint: {
          "circle-color": SEVERITY_COLORS.CRITICAL,
          "circle-radius": 14,
          "circle-opacity": 0.25,
          "circle-stroke-width": 0,
        },
      });

      layersReadyRef.current = true;
    },
    [roadSegments, showHeatmap, showRoadHealth, showClusters, strokeColor, isLight],
  );

  const bindMapEvents = useCallback((map: mapboxgl.Map) => {
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      if (!features[0]?.properties) return;
      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource("issues") as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
          zoom,
          duration: 800,
        });
      });
    });

    const openIssuePopup = (issue: MapIssue, lngLat: mapboxgl.LngLat) => {
      setSelectedIssue(issue);
      setSidebarTab("list");
      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 16,
        maxWidth: "280px",
        className: "civic-map-popup",
      })
        .setLngLat(lngLat)
        .setHTML(buildPopupHtml(issue, isLight))
        .addTo(map);
    };

    map.on("click", "unclustered-point", (e) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const issue = filteredRef.current.find((i) => i.id === feature.properties?.id);
      if (issue) openIssuePopup(issue, e.lngLat);
    });

    ["clusters", "unclustered-point"].forEach((layer) => {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    });
  }, [isLight]);

  useEffect(() => {
    if (!mapContainer.current || !token || !mounted) return;

    if (!mapRef.current) {
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [77.5946, 12.9716],
        zoom: 11.2,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
      map.addControl(
        new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
        "top-right",
      );
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

      map.on("load", () => {
        lastStyleRef.current = mapStyle;
        setupLayers(map);
        if (!eventsBoundRef.current) {
          bindMapEvents(map);
          eventsBoundRef.current = true;
        }
      });

      mapRef.current = map;
      return () => {
        popupRef.current?.remove();
        map.remove();
        mapRef.current = null;
        layersReadyRef.current = false;
        eventsBoundRef.current = false;
        lastStyleRef.current = null;
      };
    }

    const map = mapRef.current;
    if (lastStyleRef.current !== mapStyle) {
      lastStyleRef.current = mapStyle;
      layersReadyRef.current = false;
      map.setStyle(mapStyle);
      map.once("style.load", () => {
        setupLayers(map);
      });
    }
  }, [token, mounted, mapStyle, setupLayers, bindMapEvents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReadyRef.current) return;

    const run = () => setupLayers(map);
    if (map.isStyleLoaded()) run();
    else map.once("style.load", run);
  }, [filtered, showHeatmap, showRoadHealth, showClusters, setupLayers]);

  const flyToIssue = (issue: MapIssue) => {
    setSelectedIssue(issue);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [issue.longitude, issue.latitude],
      zoom: 15,
      duration: 1200,
      essential: true,
    });
    popupRef.current?.remove();
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      offset: 16,
      className: "civic-map-popup",
    })
      .setLngLat([issue.longitude, issue.latitude])
      .setHTML(buildPopupHtml(issue, isLight))
      .addTo(map);
  };

  const fitAllIssues = () => {
    const map = mapRef.current;
    if (!map || filtered.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    filtered.forEach((i) => bounds.extend([i.longitude, i.latitude]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 1000 });
  };

  if (!token) {
    return (
      <Card className="p-8 text-center border-dashed">
        <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">
          Add <code className="text-primary">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.
        </p>
      </Card>
    );
  }

  const mapHeight = embedded ? "min(72vh, 720px)" : "min(78vh, 800px)";

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "On map", value: stats.total, icon: MapPin },
          { label: "Potholes", value: stats.potholes, icon: AlertTriangle, accent: "text-orange-500" },
          { label: "Critical", value: stats.critical, icon: AlertTriangle, accent: "text-red-500" },
          { label: "Active", value: stats.active, icon: Layers, accent: "text-emerald-500" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={cn("h-4 w-4", accent ?? "text-muted-foreground")} />
            </div>
            <p className="text-2xl font-bold mt-1">{loading ? "—" : value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Sidebar */}
        <Card className="xl:w-[340px] shrink-0 flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Map controls</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitAllIssues} title="Fit all issues">
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData} disabled={loading} title="Refresh">
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as "filters" | "list")}>
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="filters" className="text-xs">Filters & layers</TabsTrigger>
                <TabsTrigger value="list" className="text-xs">
                  <List className="h-3 w-3 mr-1" />
                  Issues ({filtered.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex-1 pt-0 space-y-4">
            {sidebarTab === "filters" ? (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or ward..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">Issue type</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="POTHOLE">Potholes only</SelectItem>
                        {Object.keys(ISSUE_TYPE_LABELS).filter((t) => t !== "POTHOLE").map((t) => (
                          <SelectItem key={t} value={t}>
                            {ISSUE_TYPE_LABELS[t as IssueType]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {SEVERITY_LEGEND.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">Ward</Label>
                    <Select value={wardFilter} onValueChange={setWardFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All wards</SelectItem>
                        {wards.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.number} — {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active only</SelectItem>
                        <SelectItem value="all">All statuses</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" /> Map layers
                  </p>
                  {[
                    { id: "heatmap", label: "Density heatmap", desc: "Hotspots of complaints", checked: showHeatmap, onChange: setShowHeatmap },
                    { id: "clusters", label: "Cluster markers", desc: "Group nearby issues", checked: showClusters, onChange: setShowClusters },
                    { id: "roads", label: "Road health", desc: "Green = healthy, red = damaged", checked: showRoadHealth, onChange: setShowRoadHealth },
                  ].map((layer) => (
                    <div key={layer.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-2.5">
                      <div>
                        <Label htmlFor={layer.id} className="text-xs font-medium cursor-pointer">
                          {layer.label}
                        </Label>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{layer.desc}</p>
                      </div>
                      <Switch id={layer.id} checked={layer.checked} onCheckedChange={layer.onChange} />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium mb-2">Severity legend</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SEVERITY_LEGEND.map((s) => (
                      <div key={s} className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[s] }} />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <ScrollArea className="h-[min(52vh,480px)] pr-3">
                <div className="space-y-2">
                  {filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No issues match filters</p>
                  )}
                  {filtered.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => flyToIssue(issue)}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/60",
                        selectedIssue?.id === issue.id && "border-primary bg-primary/5",
                      )}
                    >
                      <p className="text-sm font-medium line-clamp-2">{issue.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {ISSUE_TYPE_LABELS[issue.type]}
                        </Badge>
                        <Badge
                          className="text-[10px] h-5 text-white border-0"
                          style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                      {issue.ward && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Ward {issue.ward.number} · {issue.ward.name}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedIssue && sidebarTab === "filters" && (
              <Card className="border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground mb-1">Selected</p>
                <p className="text-sm font-medium line-clamp-2">{selectedIssue.title}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => flyToIssue(selectedIssue)}>
                    <Crosshair className="h-3 w-3 mr-1" />
                    Zoom
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs" asChild>
                    <Link href={`/dashboard/reports/${selectedIssue.id}`}>Details</Link>
                  </Button>
                </div>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Map canvas */}
        <div
          className="flex-1 relative rounded-xl overflow-hidden border border-border shadow-sm min-h-[400px]"
          style={{ height: mapHeight }}
        >
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading civic data...</p>
            </div>
          )}
          {!loading && (
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
              <Badge className="bg-background/90 backdrop-blur border shadow-sm pointer-events-auto">
                {isLight ? "Light map" : "Dark map"} · {filtered.length} visible
              </Badge>
            </div>
          )}
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        </div>
      </div>
    </div>
  );
}
