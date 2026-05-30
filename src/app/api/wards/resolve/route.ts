import { resolveWardId } from "@/lib/geo/ward-resolver";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const wardId = await resolveWardId(parsed.data.latitude, parsed.data.longitude);
    const ward = wardId
      ? await db.ward.findUnique({ where: { id: wardId } })
      : null;

    return NextResponse.json({ data: { wardId, ward } });
  } catch (error) {
    console.error("[wards/resolve]", error);
    return NextResponse.json({ error: "Ward resolution failed" }, { status: 500 });
  }
}
