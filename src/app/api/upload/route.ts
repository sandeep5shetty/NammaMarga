import { getAuthUser } from "@/lib/auth/get-user";
import { uploadIssueImage } from "@/lib/supabase/storage";
import { withRateLimit } from "@/lib/api/middleware-helpers";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = withRateLimit(request, user.id, 30);
    if (rateLimited) return rateLimited;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) ?? "issues";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 5MB." },
        { status: 400 },
      );
    }

    const url = await uploadIssueImage(file, folder);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Upload]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Upload failed. Ensure Supabase storage bucket 'issue-images' exists.",
      },
      { status: 500 },
    );
  }
}
