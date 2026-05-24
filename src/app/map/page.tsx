"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const CivicMapInner = dynamic(
  () => import("@/components/civic/civic-map").then((m) => m.CivicMap),
  { ssr: false, loading: () => <Skeleton className="w-full h-[70vh] rounded-xl" /> },
);

export default function MapPage() {
  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold font-heading">Bangalore Civic Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore geo-tagged civic issues across all wards — filter by severity and ward
          </p>
        </div>
        <CivicMapInner />
      </div>
    </div>
  );
}
