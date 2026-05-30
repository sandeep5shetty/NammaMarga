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
import { toast } from "sonner";
import { ThumbsUp } from "lucide-react";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<Record<string, unknown> | null>(null);
  const [voting, setVoting] = useState(false);

  const load = () => {
    fetch(`/api/issues/${id}`)
      .then((r) => r.json())
      .then((json) => setIssue(json.data));
  };

  useEffect(load, [id]);

  const handleUpvote = async () => {
    setVoting(true);
    try {
      const res = await fetch(`/api/issues/${id}/vote`, { method: "POST" });
      if (!res.ok) throw new Error("Vote failed");
      toast.success("Upvoted — priority increased");
      load();
    } catch {
      toast.error("Could not upvote");
    } finally {
      setVoting(false);
    }
  };

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
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <Badge>{ISSUE_TYPE_LABELS[issue.type as keyof typeof ISSUE_TYPE_LABELS]}</Badge>
          <Badge variant="outline">{STATUS_LABELS[issue.status as keyof typeof STATUS_LABELS]}</Badge>
          <Badge variant="secondary">{issue.severity as string}</Badge>
          {typeof issue.priorityScore === "number" && (
            <Badge variant="destructive">Priority {Math.round(issue.priorityScore)}</Badge>
          )}
          {typeof issue.voteCount === "number" && (
            <Badge variant="outline">{issue.voteCount} upvotes</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={handleUpvote} disabled={voting}>
          <ThumbsUp className="h-4 w-4 mr-1" />
          Upvote this issue
        </Button>
        {(() => {
          const road = issue.roadSegment as { name?: string; healthScore?: number } | null;
          if (!road?.name) return null;
          return (
            <p className="text-sm text-muted-foreground mt-2">
              Road: {road.name} · Health {road.healthScore ?? "—"}/100
            </p>
          );
        })()}
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
