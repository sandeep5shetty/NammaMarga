"use client";

import {
  EmergencyRouteWizard,
  type EmergencyWizardResult,
} from "@/components/routing/emergency-route-wizard";
import { EmergencyRouteMap } from "@/components/routing/emergency-route-map";
import { HealthcareFacilityDetailSheet } from "@/components/routing/healthcare-facility-detail-sheet";
import { HealthcareStopsPanel } from "@/components/routing/healthcare-stops-panel";
import { RouteGoogleMapsCTA } from "@/components/routing/green-corridor-google-maps-cta";
import { RouteComparisonPanel } from "@/components/routing/route-comparison-panel";
import { useGreenCorridorRouteStops } from "@/components/routing/use-green-corridor-route-stops";
import { filterFacilitiesForRoute } from "@/lib/hospitals/along-route";
import {
  countNearbyPotholesForRoute,
  NEARBY_POTHOLE_RADIUS_KM,
} from "@/lib/routing/nearby-route-potholes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FACILITY_KIND_LABELS } from "@/types/emergency";
import { cn } from "@/utils";
import { Ambulance, MapPin, RotateCcw, Shield } from "lucide-react";
import { useEffect, useState } from "react";

type EmergencyRouteExperienceProps = {
  /** Public marketing page — opens wizard immediately, no dashboard chrome */
  variant?: "public" | "app";
};

export function EmergencyRouteExperience({ variant = "public" }: EmergencyRouteExperienceProps) {
  const [wizardOpen, setWizardOpen] = useState(variant === "public");
  const [result, setResult] = useState<EmergencyWizardResult | null>(null);
  const [showNearbyPotholes, setShowNearbyPotholes] = useState(true);
  const [showHealthcare, setShowHealthcare] = useState(true);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [highlightFacilityId, setHighlightFacilityId] = useState<string | null>(null);

  const activeRouteId = focusRouteId ?? result?.recommended.id ?? null;
  const activeRoute =
    result?.routes.find((r) => r.id === activeRouteId) ?? result?.recommended ?? null;
  const routeHealthcareStops = result
    ? filterFacilitiesForRoute(result.alongRouteFacilities, activeRouteId)
    : [];

  const nearbyPotholeCount =
    result && activeRoute
      ? countNearbyPotholesForRoute(result.hazards, activeRoute)
      : 0;

  const {
    routeStops,
    routeStopIds,
    detailFacility,
    detailOpen,
    setDetailOpen,
    openFacilityDetail,
    toggleRouteStop,
    clearRouteStops,
    maxRouteStops,
  } = useGreenCorridorRouteStops(activeRoute?.geometry);

  useEffect(() => {
    if (variant === "app") setWizardOpen(true);
  }, [variant]);

  const isPublic = variant === "public";

  return (
    <div className={isPublic ? "px-4 pb-16 max-w-5xl mx-auto" : "space-y-6"}>
      {isPublic && (
        <div className="text-center pt-4 pb-8">
          <Badge className="mb-4 bg-green-600/10 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-600/10">
            No login required · Free for everyone
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Emergency{" "}
            <span className="text-transparent bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text">
              Green Corridor
            </span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-balance">
            Find the safest route to hospitals and first-aid centres - scored against
            live potholes from NammaMarga civic data.
          </p>
          {!wizardOpen && !result && (
            <Button
              size="lg"
              className="mt-6 bg-red-600 hover:bg-red-700 text-white border border-red-700/80 shadow-lg shadow-red-900/25 dark:bg-red-600 dark:hover:bg-red-500"
              onClick={() => setWizardOpen(true)}
            >
              <Shield className="h-4 w-4 mr-2" />
              Start route planner
            </Button>
          )}
        </div>
      )}

      {!isPublic && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
              <Ambulance className="h-6 w-6 text-red-500" />
              Emergency Route Intelligence
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Find the safest green corridor to hospitals and first-aid centres.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} size="lg" className="shrink-0">
            <Shield className="h-4 w-4 mr-2" />
            {result ? "New emergency route" : "Start emergency routing"}
          </Button>
        </div>
      )}

      <EmergencyRouteWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={(r) => {
          setResult(r);
          setFocusRouteId(r.recommended.id);
          clearRouteStops();
          if (isPublic) setWizardOpen(false);
        }}
        publicMode={isPublic}
      />

      {!result && !wizardOpen && !isPublic && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Start the wizard to plan a pothole-aware emergency route.</p>
            <Button className="mt-4" variant="outline" onClick={() => setWizardOpen(true)}>
              Open route planner
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className={cn(isPublic ? "mt-6 space-y-6" : "space-y-6")}>
          <Card className="border-green-500/30 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-600 text-white border-0">Green corridor active</Badge>
                <Badge variant="secondary">{FACILITY_KIND_LABELS[result.facility.kind]}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">
                {result.source.name} → {result.facility.name}
              </CardTitle>
              <CardDescription>
                {activeRoute
                  ? `${activeRoute.distanceKm.toFixed(1)} km · ~${Math.round(activeRoute.durationMinutes)} min · Safety ${activeRoute.safetyScore}/100 · ${nearbyPotholeCount} pothole${nearbyPotholeCount !== 1 ? "s" : ""} within ${NEARBY_POTHOLE_RADIUS_KM} km`
                  : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Plan another route
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  id="nearby-potholes-page"
                  checked={showNearbyPotholes}
                  onCheckedChange={setShowNearbyPotholes}
                />
                <Label htmlFor="nearby-potholes-page" className="text-xs">
                  Nearby potholes ({NEARBY_POTHOLE_RADIUS_KM} km)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="health-page"
                  checked={showHealthcare}
                  onCheckedChange={setShowHealthcare}
                />
                <Label htmlFor="health-page" className="text-xs">
                  Healthcare stops
                </Label>
              </div>
              </div>
              {activeRoute && (
                <RouteGoogleMapsCTA
                  route={activeRoute}
                  routeStops={routeStops}
                  origin={{
                    latitude: result.source.latitude,
                    longitude: result.source.longitude,
                    label: result.source.placeName ?? result.source.name,
                  }}
                  destination={{
                    latitude: result.facility.latitude,
                    longitude: result.facility.longitude,
                    label: result.facility.name,
                  }}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_min(320px,100%)] lg:items-stretch">
            <EmergencyRouteMap
              className="h-[min(480px,60vh)]"
              routes={result.routes}
              hazards={result.hazards}
              alongRouteFacilities={result.alongRouteFacilities}
              source={{ ...result.source, placeName: result.source.placeName }}
              destination={{
                latitude: result.facility.latitude,
                longitude: result.facility.longitude,
                placeName: result.facility.name,
              }}
              focusRouteId={activeRouteId}
              onSelectRoute={(id) => {
                setFocusRouteId(id);
                setHighlightFacilityId(null);
              }}
              showNearbyPotholes={showNearbyPotholes}
              showHealthcareStops={showHealthcare}
              highlightFacilityId={highlightFacilityId}
              routeStopIds={routeStopIds}
              onFacilitySelect={(f) => {
                setHighlightFacilityId(f.id);
                openFacilityDetail(f);
              }}
              comparisonMode
            />

            {showHealthcare && (
              <HealthcareStopsPanel
                fillHeight
                className="h-[min(480px,60vh)]"
                facilities={routeHealthcareStops}
                selectedId={highlightFacilityId}
                routeStopIds={routeStopIds}
                onOpenDetail={(f) => {
                  setHighlightFacilityId(f.id);
                  openFacilityDetail(f);
                }}
              />
            )}
          </div>

          {activeRoute && (
            <RouteComparisonPanel
              routes={result.routes}
              recommended={result.recommended}
              selectedRouteId={activeRouteId}
              onSelectRoute={(r) => setFocusRouteId(r.id)}
              routeStops={routeStops}
              navigation={{
                origin: {
                  latitude: result.source.latitude,
                  longitude: result.source.longitude,
                  label: result.source.placeName ?? result.source.name,
                },
                destination: {
                  latitude: result.facility.latitude,
                  longitude: result.facility.longitude,
                  label: result.facility.name,
                },
              }}
              compact={result.routes.length === 1}
            />
          )}

          <HealthcareFacilityDetailSheet
            facility={detailFacility}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            isRouteStop={detailFacility ? routeStopIds.includes(detailFacility.id) : false}
            onToggleRouteStop={toggleRouteStop}
            routeStopCount={routeStops.length}
            maxRouteStops={maxRouteStops}
          />
        </div>
      )}
    </div>
  );
}
