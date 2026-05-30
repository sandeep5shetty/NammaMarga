import { getAuthUser } from "@/lib/auth/get-user";
import {
  DEFAULT_LIMIT,
  DEFAULT_RADIUS_M,
  findIssuesPendingVerification,
} from "@/lib/issues/pending-verification";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const lat = latParam != null ? Number(latParam) : undefined;
    const lng = lngParam != null ? Number(lngParam) : undefined;
    const radiusM = Math.min(
      Number(searchParams.get("radiusM") ?? DEFAULT_RADIUS_M),
      10_000,
    );
    const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_LIMIT), 40);

    const issues = await findIssuesPendingVerification({
      userId: user.id,
      latitude: lat,
      longitude: lng,
      radiusMeters: radiusM,
      limit,
    });

    return NextResponse.json({
      data: issues,
      meta: {
        radiusMeters: lat != null && lng != null ? radiusM : null,
        count: issues.length,
      },
    });
  } catch (error) {
    console.error("[issues/pending-verification]", error);
    return NextResponse.json(
      { error: "Failed to fetch issues for verification" },
      { status: 500 },
    );
  }
}
