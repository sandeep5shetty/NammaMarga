import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const wards = await db.ward.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json({ data: wards });
}
