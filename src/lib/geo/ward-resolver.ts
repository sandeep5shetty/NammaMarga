import { db } from "@/lib/prisma";
import { haversineDistance } from "@/lib/geo/haversine";

export async function resolveWardId(latitude: number, longitude: number): Promise<string | null> {
  const wards = await db.ward.findMany();
  if (!wards.length) return null;

  let nearest = wards[0];
  let minDist = Infinity;

  for (const ward of wards) {
    const dist = haversineDistance(
      { latitude, longitude },
      { latitude: ward.latitude, longitude: ward.longitude },
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = ward;
    }
  }

  return nearest.id;
}
