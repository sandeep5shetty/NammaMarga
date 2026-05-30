"use client";

import { IssueCard } from "@/components/civic/issue-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDbUser } from "@/hooks/use-db-user";
import Link from "next/link";
import { useEffect, useState } from "react";

type ReportIssue = Parameters<typeof IssueCard>[0]["issue"];

export default function MyReportsPage() {
  const { user, isLoading: userLoading } = useDbUser();
  const [issues, setIssues] = useState<ReportIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setIssues([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/issues?reporterId=${user.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setIssues(json.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  const isLoading = userLoading || loading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">My Reports</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground">No reports yet.</p>
          <Link href="/report" className="text-sm text-primary hover:underline mt-3 inline-block">
            Report your first issue →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} href={`/dashboard/reports/${issue.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
