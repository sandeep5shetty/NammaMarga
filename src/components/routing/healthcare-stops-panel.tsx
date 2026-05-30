"use client";

import type { AlongRouteFacility } from "@/lib/hospitals/along-route";
import { FACILITY_KIND_LABELS, FACILITY_KIND_MAP_COLOR } from "@/types/emergency";
import { cn } from "@/utils";
import { Droplet, Hospital, MapPin, Pill, Stethoscope, TestTube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HealthFacilityKind } from "@prisma/client";

const KIND_ICON: Record<HealthFacilityKind, LucideIcon> = {
  HOSPITAL: Hospital,
  FIRST_AID: Stethoscope,
  TRAUMA_CENTER: Hospital,
  BLOOD_BANK: Droplet,
  PHARMACY: Pill,
  DIAGNOSTIC: TestTube,
  CLINIC: Stethoscope,
};

type HealthcareStopsPanelProps = {
  facilities: AlongRouteFacility[];
  selectedId?: string | null;
  onSelect?: (facility: AlongRouteFacility) => void;
  /** Shorter cap for wizard / stacked layouts */
  compact?: boolean;
  /** Stretch to parent height (e.g. beside the map) */
  fillHeight?: boolean;
  className?: string;
};

export function HealthcareStopsPanel({
  facilities,
  selectedId,
  onSelect,
  compact,
  fillHeight,
  className,
}: HealthcareStopsPanelProps) {
  if (facilities.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center",
          className,
        )}
      >
        <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm font-medium">No healthcare stops on this route</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Try another route or a destination with more nearby care facilities.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-0",
        fillHeight && "h-full",
        className,
      )}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border/80 bg-muted/30">
        <div>
          <p className="text-sm font-semibold">On your route</p>
          <p className="text-[11px] text-muted-foreground">
            {facilities.length} stop{facilities.length !== 1 ? "s" : ""} — tap to locate on map
          </p>
        </div>
      </div>
      <ul
        className={cn(
          "divide-y divide-border/60 overflow-y-auto overscroll-contain flex-1 min-h-0",
          !fillHeight &&
            (compact ? "max-h-[min(360px,45vh)]" : "max-h-[min(480px,60vh)]"),
        )}
      >
        {facilities.map((f) => {
          const Icon = KIND_ICON[f.kind] ?? MapPin;
          const color = FACILITY_KIND_MAP_COLOR[f.kind];
          const selected = f.id === selectedId;

          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onSelect?.(f)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
                  selected && "bg-primary/5",
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 shadow-sm"
                  style={{ backgroundColor: color, color: "#fff" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-sm leading-tight block truncate">{f.name}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {FACILITY_KIND_LABELS[f.kind]} · {f.distanceFromRouteM}m from route
                  </span>
                  {(f.hasBloodBank || f.hasIcu) && (
                    <span className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-1.5">
                      {f.hasBloodBank && (
                        <span className="rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 px-1.5 py-0.5">
                          Blood
                        </span>
                      )}
                      {f.hasIcu && (
                        <span className="rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 px-1.5 py-0.5">
                          ICU
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
