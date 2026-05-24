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
  createdAt: string;
  ward?: { name: string; number: number } | null;
}

export default function BbmpIssuesPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = () => {
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    fetch(`/api/issues${params}`)
      .then((r) => r.json())
      .then((j) => setIssues(j.data ?? []));
  };

  useEffect(load, [statusFilter]);

  const updateStatus = async (id: string, status: IssueStatus) => {
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Status updated to ${status}`);
      load();
    } else {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-heading">Issue Management</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{issue.title}</TableCell>
                <TableCell>{ISSUE_TYPE_LABELS[issue.type]}</TableCell>
                <TableCell>
                  <Badge variant={issue.severity === "CRITICAL" ? "destructive" : "outline"}>
                    {issue.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  {issue.ward ? `${issue.ward.number} — ${issue.ward.name}` : "—"}
                </TableCell>
                <TableCell>{STATUS_LABELS[issue.status]}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {issue.status === "REPORTED" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(issue.id, "ACKNOWLEDGED")}>
                        Ack
                      </Button>
                    )}
                    {["ACKNOWLEDGED", "IN_PROGRESS"].includes(issue.status) && (
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
