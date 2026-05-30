"use client";

import type { AlongRouteFacility } from "@/lib/hospitals/along-route";
import type { RouteCoordinate } from "@/lib/routing/emergency-route";
import {
  facilityToRouteStop,
  filterStopsForRoute,
  MAX_ROUTE_STOPS,
  type RouteStop,
} from "@/lib/routing/route-stops";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function useGreenCorridorRouteStops(activeGeometry: RouteCoordinate[] | undefined) {
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [detailFacility, setDetailFacility] = useState<AlongRouteFacility | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!activeGeometry?.length) return;
    setRouteStops((prev) => {
      const next = filterStopsForRoute(prev, activeGeometry);
      return next.length === prev.length ? prev : next;
    });
  }, [activeGeometry]);

  const routeStopIds = useMemo(() => routeStops.map((s) => s.id), [routeStops]);

  const openFacilityDetail = useCallback((facility: AlongRouteFacility) => {
    setDetailFacility(facility);
    setDetailOpen(true);
  }, []);

  const toggleRouteStop = useCallback((facility: AlongRouteFacility) => {
    setRouteStops((prev) => {
      const exists = prev.some((s) => s.id === facility.id);
      if (exists) {
        toast.message(`Removed ${facility.name} from Google Maps route`);
        return prev.filter((s) => s.id !== facility.id);
      }
      if (prev.length >= MAX_ROUTE_STOPS) {
        toast.error(`You can add up to ${MAX_ROUTE_STOPS} stops on Google Maps`);
        return prev;
      }
      toast.success(`Added ${facility.name} — included in Open in Google Maps`);
      return [...prev, facilityToRouteStop(facility)];
    });
  }, []);

  const clearRouteStops = useCallback(() => setRouteStops([]), []);

  return {
    routeStops,
    routeStopIds,
    detailFacility,
    detailOpen,
    setDetailOpen,
    openFacilityDetail,
    toggleRouteStop,
    clearRouteStops,
    maxRouteStops: MAX_ROUTE_STOPS,
  };
}
