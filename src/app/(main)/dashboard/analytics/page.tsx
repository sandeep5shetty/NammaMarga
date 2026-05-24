"use client";

import { CivicMap } from "@/components/civic/civic-map";

export default function CitizenAnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">My Analytics</h2>
        <p className="text-sm text-muted-foreground">Your civic contribution overview</p>
      </div>
      <p className="text-sm text-muted-foreground">
        View detailed analytics on the main dashboard. BBMP officials can access ward-wide analytics in the BBMP Console.
      </p>
    </div>
  );
}
