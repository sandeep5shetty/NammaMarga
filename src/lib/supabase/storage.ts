import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadIssueImage(
  file: File,
  folder = "issues",
): Promise<string> {
  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("issue-images")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("issue-images").getPublicUrl(path);

  return publicUrl;
}
