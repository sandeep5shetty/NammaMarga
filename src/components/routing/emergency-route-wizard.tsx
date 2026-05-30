"use client";

import { EmergencyRouteMap } from "@/components/routing/emergency-route-map";
import { PlaceSearch, type PlaceSelection } from "@/components/routing/place-search";
import { RouteComparisonPanel } from "@/components/routing/route-comparison-panel";
import {
  WizardStepHeading,
  WizardStepIndicator,
  type WizardStep,
} from "@/components/routing/wizard-step-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { HospitalResult } from "@/lib/hospitals/nearest";
import type {
  CivicDataSummary,
  CorridorHazard,
  RouteAnalysis,
} from "@/lib/routing/emergency-route";
import { VEHICLE_OPTIONS } from "@/lib/routing/vehicle-profiles";
import { FACILITY_KIND_COLORS, FACILITY_KIND_LABELS } from "@/types/emergency";
import type { EmergencyVehicleType } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ambulance,
  Bike,
  Car,
  ChevronLeft,
  ChevronRight,
  Flame,
  Hospital,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Phone,
  Route,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "Location",
    description: "Where is the emergency?",
    icon: MapPin,
  },
  {
    id: 2,
    title: "Hospital",
    description: "Nearest care facility",
    icon: Hospital,
  },
  {
    id: 3,
    title: "Green corridor",
    description: "Safest route to facility",
    icon: Route,
  },
];

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
};

function VehicleIcon({ type }: { type: EmergencyVehicleType }) {
  const cls = "h-5 w-5";
  if (type === "AMBULANCE") return <Ambulance className={cls} />;
  if (type === "FIRE_ENGINE") return <Flame className={cls} />;
  if (type === "TWO_WHEELER") return <Bike className={cls} />;
  return <Car className={cls} />;
}

export type EmergencyWizardResult = {
  source: PlaceSelection;
  vehicleType: EmergencyVehicleType;
  facility: HospitalResult;
  recommended: RouteAnalysis;
  routes: RouteAnalysis[];
  hazards: CorridorHazard[];
  civicData: CivicDataSummary;
};

type EmergencyRouteWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: EmergencyWizardResult) => void;
  publicMode?: boolean;
};

export function EmergencyRouteWizard({
  open,
  onOpenChange,
  onComplete,
  publicMode,
}: EmergencyRouteWizardProps) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<PlaceSelection | null>(null);
  const [vehicleType, setVehicleType] = useState<EmergencyVehicleType>("AMBULANCE");
  const [locating, setLocating] = useState(false);
  const [facilities, setFacilities] = useState<HospitalResult[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<HospitalResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [recommended, setRecommended] = useState<RouteAnalysis | null>(null);
  const [routes, setRoutes] = useState<RouteAnalysis[]>([]);
  const [hazards, setHazards] = useState<CorridorHazard[]>([]);
  const [civicData, setCivicData] = useState<CivicDataSummary | null>(null);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setStep(1);
    setSource(null);
    setVehicleType("AMBULANCE");
    setFacilities([]);
    setSelectedFacility(null);
    setRecommended(null);
    setRoutes([]);
    setHazards([]);
    setCivicData(null);
    setFocusRouteId(null);
    setMapFullscreen(false);
  }, []);

  const toggleMapFullscreen = async () => {
    const el = mapWrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setMapFullscreen(true);
      } else {
        await document.exitFullscreen();
        setMapFullscreen(false);
      }
    } catch {
      setMapFullscreen((prev) => !prev);
      toast.message("Using expanded map view");
    }
  };

  useEffect(() => {
    const onFsChange = () => setMapFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSource({
          name: "Current location",
          placeName: "Your current GPS location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
        toast.success("Location set");
      },
      () => {
        setLocating(false);
        toast.error("Could not get location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const loadFacilities = async () => {
    if (!source) return;
    setLoadingFacilities(true);
    try {
      const res = await fetch(
        `/api/hospitals/nearest?lat=${source.latitude}&lng=${source.longitude}&limit=12&vehicle=${vehicleType}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setFacilities(json.data ?? []);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load facilities");
    } finally {
      setLoadingFacilities(false);
    }
  };

  const calculateRoute = async (facility: HospitalResult) => {
    if (!source) return;
    setSelectedFacility(facility);
    setLoadingRoute(true);
    setStep(3);
    try {
      const res = await fetch("/api/emergency-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLat: source.latitude,
          sourceLng: source.longitude,
          sourceLabel: source.placeName,
          hospitalId: facility.id,
          vehicleType,
          includeHospitals: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Route failed");

      const rec = json.data.recommended as RouteAnalysis;
      setRecommended(rec);
      setRoutes(json.data.routes ?? []);
      setHazards(json.data.corridorHazards ?? []);
      setCivicData(json.data.civicData ?? null);
      setFocusRouteId(rec.id);

      onComplete?.({
        source,
        vehicleType,
        facility,
        recommended: rec,
        routes: json.data.routes,
        hazards: json.data.corridorHazards,
        civicData: json.data.civicData,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Route failed");
      setStep(2);
    } finally {
      setLoadingRoute(false);
    }
  };

  const canProceedStep1 = !!source;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={publicMode ? "bg-black/50" : undefined}
        className={`!flex !flex-col top-[4dvh] translate-y-0 w-[95vw] h-[min(92dvh,100%)] max-h-[92dvh] p-0 gap-0 overflow-hidden ${
          step === 3 && recommended ? "max-w-4xl sm:max-w-5xl" : "max-w-3xl"
        }`}
        onInteractOutside={(e) => step < 3 && e.preventDefault()}
      >
        <div className="shrink-0 px-6 pt-6 pb-5 border-b border-border bg-gradient-to-br from-green-500/5 via-background to-red-500/5">
          <DialogHeader className="text-left space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="flex items-center gap-2 text-xl font-heading">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                  <Ambulance className="h-5 w-5 text-red-500" />
                </span>
                Emergency green corridor
              </DialogTitle>
              {publicMode && (
                <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-700 dark:text-green-400">
                  No login required
                </Badge>
              )}
            </div>
            <DialogDescription className="text-sm">
              {WIZARD_STEPS[step - 1].description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5">
            <WizardStepIndicator steps={WIZARD_STEPS} currentStep={step} />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y">
          <div className="px-6 py-5 min-h-[320px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" {...slide} className="space-y-5">
                  <WizardStepHeading
                    step={1}
                    totalSteps={3}
                    title="Set your pickup location"
                    description="We use this to find nearby hospitals and score routes from live pothole data."
                  />
                  <div>
                    <p className="text-sm font-medium mb-2">Your location</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mb-3 h-11"
                      onClick={useCurrentLocation}
                      disabled={locating}
                    >
                      <LocateFixed className="h-4 w-4 mr-2 text-green-600" />
                      {locating ? "Getting GPS..." : "Use current location"}
                    </Button>
                    <PlaceSearch
                      id="wizard-source"
                      label="Or search address"
                      placeholder="MG Road, Indiranagar, landmark..."
                      value={source}
                      onChange={setSource}
                      icon="source"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-3">Vehicle type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {VEHICLE_OPTIONS.map((v) => (
                        <button
                          key={v.type}
                          type="button"
                          onClick={() => setVehicleType(v.type)}
                          className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                            vehicleType === v.type
                              ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/40"
                              : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <VehicleIcon type={v.type} />
                          <span className="text-sm font-medium">{v.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-snug">
                            {v.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" {...slide} className="space-y-4">
                  <WizardStepHeading
                    step={2}
                    totalSteps={3}
                    title="Choose hospital or first aid"
                    description="Select where the patient needs to go. Tap a facility to calculate the green corridor."
                  />
                  {loadingFacilities ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : facilities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No facilities found nearby. Try a different location.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Ranked by distance, emergency capability, and your vehicle type. Select
                        destination for green corridor routing.
                      </p>
                      {facilities.map((f, i) => (
                        <motion.button
                          key={f.id}
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => calculateRoute(f)}
                          className="w-full text-left p-4 rounded-xl border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all"
                        >
                          <div className="flex justify-between gap-2 mb-1">
                            <span className="font-medium text-sm">{f.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {f.distanceKm} km · ~{f.etaMinutes} min
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <Badge className={`text-[10px] border-0 ${FACILITY_KIND_COLORS[f.kind]}`}>
                              {FACILITY_KIND_LABELS[f.kind]}
                            </Badge>
                            {f.hasEmergency && (
                              <Badge variant="secondary" className="text-[10px]">24/7 ER</Badge>
                            )}
                            {f.hasIcu && (
                              <Badge variant="secondary" className="text-[10px]">ICU</Badge>
                            )}
                          </div>
                          {f.briefInfo && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{f.briefInfo}</p>
                          )}
                          {f.phone && (
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {f.phone}
                            </p>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" {...slide} className="space-y-4">
                  {!loadingRoute && recommended && (
                    <WizardStepHeading
                      step={3}
                      totalSteps={3}
                      title="Your green corridor"
                      description="Safest route vs faster alternates — scored against NammaMarga potholes."
                    />
                  )}
                  {loadingRoute || !recommended ? (
                    <div className="space-y-4">
                      <WizardStepHeading
                        step={3}
                        totalSteps={3}
                        title="Calculating green corridor"
                        description="Comparing Mapbox routes against live potholes and civic hazards…"
                      />
                      <div className="py-6 text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-green-500 border-t-transparent mx-auto"
                      />
                      <p className="text-sm text-muted-foreground">
                        Scoring routes against live potholes & civic hazards…
                      </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedFacility && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                          <Hospital className="h-4 w-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium">To {selectedFacility.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {VEHICLE_OPTIONS.find((v) => v.type === vehicleType)?.label} ·{" "}
                              {recommended.distanceKm.toFixed(1)} km · ~
                              {Math.round(recommended.durationMinutes)} min
                            </p>
                          </div>
                        </div>
                      )}

                      <div
                        ref={mapWrapperRef}
                        className={
                          mapFullscreen
                            ? "fixed inset-0 z-[250] flex flex-col bg-background"
                            : "relative rounded-xl overflow-hidden"
                        }
                      >
                        {mapFullscreen && (
                          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Shield className="h-4 w-4 text-green-600" />
                              All routes — green corridor vs alternates
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={toggleMapFullscreen}>
                              <Minimize2 className="h-4 w-4 mr-1" />
                              Exit fullscreen
                            </Button>
                          </div>
                        )}
                        <EmergencyRouteMap
                          className={mapFullscreen ? "flex-1 min-h-0" : "h-[260px]"}
                          routes={routes}
                          hazards={hazards}
                          source={source}
                          destination={
                            selectedFacility
                              ? {
                                  latitude: selectedFacility.latitude,
                                  longitude: selectedFacility.longitude,
                                  placeName: selectedFacility.name,
                                }
                              : null
                          }
                          focusRouteId={focusRouteId ?? recommended.id}
                          showHeatmap
                          comparisonMode
                        />
                        {!mapFullscreen && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="absolute top-2 right-2 z-10 h-8 shadow-md bg-background/75 backdrop-blur-sm border-border/60"
                            onClick={toggleMapFullscreen}
                          >
                            <Maximize2 className="h-3.5 w-3.5 mr-1" />
                            Fullscreen
                          </Button>
                        )}
                        {!mapFullscreen && routes.length > 1 && (
                          <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-wrap gap-1.5 pointer-events-none">
                            {routes.map((r) => (
                              <span
                                key={r.id}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/60 shadow-sm flex items-center gap-1"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: r.isRecommended ? "#22c55e" : r.isFastest ? "#3b82f6" : "#94a3b8" }}
                                />
                                {r.isRecommended ? "Green" : r.isFastest ? "Fastest" : "Alt"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <RouteComparisonPanel
                        routes={routes}
                        recommended={recommended}
                        selectedRouteId={focusRouteId ?? recommended.id}
                        onSelectRoute={(r) => setFocusRouteId(r.id)}
                      />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-border flex justify-between gap-2 bg-background">
          {step > 1 && step < 3 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 1 && (
            <Button
              onClick={loadFacilities}
              disabled={!canProceedStep1 || loadingFacilities}
            >
              {loadingFacilities ? "Loading..." : (
                <>
                  Find nearby care
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
          {step === 3 && recommended && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
