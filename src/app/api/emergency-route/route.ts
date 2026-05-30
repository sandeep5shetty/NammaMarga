import { getAuthUser } from "@/lib/auth/get-user";
import { findNearestHospitals } from "@/lib/hospitals/nearest";
import { getEmergencyRoutes } from "@/lib/routing/emergency-route";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  sourceLat: z.number(),
  sourceLng: z.number(),
  destLat: z.number(),
  destLng: z.number(),
  sourceLabel: z.string().optional(),
  destLabel: z.string().optional(),
  includeHospitals: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { sourceLat, sourceLng, destLat, destLng, sourceLabel, destLabel } = parsed.data;

    const result = await getEmergencyRoutes(
      { lat: sourceLat, lng: sourceLng, label: sourceLabel },
      { lat: destLat, lng: destLng, label: destLabel },
    );

    const hospitals =
      parsed.data.includeHospitals !== false
        ? await findNearestHospitals({
            latitude: sourceLat,
            longitude: sourceLng,
            routeSafetyScore: result.recommended.safetyScore,
            limit: 5,
          })
        : [];

    const icuHospitals = await findNearestHospitals({
      latitude: sourceLat,
      longitude: sourceLng,
      icuOnly: true,
      limit: 3,
      routeSafetyScore: result.recommended.safetyScore,
    });

    if (user) {
      await db.routeRequest.create({
        data: {
          requestedByUserId: user.id,
          sourceLat,
          sourceLng,
          destLat,
          destLng,
          selectedRouteType: "safest",
          result: { ...result, hospitals, icuHospitals } as object,
        },
      });
    }

    return NextResponse.json({
      data: {
        recommended: result.recommended,
        routes: result.routes,
        hazardsOnMap: result.hazardsOnMap,
        source: result.source,
        destination: result.destination,
        hospitals,
        nearestHospital: hospitals[0] ?? null,
        nearestIcuHospital: icuHospitals[0] ?? null,
      },
    });
  } catch (error) {
    console.error("[emergency-route]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Route calculation failed" },
      { status: 500 },
    );
  }
}
