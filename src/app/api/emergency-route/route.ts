import { getAuthUser } from "@/lib/auth/get-user";
import { findNearestHospitals } from "@/lib/hospitals/nearest";
import { getEmergencyRoutes } from "@/lib/routing/emergency-route";
import { db } from "@/lib/prisma";
import type { EmergencyVehicleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  sourceLat: z.number(),
  sourceLng: z.number(),
  destLat: z.number().optional(),
  destLng: z.number().optional(),
  hospitalId: z.string().optional(),
  sourceLabel: z.string().optional(),
  destLabel: z.string().optional(),
  vehicleType: z.enum(["AMBULANCE", "FIRE_ENGINE", "PRIVATE_CAR", "TWO_WHEELER"]).optional(),
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

    const {
      sourceLat,
      sourceLng,
      sourceLabel,
      destLabel,
      hospitalId,
      vehicleType = "AMBULANCE",
    } = parsed.data;

    let destLat = parsed.data.destLat;
    let destLng = parsed.data.destLng;
    let destinationLabel = destLabel;

    if (hospitalId) {
      const hospital = await db.hospital.findUnique({ where: { id: hospitalId } });
      if (!hospital) {
        return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
      }
      destLat = hospital.latitude;
      destLng = hospital.longitude;
      destinationLabel = hospital.name;
    }

    if (destLat == null || destLng == null) {
      return NextResponse.json({ error: "Destination or hospitalId required" }, { status: 400 });
    }

    const result = await getEmergencyRoutes(
      { lat: sourceLat, lng: sourceLng, label: sourceLabel },
      { lat: destLat, lng: destLng, label: destinationLabel },
      { vehicleType: vehicleType as EmergencyVehicleType },
    );

    const selectedHospital = hospitalId
      ? await db.hospital.findUnique({ where: { id: hospitalId } })
      : null;

    const hospitals =
      parsed.data.includeHospitals !== false
        ? await findNearestHospitals({
            latitude: sourceLat,
            longitude: sourceLng,
            routeSafetyScore: result.recommended.safetyScore,
            vehicleType: vehicleType as EmergencyVehicleType,
            limit: 5,
          })
        : [];

    if (user) {
      await db.routeRequest.create({
        data: {
          requestedByUserId: user.id,
          sourceLat,
          sourceLng,
          destLat,
          destLng,
          vehicleType: vehicleType as EmergencyVehicleType,
          destinationHospitalId: hospitalId ?? null,
          selectedRouteType: "safest",
          result: { ...result, selectedHospital } as object,
        },
      });
    }

    return NextResponse.json({
      data: {
        recommended: result.recommended,
        routes: result.routes,
        corridorHazards: result.corridorHazards,
        civicData: result.civicData,
        hazardsOnMap: result.corridorHazards,
        source: result.source,
        destination: result.destination,
        selectedHospital,
        vehicleType,
        hospitals,
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
