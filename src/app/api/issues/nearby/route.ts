import { getAuthUser } from "@/lib/auth/get-user";
import { DEFAULT_LIMIT, DEFAULT_RADIUS_M, findNearbyIssues } from "@/lib/issues/nearby-issues";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radiusM = Math.min(
      Number(searchParams.get("radiusM") ?? DEFAULT_RADIUS_M),
      5000,
    );
    const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_LIMIT), 24);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const issues = await findNearbyIssues({
      latitude: lat,
      longitude: lng,
      radiusMeters: radiusM,
      limit,
      userId: user.id,
    });

    return NextResponse.json({
      data: issues,
      meta: { radiusMeters: radiusM, count: issues.length },
    });
  } catch (error) {
    console.error("[issues/nearby]", error);
    return NextResponse.json({ error: "Failed to fetch nearby issues" }, { status: 500 });
  }
}
