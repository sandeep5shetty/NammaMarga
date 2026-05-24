"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, STATUS_LABELS } from "@/types/civic";
import type { IssueType, Severity } from "@prisma/client";
import { Layers, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapIssue {
  id: string;
  title: string;
  type: IssueType;
  severity: Severity;
  status: string;
  latitude: number;
  longitude: number;
  wardId?: string | null;
  ward?: { name: string; number: number } | null;
}

interface Ward {
  id: string;
  name: string;
  number: number;
}

const SEVERITY_LEGEND: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function CivicMap({ embedded = false }: { embedded?: boolean }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<MapIssue | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStyle =
    mounted && resolvedTheme === "light"
      ? "mapbox://styles/mapbox/light-v11"
      : "mapbox://styles/mapbox/dark-v11";

  useEffect(() => setMounted(true), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [issuesRes, wardsRes] = await Promise.all([
        fetch("/api/issues?limit=200"),
        fetch("/api/wards"),
      ]);
      const issuesJson = await issuesRes.json();
      const wardsJson = await wardsRes.json();
      setIssues(issuesJson.data ?? []);
      setWards(wardsJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = issues.filter((i) => {
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (wardFilter !== "all" && i.wardId !== wardFilter) return false;
    return true;
  });

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || !token || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [77.5946, 12.9716],
      zoom: 11.5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      map.resize();
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [token, mapStyle]);

  // Update geojson when filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filtered.map((issue) => ({
        type: "Feature",
        properties: {
          id: issue.id,
          title: issue.title,
          type: issue.type,
          severity: issue.severity,
          status: issue.status,
          color: SEVERITY_COLORS[issue.severity],
          ward: issue.ward ? `Ward ${issue.ward.number}` : "",
        },
        geometry: {
          type: "Point",
          coordinates: [issue.longitude, issue.latitude],
        },
      })),
    };

    const updateSource = () => {
      const existing = map.getSource("issues") as mapboxgl.GeoJSONSource | undefined;

      if (existing) {
        existing.setData(geojson);
        return;
      }

      map.addSource("issues", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 55,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "issues",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#22c55e",
            5,
            "#eab308",
            15,
            "#ef4444",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 15, 30],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#18181b",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "issues",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "issues",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fafafa",
          "circle-opacity": 0.9,
        },
      });

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
          });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const props = feature.properties;
        const issue = filtered.find((i) => i.id === props.id);
        if (issue) setSelectedIssue(issue);

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: true,
          offset: 12,
          className: "civic-map-popup",
        })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="padding:4px 0;font-family:system-ui">
              <p style="font-weight:600;margin:0 0 4px;font-size:14px">${props.title}</p>
              <p style="margin:0 0 6px;font-size:12px;color:#71717a">${ISSUE_TYPE_LABELS[props.type as IssueType]}</p>
              <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:${props.color};color:#fff">${props.severity}</span>
            </div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    if (map.isStyleLoaded()) updateSource();
    else map.once("load", updateSource);
  }, [filtered, token]);

  if (!token) {
    return (
      <Card className="p-8 text-center border-dashed">
        <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">
          Add <code className="text-primary">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.
        </p>
        <p className="text-sm text-muted-foreground">{filtered.length} issues loaded</p>
      </Card>
    );
  }

  const mapHeight = embedded ? "calc(100vh - 220px)" : "calc(100vh - 140px)";

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Sidebar panel */}
      <div className="lg:w-72 shrink-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-9 flex-1 min-w-[120px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITY_LEGEND.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger className="h-9 flex-1 min-w-[120px]">
              <SelectValue placeholder="Ward" />
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

        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        {/* Legend */}
        <Card className="p-3 bg-card/80">
          <p className="text-xs font-medium mb-2 flex items-center gap-1">
            <Layers className="h-3 w-3" /> Severity Legend
          </p>
          <div className="space-y-1.5">
            {SEVERITY_LEGEND.map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: SEVERITY_COLORS[s] }}
                />
                {s}
              </div>
            ))}
          </div>
        </Card>

        <Badge variant="outline" className="text-xs">
          {filtered.length} issues shown
        </Badge>

        {/* Selected issue detail */}
        {selectedIssue && (
          <Card className="p-3 bg-card/80">
            <p className="text-sm font-medium line-clamp-2">{selectedIssue.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {ISSUE_TYPE_LABELS[selectedIssue.type]}
            </p>
            <Badge className="mt-2" style={{ backgroundColor: SEVERITY_COLORS[selectedIssue.severity] }}>
              {selectedIssue.severity}
            </Badge>
            <Button size="sm" className="w-full mt-3" asChild>
              <Link href={`/dashboard/reports/${selectedIssue.id}`}>View details</Link>
            </Button>
          </Card>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-border min-h-[400px]" style={{ height: mapHeight }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Skeleton className="h-8 w-32" />
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
