"use client";

import {
  buildGoogleMapsDirectionsUrl,
  countUserStopsOnRoute,
} from "@/lib/routing/google-maps-directions";
import type { RouteAnalysis } from "@/lib/routing/emergency-route";
import { routeStopToMapsLatLng, type RouteStop } from "@/lib/routing/route-stops";
import { cn } from "@/utils";
import { Navigation } from "lucide-react";

export type RouteNavigationEndpoints = {
  origin: { latitude: number; longitude: number; label?: string };
  destination: { latitude: number; longitude: number; label?: string };
};

export type RouteGoogleMapsCTAProps = RouteNavigationEndpoints & {
  route: Pick<RouteAnalysis, "geometry">;
  /** Healthcare stops to include as Google Maps waypoints (ordered along the route). */
  routeStops?: RouteStop[];
  className?: string;
};

export function RouteGoogleMapsCTA({
  route,
  origin,
  destination,
  routeStops,
  className,
}: RouteGoogleMapsCTAProps) {
  const mapsStops = routeStops?.map(routeStopToMapsLatLng);
  const stopsOnRoute = countUserStopsOnRoute(mapsStops, route.geometry);

  const href = buildGoogleMapsDirectionsUrl({
    origin: {
      latitude: origin.latitude,
      longitude: origin.longitude,
      label: origin.label,
    },
    destination: {
      latitude: destination.latitude,
      longitude: destination.longitude,
      label: destination.label,
    },
    geometry: route.geometry,
    userStops: mapsStops,
    navigate: false,
  });
  const stopHint =
    stopsOnRoute > 0
      ? ` (${stopsOnRoute} healthcare stop${stopsOnRoute !== 1 ? "s" : ""} on this route)`
      : "";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open route in Google Maps${stopHint}`}
      title={`Open in Google Maps${stopHint}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold text-white",
        "bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] transition-colors shadow-sm",
        "px-3 py-1.5 text-xs shrink-0",
        className,
      )}
    >
      <Navigation className="h-3.5 w-3.5 shrink-0" />
      Google Maps
    </a>
  );
}

/** @deprecated Use RouteGoogleMapsCTA */
export const GreenCorridorGoogleMapsCTA = RouteGoogleMapsCTA;

export { buildGoogleMapsDirectionsUrl };
