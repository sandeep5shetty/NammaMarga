"use client";

import { IssueLifecycleTracker } from "@/components/civic/issue-lifecycle-tracker";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { IssueUpvoteButton } from "@/components/civic/issue-upvote-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, STATUS_LABELS } from "@/types/civic";
import type { IssueStatus, IssueType, Severity, VerificationStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type IssueDetail = {
  id: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  severity: Severity;
  imageUrl: string;
  afterImageUrl: string | null;
  priorityScore: number;
  voteCount: number;
  reportCount: number;
  createdAt: string;
  resolvedAt: string | null;
  address: string | null;
  contractor: { name: string; company: string | null } | null;
  ward: { name: string; number: number } | null;
  roadSegment: { name: string; healthScore: number } | null;
  statusHistory: Array<{
    toStatus: IssueStatus;
    fromStatus: IssueStatus | null;
    createdAt: string;
    note: string | null;
    changedBy: { name: string | null } | null;
  }>;
  verifications: Array<{
    status: VerificationStatus;
    createdAt: string;
    verifier: { name: string | null } | null;
  }>;
  activityLogs: Array<{ action: string; details: string; createdAt: string }>;
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<IssueDetail | null>(null);

  const load = () => {
    fetch(`/api/issues/${id}`)
      .then((r) => r.json())
      .then((json) => setIssue(json.data as IssueDetail));
  };

  useEffect(load, [id]);

  if (!issue) {
    return <p className="text-muted-foreground">Loading report…</p>;
  }

  const confirmations = Math.max(issue.voteCount, issue.reportCount);
  const canVerify = issue.status === "RESOLVED" || issue.status === "IN_PROGRESS";

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        My reports
      </Link>

      <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden border border-border">
        <Image
          src={issue.imageUrl}
          alt={issue.title}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
          <IssueStatusBadge status={issue.status} className="bg-background/90 backdrop-blur-sm" />
          <Badge
            className="border-0 text-white"
            style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
          >
            {issue.severity}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-heading leading-tight">{issue.title}</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline">{ISSUE_TYPE_LABELS[issue.type]}</Badge>
          {typeof issue.priorityScore === "number" && (
            <Badge variant="secondary">Priority {Math.round(issue.priorityScore)}</Badge>
          )}
          {confirmations > 0 && (
            <Badge variant="outline">{confirmations} confirmation(s)</Badge>
          )}
        </div>
        {issue.ward && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Ward {issue.ward.number} — {issue.ward.name}
            {issue.address && ` · ${issue.address}`}
          </p>
        )}
        {issue.roadSegment?.name && (
          <p className="text-sm text-muted-foreground">
            Road: {issue.roadSegment.name} · Health {issue.roadSegment.healthScore}/100
          </p>
        )}
        {issue.description && (
          <p className="text-muted-foreground text-sm leading-relaxed pt-1">{issue.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Reported {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
        </p>
      </div>

      <IssueLifecycleTracker issue={issue} />

      {issue.afterImageUrl && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Before & after</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Submitted by citizens during community verification.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Before</p>
                <div className="relative h-36 rounded-lg overflow-hidden border border-border">
                  <Image src={issue.imageUrl} alt="Before" fill className="object-cover" unoptimized />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">After</p>
                <div className="relative h-36 rounded-lg overflow-hidden border border-border">
                  <Image
                    src={issue.afterImageUrl}
                    alt="After repair"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <IssueUpvoteButton
          issueId={id}
          initialCount={confirmations}
          size="default"
          className="flex-1 justify-center"
          onVoted={load}
        />
        {canVerify && (
          <Button asChild className="flex-1">
            <Link href={`/verify/${id}`}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify fix
            </Link>
          </Button>
        )}
      </div>

      {issue.statusHistory.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Status history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...issue.statusHistory]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              )
              .map((entry, i) => (
                <div
                  key={i}
                  className="flex gap-3 text-sm border-b border-border/50 last:border-0 pb-3 last:pb-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {entry.fromStatus
                        ? `${STATUS_LABELS[entry.fromStatus]} → ${STATUS_LABELS[entry.toStatus]}`
                        : STATUS_LABELS[entry.toStatus]}
                    </p>
                    {entry.note && (
                      <p className="text-muted-foreground text-xs mt-0.5">{entry.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.changedBy?.name && `${entry.changedBy.name} · `}
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
