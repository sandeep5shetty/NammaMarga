import type { EmergencyVehicleType } from "@prisma/client";

export type VehicleProfile = {
  type: EmergencyVehicleType;
  label: string;
  description: string;
  mapboxProfile: string;
  avgSpeedKmh: number;
  icon: "ambulance" | "fire" | "car" | "bike";
};

export const VEHICLE_PROFILES: Record<EmergencyVehicleType, VehicleProfile> = {
  AMBULANCE: {
    type: "AMBULANCE",
    label: "Ambulance",
    description: "Emergency medical transport — priority routing",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 42,
    icon: "ambulance",
  },
  FIRE_ENGINE: {
    type: "FIRE_ENGINE",
    label: "Fire engine",
    description: "Large vehicle — wider turns, moderate speed",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 38,
    icon: "fire",
  },
  PRIVATE_CAR: {
    type: "PRIVATE_CAR",
    label: "Private car",
    description: "Standard passenger vehicle",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 28,
    icon: "car",
  },
  TWO_WHEELER: {
    type: "TWO_WHEELER",
    label: "Two-wheeler",
    description: "Motorcycle / scooter — nimble through traffic",
    mapboxProfile: "mapbox/driving",
    avgSpeedKmh: 32,
    icon: "bike",
  },
};

export const VEHICLE_OPTIONS = Object.values(VEHICLE_PROFILES);

export function estimateEtaMinutes(distanceKm: number, vehicle: EmergencyVehicleType): number {
  const speed = VEHICLE_PROFILES[vehicle].avgSpeedKmh;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}
