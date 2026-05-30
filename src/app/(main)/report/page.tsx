"use client";

import { IssueUpvoteButton } from "@/components/civic/issue-upvote-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getReportableTypeListText,
  isReportableIssueType,
} from "@/lib/issues/reportable-types";
import { ISSUE_TYPE_LABELS, STATUS_LABELS } from "@/types/civic";
import type { IssueClassification, IssueClassificationRejected } from "@/types/civic";
import { findNearestWard } from "@/utils/constants/wards";
import {
  AlertTriangle,
  Camera,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type DuplicateCheckResult = {
  isDuplicate: boolean;
  duplicate: {
    id: string;
    title: string;
    typeLabel: string;
    status: keyof typeof STATUS_LABELS;
    reportCount: number;
    voteCount: number;
    distanceMeters: number;
    matchRadiusMeters: number;
  } | null;
  recommendation: string;
};

export default function ReportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [wardId, setWardId] = useState("");
  const [wards, setWards] = useState<Array<{ id: string; name: string; number: number }>>([]);
  const [classification, setClassification] = useState<IssueClassification | null>(null);
  const [classificationRejected, setClassificationRejected] =
    useState<IssueClassificationRejected | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  useEffect(() => {
    fetch("/api/wards")
      .then((r) => r.json())
      .then((json) => setWards(json.data ?? []));
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          const nearest = findNearestWard(pos.coords.latitude, pos.coords.longitude);
          setAddress(`Near ${nearest.name}, Bangalore`);
        },
        () => toast.error("Could not detect location. Please enable GPS."),
      );
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setClassification(null);
    setClassificationRejected(null);
    setDuplicateCheck(null);
  }, []);

  const runDuplicateCheck = useCallback(async () => {
    if (!classification || latitude == null || longitude == null) {
      setDuplicateCheck(null);
      return;
    }

    setIsCheckingDuplicate(true);
    try {
      const res = await fetch("/api/duplicate-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          type: classification.type,
          wardId: wardId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Duplicate check failed");
      setDuplicateCheck(json.data);
    } catch {
      setDuplicateCheck(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [classification, latitude, longitude, wardId]);

  useEffect(() => {
    void runDuplicateCheck();
  }, [runDuplicateCheck]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      toast.error("Camera access denied");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      handleFile(file);
      stopCamera();
    }, "image/jpeg");
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) throw new Error("No image");
    const form = new FormData();
    form.append("file", imageFile);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed");
    return json.url;
  };

  const runClassification = async () => {
    if (!imageFile) {
      toast.error("Please add a photo first");
      return;
    }
    setIsClassifying(true);
    try {
      const imageUrl = await uploadImage();
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const data = json.data as {
        accepted?: boolean;
        reason?: string;
        summary?: string;
        type?: IssueClassification["type"];
        severity?: IssueClassification["severity"];
        confidence?: number;
        title?: string;
        reasoning?: string;
      };

      if (data.accepted === false) {
        setClassification(null);
        setClassificationRejected({
          accepted: false,
          reason: data.reason ?? "This photo cannot be reported as a civic issue.",
          summary: data.summary,
        });
        setDuplicateCheck(null);
        toast.warning("This photo cannot be reported — see details below");
        return;
      }

      if (!data.type || !isReportableIssueType(data.type)) {
        setClassification(null);
        setClassificationRejected({
          accepted: false,
          reason: "AI returned an unsupported issue type. Please use a clear photo of a pothole, garbage, streetlight, or other civic infrastructure problem.",
        });
        setDuplicateCheck(null);
        toast.warning("Unsupported issue type");
        return;
      }

      setClassificationRejected(null);
      setClassification({
        type: data.type,
        severity: data.severity!,
        confidence: data.confidence ?? 0,
        title: data.title ?? "Civic issue",
        summary: data.summary ?? "",
        reasoning: data.reasoning ?? "",
      });
      setDuplicateCheck(null);
      toast.success("AI classification complete");
      (window as unknown as { _uploadedUrl?: string })._uploadedUrl = imageUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Classification failed");
    } finally {
      setIsClassifying(false);
    }
  };

  const submitReport = async () => {
    if (classificationRejected) {
      toast.error("This photo was not accepted as a reportable civic issue");
      return;
    }
    if (!classification || !isReportableIssueType(classification.type)) {
      toast.error("Complete AI classification with a supported issue type first");
      return;
    }
    if (latitude == null || longitude == null) {
      toast.error("Enable location before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = (window as unknown as { _uploadedUrl?: string })._uploadedUrl;
      if (!imageUrl) imageUrl = await uploadImage();

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: classification.title,
          description: description || classification.summary,
          type: classification.type,
          severity: classification.severity,
          confidence: classification.confidence,
          aiSummary: classification.summary,
          imageUrl: imageUrl ?? "",
          latitude,
          longitude,
          address,
          wardId: wardId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.code === "UNSUPPORTED_ISSUE_TYPE") {
          setClassification(null);
          setClassificationRejected({
            accepted: false,
            reason: json.error ?? "Unsupported issue type",
          });
        }
        throw new Error(json.error);
      }

      toast.success("Issue reported successfully!");
      router.push(`/dashboard/reports/${json.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading">Report Civic Issue</h1>
        <p className="text-muted-foreground mt-1">
          Upload a photo of a civic infrastructure problem — AI classifies it into one of our
          supported categories and geo-tags the report.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supported: {getReportableTypeListText()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Capture or upload photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraActive ? (
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
              <div className="flex gap-2 mt-2">
                <Button onClick={capturePhoto}>Capture</Button>
                <Button variant="outline" onClick={stopCamera}>Cancel</Button>
              </div>
            </div>
          ) : imagePreview ? (
            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Click to upload or use camera</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button variant="outline" onClick={startCamera}>
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Details & location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ward</Label>
              <Select value={wardId} onValueChange={setWardId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Ward {w.number} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
            </div>
          </div>
          {latitude != null && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {latitude.toFixed(5)}, {longitude?.toFixed(5)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            3. AI Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runClassification} disabled={!imageFile || isClassifying}>
            {isClassifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Analyze with AI
          </Button>

          {classificationRejected && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Cannot report this photo</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {classificationRejected.reason}
                    </p>
                    {classificationRejected.summary && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {classificationRejected.summary}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                      Please upload a clear photo of: {getReportableTypeListText()}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {classification && !classificationRejected && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="font-semibold">{classification.title}</p>
              <p className="text-sm text-muted-foreground">{classification.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{ISSUE_TYPE_LABELS[classification.type]}</Badge>
                <Badge variant="destructive">{classification.severity}</Badge>
                <Badge variant="outline">
                  {Math.round(classification.confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic">{classification.reasoning}</p>
            </div>
          )}

          {isCheckingDuplicate && classification && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for nearby duplicate reports…
            </p>
          )}

          {duplicateCheck?.isDuplicate && duplicateCheck.duplicate && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Similar issue already reported</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {duplicateCheck.recommendation}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background p-3 space-y-2">
                  <p className="font-medium text-sm">{duplicateCheck.duplicate.title}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{duplicateCheck.duplicate.typeLabel}</span>
                    <span>·</span>
                    <span>
                      {STATUS_LABELS[duplicateCheck.duplicate.status] ??
                        duplicateCheck.duplicate.status}
                    </span>
                    <span>·</span>
                    <span>{duplicateCheck.duplicate.distanceMeters}m away</span>
                    <span>·</span>
                    <span>
                      {Math.max(
                        duplicateCheck.duplicate.voteCount,
                        duplicateCheck.duplicate.reportCount,
                      )}{" "}
                      confirmation(s)
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/reports/${duplicateCheck.duplicate.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View existing report
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <IssueUpvoteButton
                  issueId={duplicateCheck.duplicate.id}
                  initialCount={Math.max(
                    duplicateCheck.duplicate.voteCount,
                    duplicateCheck.duplicate.reportCount,
                  )}
                  size="default"
                  className="w-full justify-center"
                  onVoted={() =>
                    router.push(`/dashboard/reports/${duplicateCheck.duplicate!.id}`)
                  }
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {!duplicateCheck?.isDuplicate && !classificationRejected && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => void submitReport()}
          disabled={
            !classification ||
            !isReportableIssueType(classification.type) ||
            isSubmitting ||
            isCheckingDuplicate
          }
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Submit Report
        </Button>
      )}
    </div>
  );
}
