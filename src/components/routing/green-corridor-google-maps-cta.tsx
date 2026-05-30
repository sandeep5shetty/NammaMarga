"use client";

import { buildGoogleMapsDirectionsUrl } from "@/lib/routing/google-maps-directions";
import type { RouteAnalysis } from "@/lib/routing/emergency-route";
import { cn } from "@/utils";
import { Navigation } from "lucide-react";

export type RouteNavigationEndpoints = {
  origin: { latitude: number; longitude: number; label?: string };
  destination: { latitude: number; longitude: number; label?: string };
};

export type RouteGoogleMapsCTAProps = RouteNavigationEndpoints & {
  route: Pick<RouteAnalysis, "geometry">;
  /** e.g. "Green corridor" — shown in button for clarity */
  routeLabel?: string;
  className?: string;
  compact?: boolean;
};

export function RouteGoogleMapsCTA({
  route,
  origin,
  destination,
  routeLabel,
  className,
  compact,
}: RouteGoogleMapsCTAProps) {
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
    navigate: true,
  });

  const buttonText = compact
    ? "Google Maps"
    : routeLabel
      ? `Open ${routeLabel} in Google Maps`
      : "Open in Google Maps";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={buttonText}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg font-semibold text-white",
        "bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] transition-colors shadow-sm",
        compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm",
        className,
      )}
    >
      <Navigation className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      {buttonText}
    </a>
  );
}

/** @deprecated Use RouteGoogleMapsCTA */
export const GreenCorridorGoogleMapsCTA = RouteGoogleMapsCTA;

export { buildGoogleMapsDirectionsUrl };
