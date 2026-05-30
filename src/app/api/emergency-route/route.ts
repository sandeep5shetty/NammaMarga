import { getAuthUser } from "@/lib/auth/get-user";
import { findNearestHospitals } from "@/lib/hospitals/nearest";
import { getEmergencyRoutes } from "@/lib/routing/emergency-route";
import {
  EMERGENCY_VEHICLE_TYPE_VALUES,
  normalizeVehicleType,
} from "@/lib/routing/vehicle-profiles";
import { db } from "@/lib/prisma";
import type { EmergencyVehicleType as PrismaEmergencyVehicleType } from "@prisma/client";
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
  vehicleType: z
    .enum([
      ...EMERGENCY_VEHICLE_TYPE_VALUES,
      "AMBULANCE",
      "FIRE_ENGINE",
      "PRIVATE_CAR",
      "POLICE_VEHICLE",
    ])
    .optional(),
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
      vehicleType: rawVehicleType = "AMBULANCE_BLS",
    } = parsed.data;

    const vehicleType = normalizeVehicleType(rawVehicleType);

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
      {
        vehicleType,
        excludeHospitalId: hospitalId,
      },
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
            vehicleType,
            limit: 5,
          })
        : [];

    if (user) {
      try {
        await db.routeRequest.create({
          data: {
            requestedByUserId: user.id,
            sourceLat,
            sourceLng,
            destLat,
            destLng,
            vehicleType: vehicleType as PrismaEmergencyVehicleType,
            destinationHospitalId: hospitalId ?? null,
            selectedRouteType: "safest",
            result: { ...result, selectedHospital } as object,
          },
        });
      } catch (persistError) {
        console.warn("[emergency-route] routeRequest persist skipped:", persistError);
      }
    }

    return NextResponse.json({
      data: {
        recommended: result.recommended,
        routes: result.routes,
        corridorHazards: result.corridorHazards,
        alongRouteFacilities: result.alongRouteFacilities,
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
