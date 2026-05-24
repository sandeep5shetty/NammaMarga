"use client";

import { CivicMap } from "@/components/civic/civic-map";

export default function DashboardMapPage() {
  return (
    <div className="space-y-4 -m-2 lg:-m-4">
      <div>
        <h2 className="text-xl font-semibold">Civic Issue Map</h2>
        <p className="text-sm text-muted-foreground">
          Live geo-tagged issues across Bangalore wards
        </p>
      </div>
      <CivicMap embedded />
    </div>
  );
}
