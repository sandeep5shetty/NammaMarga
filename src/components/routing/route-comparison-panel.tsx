"use client";

import {
  RouteGoogleMapsCTA,
  type RouteNavigationEndpoints,
} from "@/components/routing/green-corridor-google-maps-cta";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RouteAnalysis } from "@/lib/routing/emergency-route";
import { getRouteColor } from "@/lib/routing/emergency-route";
import type { RouteStop } from "@/lib/routing/route-stops";
import { cn } from "@/utils";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Route,
  Shield,
  Zap,
} from "lucide-react";
import { useState } from "react";

type RouteComparisonPanelProps = {
  routes: RouteAnalysis[];
  recommended: RouteAnalysis;
  selectedRouteId: string | null;
  onSelectRoute: (route: RouteAnalysis) => void;
  navigation: RouteNavigationEndpoints;
  routeStops?: RouteStop[];
  compact?: boolean;
};

function routeShortLabel(r: RouteAnalysis): string {
  if (r.isRecommended) return "Green corridor";
  if (r.isFastest) return "Fastest";
  return `Route ${r.routeIndex + 1}`;
}

function buildRejectionSummary(alt: RouteAnalysis, rec: RouteAnalysis): string {
  const parts: string[] = [];
  if (alt.potholeCount > rec.potholeCount) {
    parts.push(`${alt.potholeCount - rec.potholeCount} more pothole(s)`);
  }
  if (alt.issueCount > rec.issueCount) {
    parts.push(`${alt.issueCount - rec.issueCount} more hazard(s)`);
  }
  if (alt.hazardIndex > rec.hazardIndex) {
    parts.push(`higher hazard index (${alt.hazardIndex.toFixed(1)} vs ${rec.hazardIndex.toFixed(1)})`);
  }
  if (parts.length === 0) {
    return "Lower combined safety score than the green corridor for ambulance routing.";
  }
  return `${parts.join(" · ")} than the green corridor.`;
}

function RouteMapsButton({
  route,
  navigation,
  routeStops,
  className,
}: {
  route: RouteAnalysis;
  navigation: RouteNavigationEndpoints;
  routeStops?: RouteStop[];
  className?: string;
}) {
  return (
    <RouteGoogleMapsCTA
      route={route}
      origin={navigation.origin}
      destination={navigation.destination}
      routeStops={routeStops}
      className={className}
    />
  );
}

export function RouteComparisonPanel({
  routes,
  recommended,
  selectedRouteId,
  onSelectRoute,
  navigation,
  routeStops,
  compact,
}: RouteComparisonPanelProps) {
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [alternatesOpen, setAlternatesOpen] = useState(false);

  const activeId = selectedRouteId ?? recommended.id;
  const active = routes.find((r) => r.id === activeId) ?? recommended;
  const alternates = routes.filter((r) => !r.isRecommended);
  const isGreen = active.isRecommended;

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/80 bg-muted/40">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">
            {routes.length > 1 ? "Compare routes" : "Your green corridor"}
          </h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Tap to preview on map
          </span>
        </div>
        {routeStops && routeStops.length > 0 && (
          <p className="text-[11px] text-green-700 dark:text-green-400 mt-1.5">
            {routeStops.length} healthcare stop{routeStops.length !== 1 ? "s" : ""} will be waypoints in
            Google Maps
          </p>
        )}
      </div>

      <div className="flex gap-2 p-3 overflow-x-auto scrollbar-thin border-b border-border/60 bg-background/80">
        {routes.map((r) => {
          const selected = r.id === activeId;
          const color = getRouteColor(r);
          const label = routeShortLabel(r);
          return (
            <div
              key={r.id}
              className={cn(
                "shrink-0 flex items-stretch rounded-lg border min-w-[168px] overflow-hidden transition-all",
                selected
                  ? "border-foreground/25 bg-background shadow-sm ring-2 ring-offset-1 ring-offset-card"
                  : "border-border/70 bg-muted/30 hover:bg-muted/50 hover:border-border",
              )}
              style={selected ? { boxShadow: `0 0 0 2px ${color}55` } : undefined}
            >
              <button
                type="button"
                onClick={() => onSelectRoute(r)}
                className="flex flex-col items-start gap-1 px-3 py-2 text-left flex-1 min-w-0"
              >
                <span className="flex items-center gap-1.5 w-full">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-semibold truncate">{label}</span>
                </span>
                <span className="text-[11px] text-muted-foreground pl-3.5">
                  ~{Math.round(r.durationMinutes)} min · {r.distanceKm.toFixed(1)} km
                </span>
              </button>
              <div className="flex items-center pr-1.5 shrink-0">
                <RouteMapsButton route={r} navigation={navigation} routeStops={routeStops} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "mx-3 mt-3 rounded-lg border p-4",
          isGreen
            ? "border-green-500/40 bg-gradient-to-br from-green-500/10 via-card to-card"
            : "border-border bg-muted/20",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isGreen ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white shrink-0">
                <Shield className="h-4 w-4" />
              </span>
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ backgroundColor: `${getRouteColor(active)}22` }}
              >
                <Route className="h-4 w-4" style={{ color: getRouteColor(active) }} />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{active.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isGreen ? "Recommended for ambulance" : "Alternate Mapbox route"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isGreen && recommended.isFastest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-600/15 text-green-700 dark:text-green-400 px-2 py-0.5 text-[10px] font-medium border border-green-500/25">
                <Zap className="h-3 w-3" />
                Also fastest
              </span>
            )}
            <RouteMapsButton route={active} navigation={navigation} routeStops={routeStops} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MetricTile
            icon={<Clock className="h-3.5 w-3.5" />}
            label="ETA"
            value={`~${Math.round(active.durationMinutes)}m`}
            highlight={active.durationMinutes === Math.min(...routes.map((r) => r.durationMinutes))}
          />
          <MetricTile
            label="Potholes"
            value={String(active.potholeCount)}
            highlight={active.potholeCount === Math.min(...routes.map((r) => r.potholeCount))}
            highlightClass="text-green-600 dark:text-green-400"
          />
          <MetricTile
            label="Hazards"
            value={String(active.issueCount)}
            highlight={active.issueCount === Math.min(...routes.map((r) => r.issueCount))}
            highlightClass="text-green-600 dark:text-green-400"
          />
          <MetricTile
            label="Safety"
            value={`${active.safetyScore}`}
            highlight={active.safetyScore === Math.max(...routes.map((r) => r.safetyScore))}
            highlightClass="text-green-600 dark:text-green-400"
          />
        </div>

        {!isGreen && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed rounded-md bg-background/60 border border-border/60 px-3 py-2">
            <span className="font-medium text-foreground">vs green corridor: </span>
            {buildRejectionSummary(active, recommended)}
          </p>
        )}

        {isGreen && !compact && active.reasons.length > 0 && (
          <Collapsible open={reasonsOpen} onOpenChange={setReasonsOpen} className="mt-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-medium text-green-700 dark:text-green-400 hover:underline">
              Why this route was chosen
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", reasonsOpen && "rotate-180")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {active.reasons.slice(0, 4).map((r) => (
                <p key={r} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                  {r}
                </p>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {alternates.length > 0 && (
        <Collapsible
          open={alternatesOpen}
          onOpenChange={setAlternatesOpen}
          className="mx-3 mb-3 mt-1"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5 text-xs font-medium hover:bg-muted/40 transition-colors">
            <span>Other routes ({alternates.length})</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                alternatesOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1.5">
            {alternates.map((r) => {
              const label = routeShortLabel(r);
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-2 transition-colors",
                    r.id === activeId
                      ? "border-border bg-background shadow-sm"
                      : "border-transparent bg-muted/20 hover:bg-muted/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectRoute(r)}
                    className="flex flex-1 items-center gap-3 min-w-0 text-left py-0.5"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getRouteColor(r) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ~{Math.round(r.durationMinutes)} min · {r.potholeCount} potholes · Safety{" "}
                        {r.safetyScore}
                      </p>
                    </div>
                    {r.isFastest && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                        Fastest
                      </span>
                    )}
                  </button>
                  <RouteMapsButton route={r} navigation={navigation} routeStops={routeStops} />
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  highlight,
  highlightClass,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  highlightClass?: string;
}) {
  return (
    <div className="rounded-lg bg-background/80 border border-border/50 px-2 py-2 text-center">
      {icon && (
        <div className="flex justify-center text-muted-foreground mb-0.5">{icon}</div>
      )}
      <p
        className={cn(
          "text-sm font-bold tabular-nums leading-none",
          highlight && (highlightClass ?? "text-foreground"),
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
