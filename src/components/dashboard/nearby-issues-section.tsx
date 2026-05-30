"use client";

import { IssueUpvoteButton } from "@/components/civic/issue-upvote-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS } from "@/types/civic";
import type { IssueType, Severity } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MapPin, Navigation, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type NearbyIssue = {
  id: string;
  title: string;
  type: IssueType;
  severity: Severity;
  imageUrl: string;
  voteCount: number;
  reportCount: number;
  distanceMeters: number;
  createdAt: string;
  userHasConfirmed: boolean;
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

export function NearbyIssuesSection({ showHeader = true }: { showHeader?: boolean }) {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [issues, setIssues] = useState<NearbyIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [radiusM, setRadiusM] = useState(2000);

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
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location access is off. Enable it in your browser to see issues near you."
            : "Could not detect your location. Try again or open the civic map.";
        setLocation({ status: "denied", message });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingIssues(true);
    try {
      const res = await fetch(
        `/api/issues/nearby?lat=${lat}&lng=${lng}&radiusM=${radiusM}&limit=12`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setIssues(json.data ?? []);
    } catch {
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  }, [radiusM]);

  useEffect(() => {
    if (location.status === "ready") {
      void loadNearby(location.lat, location.lng);
    }
  }, [location, loadNearby]);

  const isLocating = location.status === "locating" || location.status === "idle";
  const showList = location.status === "ready";

  return (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {showHeader ? (
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Nearby issues
            </CardTitle>
            <CardDescription>
              Active reports within {radiusM >= 1000 ? `${radiusM / 1000}km` : `${radiusM}m`} of you
              — confirm if you&apos;ve seen them too
            </CardDescription>
          </div>
        ) : (
          <CardDescription className="text-sm">
            Within {radiusM >= 1000 ? `${radiusM / 1000}km` : `${radiusM}m`} of your location
          </CardDescription>
        )}
        <div className="flex flex-wrap gap-2 shrink-0">
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
            Update location
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
            <Link href="/dashboard/map">Open map</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {location.status === "denied" && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">{location.message}</p>
            <Button variant="outline" size="sm" onClick={requestLocation}>
              <Navigation className="h-4 w-4 mr-2" />
              Enable location
            </Button>
          </div>
        )}

        {(isLocating || (showList && loadingIssues && issues.length === 0)) && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        )}

        {showList && !loadingIssues && issues.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No active issues reported within {radiusM / 1000}km of your location.
          </p>
        )}

        {showList && issues.length > 0 && (
          <div className="space-y-2">
            {issues.map((issue) => {
              const confirmations = Math.max(issue.voteCount, issue.reportCount);
              return (
                <div
                  key={issue.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                >
                  <Link
                    href={`/dashboard/reports/${issue.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted">
                      <Image
                        src={issue.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <span
                        className="absolute bottom-0 left-0 right-0 text-[9px] font-medium text-white text-center py-0.5"
                        style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {issue.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <Badge variant="outline" className="text-[10px] h-5 font-normal">
                          {ISSUE_TYPE_LABELS[issue.type]}
                        </Badge>
                        <span className="text-xs text-primary font-medium">
                          {formatDistance(issue.distanceMeters)} away
                        </span>
                        {issue.ward && (
                          <span className="text-xs text-muted-foreground">
                            Ward {issue.ward.number}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                        {confirmations > 0 && ` · ${confirmations} confirmation(s)`}
                      </p>
                    </div>
                  </Link>
                  <IssueUpvoteButton
                    issueId={issue.id}
                    initialCount={confirmations}
                    initialConfirmed={issue.userHasConfirmed}
                    className="w-full sm:w-auto shrink-0 justify-center"
                  />
                </div>
              );
            })}
          </div>
        )}

        {showList && issues.length > 0 && (
          <div className="flex justify-center gap-2 pt-2 border-t border-border/40">
            {radiusM === 2000 ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                disabled={loadingIssues}
                onClick={() => setRadiusM(5000)}
              >
                Show within 5km
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                disabled={loadingIssues}
                onClick={() => setRadiusM(2000)}
              >
                Show within 2km
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              disabled={loadingIssues || location.status !== "ready"}
              onClick={() => {
                if (location.status === "ready") {
                  void loadNearby(location.lat, location.lng);
                }
              }}
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
