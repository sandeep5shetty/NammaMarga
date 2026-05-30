import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";

export type HospitalResult = {
  id: string;
  name: string;
  type: string;
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

function estimateEtaMinutes(distanceKm: number): number {
  const avgSpeedKmh = 25;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

export function scoreHospital(params: {
  distanceKm: number;
  hasIcu: boolean;
  hasEmergency: boolean;
  open247: boolean;
  routeSafetyScore?: number;
}): number {
  const maxDist = 15;
  const distanceScore = Math.max(0, 1 - params.distanceKm / maxDist) * 100;
  const etaScore = Math.max(0, 1 - params.distanceKm / 10) * 100;
  const capabilityScore =
    (params.hasEmergency ? 40 : 0) + (params.hasIcu ? 40 : 0) + (params.open247 ? 20 : 0);
  const safety = params.routeSafetyScore ?? 70;

  return (
    etaScore * 0.45 +
    distanceScore * 0.25 +
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
}): Promise<HospitalResult[]> {
  const hospitals = await db.hospital.findMany({
    where: params.icuOnly ? { hasIcu: true } : undefined,
  });

  const ranked = hospitals
    .map((h) => {
      const distanceKm = haversineDistance(
        { latitude: params.latitude, longitude: params.longitude },
        { latitude: h.latitude, longitude: h.longitude },
      );
      const etaMinutes = estimateEtaMinutes(distanceKm);
      const score = scoreHospital({
        distanceKm,
        hasIcu: h.hasIcu,
        hasEmergency: h.hasEmergency,
        open247: h.open247,
        routeSafetyScore: params.routeSafetyScore,
      });

      return {
        id: h.id,
        name: h.name,
        type: h.type,
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

  return ranked.slice(0, params.limit ?? 5);
}
