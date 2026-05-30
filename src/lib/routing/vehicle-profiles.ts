export type AmbulanceVehicleType =
  | "AMBULANCE_BLS"
  | "AMBULANCE_ALS"
  | "AMBULANCE_ICU"
  | "AMBULANCE_NEONATAL";

export type VehicleProfile = {
  type: AmbulanceVehicleType;
  label: string;
  description: string;
  mapboxProfile: string;
  avgSpeedKmh: number;
};

export const AMBULANCE_VEHICLE_TYPES = [
  "AMBULANCE_BLS",
  "AMBULANCE_ALS",
  "AMBULANCE_ICU",
  "AMBULANCE_NEONATAL",
] as const satisfies readonly AmbulanceVehicleType[];

const LEGACY_VEHICLE_MAP: Record<string, AmbulanceVehicleType> = {
  AMBULANCE: "AMBULANCE_BLS",
  FIRE_ENGINE: "AMBULANCE_BLS",
  PRIVATE_CAR: "AMBULANCE_BLS",
  POLICE_VEHICLE: "AMBULANCE_BLS",
};

export const VEHICLE_PROFILES: Record<AmbulanceVehicleType, VehicleProfile> = {
  AMBULANCE_BLS: {
    type: "AMBULANCE_BLS",
    label: "BLS ambulance",
    description: "Basic life support — standard emergency transport",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 40,
  },
  AMBULANCE_ALS: {
    type: "AMBULANCE_ALS",
    label: "ALS ambulance",
    description: "Advanced life support — cardiac & trauma equipment",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 42,
  },
  AMBULANCE_ICU: {
    type: "AMBULANCE_ICU",
    label: "ICU ambulance",
    description: "Critical care transport — ventilator & ICU team",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 38,
  },
  AMBULANCE_NEONATAL: {
    type: "AMBULANCE_NEONATAL",
    label: "Neonatal ambulance",
    description: "NICU transport — incubator & neonatal specialists",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 36,
  },
};

export const VEHICLE_OPTIONS = Object.values(VEHICLE_PROFILES);

export const EMERGENCY_VEHICLE_TYPE_VALUES = [...AMBULANCE_VEHICLE_TYPES] as [
  AmbulanceVehicleType,
  ...AmbulanceVehicleType[],
];

export function normalizeVehicleType(
  type?: string | AmbulanceVehicleType | null,
): AmbulanceVehicleType {
  if (!type) return "AMBULANCE_BLS";
  if (type in VEHICLE_PROFILES) return type as AmbulanceVehicleType;
  return LEGACY_VEHICLE_MAP[type] ?? "AMBULANCE_BLS";
}

export function isAmbulanceVehicle(type: AmbulanceVehicleType): boolean {
  return (AMBULANCE_VEHICLE_TYPES as readonly string[]).includes(type);
}

export function estimateEtaMinutes(distanceKm: number, vehicle: AmbulanceVehicleType): number {
  const normalized = normalizeVehicleType(vehicle);
  const speed = VEHICLE_PROFILES[normalized].avgSpeedKmh;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}
