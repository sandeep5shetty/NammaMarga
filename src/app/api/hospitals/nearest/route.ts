import { findNearestHospitals } from "@/lib/hospitals/nearest";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const icu = searchParams.get("icu") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? 5), 20);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const hospitals = await findNearestHospitals({
      latitude: lat,
      longitude: lng,
      icuOnly: icu,
      limit,
    });

    return NextResponse.json({ data: hospitals });
  } catch (error) {
    console.error("[hospitals/nearest]", error);
    return NextResponse.json({ error: "Failed to find hospitals" }, { status: 500 });
  }
}
