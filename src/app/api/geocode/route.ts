import { searchPlaces } from "@/lib/mapbox/geocode";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    if (query.trim().length < 2) {
      return NextResponse.json({ data: [] });
    }

    const results = await searchPlaces(query, 8);
    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("[geocode]", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
