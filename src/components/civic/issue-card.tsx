"use client";

import { IssueLifecycleProgress } from "@/components/civic/issue-lifecycle-progress";
import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { IssueUpvoteButton } from "@/components/civic/issue-upvote-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS } from "@/types/civic";
import type { IssueStatus } from "@prisma/client";
import type { IssueStatus, IssueType, Severity } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export interface IssueCardIssue {
  id: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  severity: Severity;
  imageUrl: string;
  latitude: number;
  longitude: number;
  voteCount?: number;
  reportCount: number;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
  contractor?: { name: string; company?: string | null } | null;
  ward?: { name: string; number: number } | null;
}

interface IssueCardProps {
  issue: IssueCardIssue;
  href?: string;
  showUpvote?: boolean;
}

export function IssueCard({ issue, href, showUpvote = true }: IssueCardProps) {
  const confirmations = Math.max(issue.voteCount ?? 0, issue.reportCount);

  const body = (
    <>
      <div className="relative h-40 w-full bg-muted">
        <Image
          src={issue.imageUrl}
          alt={issue.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          unoptimized
        />
        <Badge
          className="absolute top-2 right-2 border-0 text-white"
          style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
        >
          {issue.severity}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {issue.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground pb-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs font-normal">
            {ISSUE_TYPE_LABELS[issue.type]}
          </Badge>
          <IssueStatusBadge status={issue.status as IssueStatus} className="text-xs font-normal" />
          {issue.reportCount > 1 && (
            <Badge variant="secondary" className="text-xs">
              {issue.reportCount} reports
            </Badge>
          )}
        </div>
        {issue.ward && (
          <p className="flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3 shrink-0" />
            Ward {issue.ward.number} — {issue.ward.name}
          </p>
        )}
        <p className="text-xs">
          {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
        </p>
        <IssueLifecycleProgress
          issue={{
            status: issue.status as IssueStatus,
            createdAt: issue.createdAt,
            resolvedAt: issue.resolvedAt,
            contractor: issue.contractor ?? null,
          }}
        />
      </CardContent>
    </>
  );

  return (
    <Card className="overflow-hidden flex flex-col hover:border-primary/40 transition-colors">
      {href ? (
        <Link href={href} className="block group flex-1 min-h-0">
          {body}
        </Link>
      ) : (
        <div className="group flex-1">{body}</div>
      )}
      {showUpvote && (
        <div className="border-t border-border/60 px-4 py-3 bg-muted/20">
          <IssueUpvoteButton
            issueId={issue.id}
            initialCount={confirmations}
            className="w-full justify-center"
          />
        </div>
      )}
    </Card>
  );
}
