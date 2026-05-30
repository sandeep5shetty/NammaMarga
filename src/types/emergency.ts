import type { EmergencyVehicleType, HealthFacilityKind } from "@prisma/client";

export type { EmergencyVehicleType, HealthFacilityKind };

export const FACILITY_KIND_LABELS: Record<HealthFacilityKind, string> = {
  HOSPITAL: "Hospital",
  FIRST_AID: "First aid centre",
  TRAUMA_CENTER: "Trauma centre",
};

export const FACILITY_KIND_COLORS: Record<HealthFacilityKind, string> = {
  HOSPITAL: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  FIRST_AID: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  TRAUMA_CENTER: "bg-red-500/15 text-red-700 dark:text-red-300",
};
