"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, STATUS_LABELS } from "@/types/civic";
import type { IssueStatus, IssueType, Severity } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface IssueCardProps {
  issue: {
    id: string;
    title: string;
    type: IssueType;
    status: IssueStatus;
    severity: Severity;
    imageUrl: string;
    latitude: number;
    longitude: number;
    reportCount: number;
    createdAt: string | Date;
    ward?: { name: string; number: number } | null;
  };
  href?: string;
}

export function IssueCard({ issue, href }: IssueCardProps) {
  const content = (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors group">
      <div className="relative h-40 w-full bg-muted">
        <Image
          src={issue.imageUrl}
          alt={issue.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        <Badge
          className="absolute top-2 right-2 border-0"
          style={{ backgroundColor: SEVERITY_COLORS[issue.severity] }}
        >
          {issue.severity}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-1">{issue.title}</CardTitle>
          {issue.reportCount > 1 && (
            <Badge variant="secondary">{issue.reportCount} reports</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{ISSUE_TYPE_LABELS[issue.type]}</Badge>
          <Badge variant="outline">{STATUS_LABELS[issue.status]}</Badge>
        </div>
        {issue.ward && (
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Ward {issue.ward.number} — {issue.ward.name}
          </p>
        )}
        <p className="text-xs">
          {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
