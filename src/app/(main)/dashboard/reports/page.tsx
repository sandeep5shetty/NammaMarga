"use client";

import { IssueCard } from "@/components/civic/issue-card";
import { useDbUser } from "@/hooks/use-db-user";
import { useEffect, useState } from "react";

export default function MyReportsPage() {
  const { user } = useDbUser();
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/issues?reporterId=${user.id}`)
      .then((r) => r.json())
      .then((json) => setIssues(json.data ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">My Reports</h1>
      {issues.length === 0 ? (
        <p className="text-muted-foreground">No reports yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map((issue: Parameters<typeof IssueCard>[0]["issue"]) => (
            <IssueCard key={issue.id} issue={issue} href={`/dashboard/reports/${issue.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
