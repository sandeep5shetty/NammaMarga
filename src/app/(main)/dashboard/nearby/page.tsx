"use client";

import { NearbyIssuesSection } from "@/components/dashboard/nearby-issues-section";

export default function NearbyIssuesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-heading">Nearby issues</h1>
        <p className="text-sm text-muted-foreground mt-1">
          See active reports around you and confirm with one tap if you&apos;ve noticed the same
          problem.
        </p>
      </div>
      <NearbyIssuesSection showHeader={false} />
    </div>
  );
}
