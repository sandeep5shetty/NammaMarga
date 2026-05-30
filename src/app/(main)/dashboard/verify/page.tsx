"use client";

import { VerifyFixesSection } from "@/components/dashboard/verify-fixes-section";

export default function VerifyFixesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-heading">Verify fixes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Help the community confirm repairs — compare before and after photos with AI-assisted
          checks.
        </p>
      </div>
      <VerifyFixesSection showHeader={false} />
    </div>
  );
}
