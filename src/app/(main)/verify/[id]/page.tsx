"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_TYPE_LABELS } from "@/types/civic";
import { Camera, Loader2, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [issue, setIssue] = useState<Record<string, unknown> | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch(`/api/issues/${id}`).then((r) => r.json()).then((j) => setIssue(j.data));
    navigator.geolocation?.getCurrentPosition((p) =>
      setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
    );
  }, [id]);

  const handleVerify = async () => {
    if (!afterImage || !coords) {
      toast.error("Upload after-fix photo and enable location");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", afterImage);
      form.append("folder", "verifications");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error);

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: id,
          imageUrl: uploadJson.url,
          latitude: coords.lat,
          longitude: coords.lng,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResult(json.data);
      toast.success("Verification submitted!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (!issue) return <p className="text-muted-foreground p-8">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Verify Fix
        </h1>
        <p className="text-muted-foreground mt-1">{issue.title as string}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Before</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-40 rounded-lg overflow-hidden">
              <Image src={issue.imageUrl as string} alt="Before" fill className="object-cover" unoptimized />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">After (your photo)</CardTitle>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="relative h-40 rounded-lg overflow-hidden">
                <Image src={preview} alt="After" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div
                className="h-40 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setAfterImage(f);
                  setPreview(URL.createObjectURL(f));
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Badge>{ISSUE_TYPE_LABELS[issue.type as keyof typeof ISSUE_TYPE_LABELS]}</Badge>

      {coords && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Geo-fence check enabled
        </p>
      )}

      {result && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-2">
            <p className="font-medium">AI Verification Result</p>
            <p className="text-sm">
              Confidence: {Math.round(((result.aiResult as { confidence: number })?.confidence ?? 0) * 100)}%
            </p>
            <p className="text-sm text-muted-foreground">
              {(result.aiResult as { reasoning: string })?.reasoning}
            </p>
            <Badge variant={(result.geoValidated as boolean) ? "default" : "destructive"}>
              Geo: {(result.geoValidated as boolean) ? "Validated" : "Outside zone"}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Button className="w-full" onClick={handleVerify} disabled={loading || !afterImage}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Verification
      </Button>
      {result && (
        <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      )}
    </div>
  );
}
