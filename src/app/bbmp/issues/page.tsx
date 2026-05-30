"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ISSUE_TYPE_LABELS, STATUS_LABELS } from "@/types/civic";
import type { IssueStatus, IssueType, Severity } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface IssueRow {
  id: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  severity: Severity;
  priorityScore: number;
  voteCount: number;
  createdAt: string;
  ward?: { name: string; number: number } | null;
}

export default function BbmpIssuesPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [wardRankings, setWardRankings] = useState<
    Array<{ wardName: string; activeIssues: number }>
  >([]);

  const load = () => {
    fetch("/api/bbmp/ward-queue")
      .then((r) => r.json())
      .then((j) => {
        setIssues(j.data?.queue ?? []);
        setWardRankings(j.data?.wardRankings ?? []);
      });
  };

  useEffect(load, []);

  const updateStatus = async (id: string, status: IssueStatus) => {
    const res = await fetch(`/api/issues/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);
      load();
    } else {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Priority Issue Queue</h1>
        <p className="text-muted-foreground mt-1">
          Ward-wise complaints sorted by smart priority scoring
        </p>
      </div>

      {wardRankings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {wardRankings.slice(0, 5).map((w) => (
            <Badge key={w.wardName} variant="outline">
              {w.wardName}: {w.activeIssues} active
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell>
                  <Badge variant={issue.priorityScore > 80 ? "destructive" : "secondary"}>
                    {Math.round(issue.priorityScore)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{issue.title}</TableCell>
                <TableCell>{ISSUE_TYPE_LABELS[issue.type]}</TableCell>
                <TableCell>
                  <Badge variant={issue.severity === "CRITICAL" ? "destructive" : "outline"}>
                    {issue.severity}
                  </Badge>
                </TableCell>
                <TableCell>{issue.voteCount}</TableCell>
                <TableCell>
                  {issue.ward ? `${issue.ward.number} — ${issue.ward.name}` : "—"}
                </TableCell>
                <TableCell>{STATUS_LABELS[issue.status]}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {issue.status === "REPORTED" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(issue.id, "ACKNOWLEDGED")}>
                        Ack
                      </Button>
                    )}
                    {["ACKNOWLEDGED", "REPORTED"].includes(issue.status) && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(issue.id, "IN_PROGRESS")}>
                        Work
                      </Button>
                    )}
                    {issue.status === "IN_PROGRESS" && (
                      <Button size="sm" onClick={() => updateStatus(issue.id, "RESOLVED")}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
