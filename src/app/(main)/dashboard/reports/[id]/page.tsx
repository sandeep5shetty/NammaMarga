"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ISSUE_TYPE_LABELS, STATUS_LABELS } from "@/types/civic";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/issues/${id}`)
      .then((r) => r.json())
      .then((json) => setIssue(json.data));
  }, [id]);

  if (!issue) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="relative h-64 rounded-xl overflow-hidden">
        <Image
          src={issue.imageUrl as string}
          alt={issue.title as string}
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{issue.title as string}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge>{ISSUE_TYPE_LABELS[issue.type as keyof typeof ISSUE_TYPE_LABELS]}</Badge>
          <Badge variant="outline">{STATUS_LABELS[issue.status as keyof typeof STATUS_LABELS]}</Badge>
          <Badge variant="secondary">{issue.severity as string}</Badge>
        </div>
        <p className="text-muted-foreground mt-4">{issue.description as string}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Reported {formatDistanceToNow(new Date(issue.createdAt as string), { addSuffix: true })}
        </p>
      </div>

      {(issue.status === "RESOLVED" || issue.status === "IN_PROGRESS") && (
        <Button asChild>
          <Link href={`/verify/${id}`}>Verify Fix</Link>
        </Button>
      )}

      {Array.isArray(issue.activityLogs) && issue.activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(issue.activityLogs as Array<{ action: string; details: string; createdAt: string }>).map(
              (log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground">{log.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
