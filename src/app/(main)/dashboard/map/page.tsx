"use client";

import { CivicMap } from "@/components/civic/civic-map";

export default function DashboardMapPage() {
  return (
    <div className="space-y-4 -m-2 lg:-m-6">
      <div>
        <h2 className="text-xl font-semibold">Civic Issue Map</h2>
        <p className="text-sm text-muted-foreground">
          Explore potholes and civic issues across Bengaluru — use filters, heatmap, and the issue list to navigate.
        </p>
      </div>
      <CivicMap embedded />
    </div>
  );
}
