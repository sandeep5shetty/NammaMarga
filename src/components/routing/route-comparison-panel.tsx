"use client";

import { Badge } from "@/components/ui/badge";
import type { RouteAnalysis } from "@/lib/routing/emergency-route";
import { getRouteColor } from "@/lib/routing/emergency-route";
import { cn } from "@/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";

type RouteComparisonPanelProps = {
  routes: RouteAnalysis[];
  recommended: RouteAnalysis;
  selectedRouteId: string | null;
  onSelectRoute: (route: RouteAnalysis) => void;
  compact?: boolean;
};

export function RouteComparisonPanel({
  routes,
  recommended,
  selectedRouteId,
  onSelectRoute,
  compact,
}: RouteComparisonPanelProps) {
  const alternates = routes.filter((r) => !r.isRecommended);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Route comparison</h3>
        <p className="text-[10px] text-muted-foreground">
          Tap a route to preview on map
        </p>
      </div>

      {/* Comparison table — demo-friendly */}
      <div className="rounded-lg border border-border overflow-hidden text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-2 font-medium text-muted-foreground">Metric</th>
              <th className="p-2 font-medium text-green-700 dark:text-green-400 text-center min-w-[72px]">
                Green corridor
              </th>
              {alternates.map((r) => (
                <th
                  key={r.id}
                  className="p-2 font-medium text-muted-foreground text-center min-w-[72px]"
                >
                  {r.isFastest ? "Fastest" : r.label.replace("Alternate route ", "Alt ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <CompareRow
              label="ETA"
              values={routes.map((r) => `~${Math.round(r.durationMinutes)} min`)}
              bestId={routes.reduce((a, b) => (a.durationMinutes < b.durationMinutes ? a : b)).id}
              routeIds={routes.map((r) => r.id)}
            />
            <CompareRow
              label="Potholes"
              values={routes.map((r) => String(r.potholeCount))}
              bestId={routes.reduce((a, b) => (a.potholeCount < b.potholeCount ? a : b)).id}
              routeIds={routes.map((r) => r.id)}
              lowerIsBetter
            />
            <CompareRow
              label="Hazards"
              values={routes.map((r) => String(r.issueCount))}
              bestId={routes.reduce((a, b) => (a.issueCount < b.issueCount ? a : b)).id}
              routeIds={routes.map((r) => r.id)}
              lowerIsBetter
            />
            <CompareRow
              label="Safety score"
              values={routes.map((r) => `${r.safetyScore}/100`)}
              bestId={routes.reduce((a, b) => (a.safetyScore > b.safetyScore ? a : b)).id}
              routeIds={routes.map((r) => r.id)}
            />
            <CompareRow
              label="Hazard index"
              values={routes.map((r) => r.hazardIndex.toFixed(1))}
              bestId={routes.reduce((a, b) => (a.hazardIndex < b.hazardIndex ? a : b)).id}
              routeIds={routes.map((r) => r.id)}
              lowerIsBetter
            />
          </tbody>
        </table>
      </div>

      {/* Recommended card */}
      <button
        type="button"
        onClick={() => onSelectRoute(recommended)}
        className={cn(
          "w-full text-left rounded-xl border-2 border-green-500 bg-green-500/10 p-4 transition-all",
          selectedRouteId === recommended.id && "ring-2 ring-green-500/50",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className="bg-green-600 text-white border-0 gap-1">
            <Shield className="h-3 w-3" />
            Chosen — Green corridor
          </Badge>
          {recommended.isFastest && (
            <Badge variant="secondary" className="text-[10px]">Also fastest</Badge>
          )}
        </div>
        <p className="font-semibold text-sm mb-1">{recommended.label}</p>
        <p className="text-xs text-muted-foreground mb-3">
          {recommended.distanceKm.toFixed(1)} km · ~{Math.round(recommended.durationMinutes)} min ·
          Lowest hazard exposure for ambulance routing
        </p>
        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
          Why we chose this route
        </p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          {recommended.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              {r}
            </li>
          ))}
        </ul>
        {!compact && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-green-500/20">
            <StatChip label="Potholes" value={recommended.potholeCount} good />
            <StatChip label="Hazards" value={recommended.issueCount} />
            <StatChip label="Safety" value={`${recommended.safetyScore}`} good />
          </div>
        )}
      </button>

      {/* Alternates */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5 text-red-500/80" />
          Not chosen — {alternates.length} other route{alternates.length !== 1 ? "s" : ""}
        </p>
        {alternates.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRoute(r)}
            className={cn(
              "w-full text-left rounded-xl border border-border bg-muted/20 p-4 transition-all hover:bg-muted/40",
              selectedRouteId === r.id && "ring-2 ring-muted-foreground/30 border-muted-foreground/40",
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                  style={{ background: getRouteColor(r) }}
                />
                <span className="font-medium text-sm">{r.label}</span>
                {r.isFastest && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                    <Zap className="h-3 w-3" />
                    Fastest
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 border-red-500/30 text-red-600 dark:text-red-400">
                Not recommended
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{Math.round(r.durationMinutes)} min
              </span>
              <span>{r.potholeCount} potholes</span>
              <span>{r.issueCount} hazards</span>
              <span>Safety {r.safetyScore}/100</span>
            </div>

            {r.comparisonNote && (
              <p className="text-xs font-medium text-red-600/90 dark:text-red-400 mb-2 p-2 rounded-md bg-red-500/5 border border-red-500/20">
                {r.comparisonNote}
              </p>
            )}

            <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1.5">
              Why we did not choose this route
            </p>
            <ul className="text-xs space-y-1.5">
              {buildRejectionReasons(r, recommended).map((reason) => (
                <li key={reason} className="flex gap-2 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  {reason}
                </li>
              ))}
              {r.warnings.map((w) => (
                <li key={w} className="flex gap-2 text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5 text-red-500/70 shrink-0 mt-0.5" />
                  {w}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function buildRejectionReasons(alt: RouteAnalysis, rec: RouteAnalysis): string[] {
  const reasons: string[] = [];

  if (alt.potholeCount > rec.potholeCount) {
    reasons.push(
      `${alt.potholeCount - rec.potholeCount} more pothole(s) on this path than the green corridor (${rec.potholeCount})`,
    );
  }
  if (alt.issueCount > rec.issueCount) {
    reasons.push(
      `${alt.issueCount - rec.issueCount} additional civic hazard(s) compared to the chosen route`,
    );
  }
  if (alt.hazardIndex > rec.hazardIndex) {
    reasons.push(
      `Higher hazard index (${alt.hazardIndex.toFixed(1)} vs ${rec.hazardIndex.toFixed(1)} on green corridor)`,
    );
  }
  if (alt.safetyScore < rec.safetyScore) {
    reasons.push(
      `Lower safety score (${alt.safetyScore}/100 vs ${rec.safetyScore}/100)`,
    );
  }
  if (alt.isFastest && alt.potholeCount >= rec.potholeCount) {
    reasons.push(
      `Faster by ~${Math.max(0, Math.round(alt.durationMinutes - rec.durationMinutes))} min but exposes patient to more road damage`,
    );
  }
  if (reasons.length === 0) {
    reasons.push("Another Mapbox alternate exists, but green corridor has the best combined safety score");
  }

  return reasons;
}

function CompareRow({
  label,
  values,
  bestId,
  routeIds,
  lowerIsBetter,
}: {
  label: string;
  values: string[];
  bestId: string;
  routeIds: string[];
  lowerIsBetter?: boolean;
}) {
  return (
    <tr>
      <td className="p-2 text-muted-foreground font-medium">{label}</td>
      {values.map((val, i) => {
        const isBest = routeIds[i] === bestId;
        const isRecommended = i === 0;
        return (
          <td
            key={routeIds[i]}
            className={cn(
              "p-2 text-center font-medium",
              isRecommended && "bg-green-500/5",
              isBest && "text-green-700 dark:text-green-400",
            )}
          >
            {val}
            {isBest && !isRecommended && lowerIsBetter !== undefined && (
              <span className="block text-[9px] text-muted-foreground font-normal">best</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function StatChip({
  label,
  value,
  good,
}: {
  label: string;
  value: number | string;
  good?: boolean;
}) {
  return (
    <div className="rounded-md bg-background/80 py-1.5 text-center">
      <p className={cn("text-base font-bold", good && "text-green-600")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
