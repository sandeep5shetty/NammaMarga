import type { HealthFacilityKind } from "@prisma/client";
import type { AmbulanceVehicleType } from "@/lib/routing/vehicle-profiles";

export type { HealthFacilityKind };
export type EmergencyVehicleType = AmbulanceVehicleType;

export const FACILITY_KIND_LABELS: Record<HealthFacilityKind, string> = {
  HOSPITAL: "Hospital",
  FIRST_AID: "First aid centre",
  TRAUMA_CENTER: "Trauma centre",
  BLOOD_BANK: "Blood bank",
  PHARMACY: "Pharmacy",
  DIAGNOSTIC: "Diagnostic lab",
  CLINIC: "Clinic / ICU step-down",
};

export const FACILITY_KIND_COLORS: Record<HealthFacilityKind, string> = {
  HOSPITAL: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  FIRST_AID: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  TRAUMA_CENTER: "bg-red-500/15 text-red-700 dark:text-red-300",
  BLOOD_BANK: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  PHARMACY: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  DIAGNOSTIC: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  CLINIC: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
};

/** Map marker / layer colors by facility kind */
export const FACILITY_KIND_MAP_COLOR: Record<HealthFacilityKind, string> = {
  HOSPITAL: "#3b82f6",
  FIRST_AID: "#f59e0b",
  TRAUMA_CENTER: "#ef4444",
  BLOOD_BANK: "#e11d48",
  PHARMACY: "#8b5cf6",
  DIAGNOSTIC: "#06b6d4",
  CLINIC: "#14b8a6",
};
