import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";
import {
  estimateEtaMinutes,
  isAmbulanceVehicle,
  normalizeVehicleType,
} from "@/lib/routing/vehicle-profiles";
import type { HealthFacilityKind } from "@prisma/client";
import type { EmergencyVehicleType } from "@/types/emergency";

export type HospitalResult = {
  id: string;
  name: string;
  type: string;
  kind: HealthFacilityKind;
  briefInfo: string | null;
  hasIcu: boolean;
  hasEmergency: boolean;
  phone: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMinutes: number;
  score: number;
};

export function scoreHospital(params: {
  distanceKm: number;
  hasIcu: boolean;
  hasEmergency: boolean;
  open247: boolean;
  kind: HealthFacilityKind;
  vehicleType?: EmergencyVehicleType;
  routeSafetyScore?: number;
}): number {
  const maxDist = 15;
  const distanceScore = Math.max(0, 1 - params.distanceKm / maxDist) * 100;
  const etaScore = Math.max(0, 1 - params.distanceKm / 10) * 100;

  let capabilityScore =
    (params.hasEmergency ? 35 : 0) + (params.hasIcu ? 35 : 0) + (params.open247 ? 15 : 0);

  if (params.kind === "TRAUMA_CENTER") capabilityScore += 25;
  else if (params.kind === "HOSPITAL") capabilityScore += 15;
  else if (params.kind === "FIRST_AID") capabilityScore += 10;

  const vehicle = normalizeVehicleType(params.vehicleType);
  if (isAmbulanceVehicle(vehicle) && params.kind === "FIRST_AID") {
    capabilityScore *= 0.85;
  }
  if (isAmbulanceVehicle(vehicle) && params.kind === "TRAUMA_CENTER") {
    capabilityScore *= 1.15;
  }
  if (vehicle === "AMBULANCE_ICU" && params.hasIcu) {
    capabilityScore *= 1.12;
  }
  if (vehicle === "AMBULANCE_NEONATAL" && params.kind === "HOSPITAL") {
    capabilityScore *= 1.08;
  }

  const safety = params.routeSafetyScore ?? 70;

  return (
    etaScore * 0.42 +
    distanceScore * 0.28 +
    capabilityScore * 0.2 +
    safety * 0.1
  );
}

export async function findNearestHospitals(params: {
  latitude: number;
  longitude: number;
  icuOnly?: boolean;
  limit?: number;
  routeSafetyScore?: number;
  vehicleType?: EmergencyVehicleType;
}): Promise<HospitalResult[]> {
  const hospitals = await db.hospital.findMany({
    where: params.icuOnly ? { hasIcu: true } : undefined,
  });

  const vehicle = normalizeVehicleType(params.vehicleType);

  const ranked = hospitals
    .map((h) => {
      const distanceKm = haversineDistance(
        { latitude: params.latitude, longitude: params.longitude },
        { latitude: h.latitude, longitude: h.longitude },
      );
      const etaMinutes = estimateEtaMinutes(distanceKm, vehicle);
      const score = scoreHospital({
        distanceKm,
        hasIcu: h.hasIcu,
        hasEmergency: h.hasEmergency,
        open247: h.open247,
        kind: h.kind,
        vehicleType: vehicle,
        routeSafetyScore: params.routeSafetyScore,
      });

      return {
        id: h.id,
        name: h.name,
        type: h.type,
        kind: h.kind,
        briefInfo: h.briefInfo,
        hasIcu: h.hasIcu,
        hasEmergency: h.hasEmergency,
        phone: h.phone,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        distanceKm: Math.round(distanceKm * 100) / 100,
        etaMinutes,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, params.limit ?? 8);
}
