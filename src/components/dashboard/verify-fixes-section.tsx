"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ISSUE_TYPE_LABELS, STATUS_LABELS } from "@/types/civic";
import type { IssueStatus, IssueType, Severity } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Camera, Loader2, Navigation, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PendingIssue = {
  id: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  severity: Severity;
  imageUrl: string;
  afterImageUrl: string | null;
  distanceMeters: number | null;
  resolvedAt: string | null;
  updatedAt: string;
  verificationCount: number;
  ward: { name: string; number: number } | null;
};

type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "denied"; message: string };

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function VerifyFixesSection({ showHeader = true }: { showHeader?: boolean }) {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [issues, setIssues] = useState<PendingIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [radiusM, setRadiusM] = useState(5000);
  const [nearbyOnly, setNearbyOnly] = useState(true);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "denied", message: "Geolocation is not supported in this browser." });
      return;
    }
    setLocation({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          status: "ready",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setLocation({
          status: "denied",
          message: "Enable location to see fixes reported near you.",
        });
        setNearbyOnly(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const loadIssues = useCallback(async () => {
    setLoadingIssues(true);
    try {
      const useGeo = nearbyOnly && location.status === "ready";
      const qs = useGeo
        ? `?lat=${location.lat}&lng=${location.lng}&radiusM=${radiusM}&limit=20`
        : "?limit=20";
      const res = await fetch(`/api/issues/pending-verification${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setIssues(json.data ?? []);
    } catch {
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  }, [location, nearbyOnly, radiusM]);

  useEffect(() => {
    if (!nearbyOnly || location.status === "ready") {
      void loadIssues();
    }
  }, [loadIssues, nearbyOnly, location.status]);

  const isLocating = nearbyOnly && (location.status === "locating" || location.status === "idle");

  return (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {showHeader ? (
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Issues awaiting verification
            </CardTitle>
            <CardDescription className="mt-1.5">
              Upload your after photo — AI compares before/after to confirm the fix
            </CardDescription>
          </div>
        ) : (
          <CardDescription className="text-sm">
            Resolved or in-progress fixes you haven&apos;t verified yet
          </CardDescription>
        )}
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant={nearbyOnly ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setNearbyOnly(true)}
          >
            Near me
          </Button>
          <Button
            variant={!nearbyOnly ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setNearbyOnly(false)}
          >
            All city
          </Button>
          {nearbyOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={isLocating}
              onClick={requestLocation}
            >
              {isLocating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5 mr-1.5" />
              )}
              Location
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {nearbyOnly && location.status === "denied" && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">{location.message}</p>
            <Button variant="outline" size="sm" onClick={requestLocation}>
              Enable location
            </Button>
          </div>
        )}

        {(isLocating || (loadingIssues && issues.length === 0)) && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-lg" />
            ))}
          </div>
        )}

        {!loadingIssues && issues.length === 0 && !isLocating && (
          <p className="text-sm text-muted-foreground text-center py-10">
            {nearbyOnly
              ? "No resolved issues near you need your verification right now."
              : "No issues are waiting for community verification."}
          </p>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors"
              >
                <Link
                  href={`/verify/${issue.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0 group"
                >
                  <div className="flex h-14 w-[5.5rem] shrink-0 rounded-md overflow-hidden border border-border">
                    <div className="relative w-1/2 h-full bg-muted">
                      <Image
                        src={issue.imageUrl}
                        alt="Before"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="relative w-1/2 h-full bg-muted border-l border-border">
                      {issue.afterImageUrl ? (
                        <Image
                          src={issue.afterImageUrl}
                          alt="After"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {issue.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] h-5 font-normal">
                        {ISSUE_TYPE_LABELS[issue.type]}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                        {STATUS_LABELS[issue.status]}
                      </Badge>
                      {issue.distanceMeters != null && (
                        <span className="text-xs text-primary font-medium">
                          {formatDistance(issue.distanceMeters)} away
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {issue.verificationCount} verification(s) ·{" "}
                      {formatDistanceToNow(
                        new Date(issue.resolvedAt ?? issue.updatedAt),
                        { addSuffix: true },
                      )}
                    </p>
                  </div>
                </Link>
                <Button asChild size="sm" className="w-full sm:w-auto shrink-0">
                  <Link href={`/verify/${issue.id}`}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    Verify fix
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        {issues.length > 0 && nearbyOnly && location.status === "ready" && (
          <div className="flex justify-center gap-2 pt-2 border-t border-border/40">
            {radiusM === 5000 ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                disabled={loadingIssues}
                onClick={() => setRadiusM(8000)}
              >
                Show within 8km
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                disabled={loadingIssues}
                onClick={() => setRadiusM(5000)}
              >
                Show within 5km
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              disabled={loadingIssues}
              onClick={() => void loadIssues()}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingIssues ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
