"use client";

import {
  EmergencyRouteWizard,
  type EmergencyWizardResult,
} from "@/components/routing/emergency-route-wizard";
import { EmergencyRouteMap } from "@/components/routing/emergency-route-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FACILITY_KIND_LABELS } from "@/types/emergency";
import { Ambulance, MapPin, RotateCcw, Shield } from "lucide-react";
import { useEffect, useState } from "react";

type EmergencyRouteExperienceProps = {
  /** Public marketing page — opens wizard immediately, no dashboard chrome */
  variant?: "public" | "app";
};

export function EmergencyRouteExperience({ variant = "public" }: EmergencyRouteExperienceProps) {
  const [wizardOpen, setWizardOpen] = useState(variant === "public");
  const [result, setResult] = useState<EmergencyWizardResult | null>(null);
  const [showPotholesOnly, setShowPotholesOnly] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

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
            Find the safest ambulance route to hospitals and first-aid centres — scored against
            live potholes from NammaMarga civic data.
          </p>
          {!wizardOpen && !result && (
            <Button size="lg" className="mt-6" onClick={() => setWizardOpen(true)}>
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
        <div className={isPublic ? "mt-8 space-y-6" : "space-y-6"}>
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-600 text-white border-0">Green corridor active</Badge>
                <Badge variant="secondary">{FACILITY_KIND_LABELS[result.facility.kind]}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">
                {result.source.name} → {result.facility.name}
              </CardTitle>
              <CardDescription>
                {result.recommended.distanceKm.toFixed(1)} km · ~
                {Math.round(result.recommended.durationMinutes)} min · Safety{" "}
                {result.recommended.safetyScore}/100
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Plan another route
              </Button>
              <div className="flex items-center gap-2">
                <Switch
                  id="potholes-page"
                  checked={showPotholesOnly}
                  onCheckedChange={setShowPotholesOnly}
                />
                <Label htmlFor="potholes-page" className="text-xs">
                  Potholes only
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="heat-page" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
                <Label htmlFor="heat-page" className="text-xs">
                  Heatmap
                </Label>
              </div>
            </CardContent>
          </Card>

          <EmergencyRouteMap
            className="h-[min(480px,60vh)]"
            routes={result.routes}
            hazards={result.hazards}
            source={{ ...result.source, placeName: result.source.placeName }}
            destination={{
              latitude: result.facility.latitude,
              longitude: result.facility.longitude,
              placeName: result.facility.name,
            }}
            focusRouteId={result.recommended.id}
            showPotholesOnly={showPotholesOnly}
            showHeatmap={showHeatmap}
            comparisonMode
          />
        </div>
      )}
    </div>
  );
}
