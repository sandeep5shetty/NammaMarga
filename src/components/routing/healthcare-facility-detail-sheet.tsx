"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AlongRouteFacility } from "@/lib/hospitals/along-route";
import { FACILITY_KIND_LABELS } from "@/types/emergency";
import {
  Droplet,
  MapPin,
  Navigation,
  Phone,
  Plus,
  X,
} from "lucide-react";

type HealthcareFacilityDetailSheetProps = {
  facility: AlongRouteFacility | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRouteStop: boolean;
  onToggleRouteStop: (facility: AlongRouteFacility) => void;
  routeStopCount: number;
  maxRouteStops: number;
};

export function HealthcareFacilityDetailSheet({
  facility,
  open,
  onOpenChange,
  isRouteStop,
  onToggleRouteStop,
  routeStopCount,
  maxRouteStops,
}: HealthcareFacilityDetailSheetProps) {
  if (!facility) return null;

  const showBlood = facility.kind === "BLOOD_BANK" || facility.hasBloodBank;
  const bloodGroups = facility.bloodGroups;
  const canAddStop = isRouteStop || routeStopCount < maxRouteStops;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8 leading-tight">{facility.name}</SheetTitle>
          <SheetDescription className="text-left">
            {FACILITY_KIND_LABELS[facility.kind]} · {facility.distanceFromRouteM}m from your route
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {facility.address && (
            <DetailRow icon={MapPin} label="Address">
              {facility.address}
            </DetailRow>
          )}
          {facility.phone && (
            <DetailRow icon={Phone} label="Phone">
              <a href={`tel:${facility.phone.replace(/\s/g, "")}`} className="text-primary hover:underline">
                {facility.phone}
              </a>
            </DetailRow>
          )}
          {facility.briefInfo && (
            <p className="text-sm text-muted-foreground leading-relaxed">{facility.briefInfo}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {facility.hasEmergency && (
              <Badge variant="secondary" className="text-[10px]">
                24/7 emergency
              </Badge>
            )}
            {facility.hasIcu && (
              <Badge variant="secondary" className="text-[10px]">
                ICU
              </Badge>
            )}
            {facility.hasBloodBank && facility.kind !== "BLOOD_BANK" && (
              <Badge variant="secondary" className="text-[10px]">
                Blood bank on site
              </Badge>
            )}
          </div>

          {showBlood && (
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Droplet className="h-4 w-4 text-rose-600" />
                <p className="text-sm font-semibold">Available blood groups</p>
              </div>
              {bloodGroups && bloodGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {bloodGroups.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center justify-center min-w-[2.5rem] rounded-md border border-rose-500/30 bg-background px-2 py-1 text-xs font-bold text-rose-700 dark:text-rose-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Call the facility to confirm current stock before routing there.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-3">
                Stock levels are indicative — confirm availability by phone before diverting.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Navigation className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Add to Google Maps route</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Stops you add appear as waypoints on the Google Maps driving route, ordered
                  along your green corridor.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              variant={isRouteStop ? "outline" : "primary"}
              disabled={!canAddStop}
              onClick={() => onToggleRouteStop(facility)}
            >
              {isRouteStop ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Remove stop from route
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add stop to route
                </>
              )}
            </Button>
            {!canAddStop && !isRouteStop && (
              <p className="text-[11px] text-muted-foreground text-center">
                Maximum {maxRouteStops} stops — remove one to add another.
              </p>
            )}
            {isRouteStop && (
              <p className="text-[11px] text-green-700 dark:text-green-400 text-center font-medium">
                Included in Open in Google Maps
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-sm mt-0.5">{children}</p>
      </div>
    </div>
  );
}
