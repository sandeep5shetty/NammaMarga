"use client";

import { IssueStatusBadge } from "@/components/civic/issue-status-badge";
import { IssueUpvoteButton } from "@/components/civic/issue-upvote-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ISSUE_TYPE_LABELS, STATUS_LABELS } from "@/types/civic";
import type { IssueStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Link2,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = ["#71717a", "#eab308", "#3b82f6", "#22c55e", "#10b981", "#ef4444", "#a855f7"];

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((j) => setStats(j.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const myIssues = (stats?.myIssues as number) ?? 0;
  const resolved = (stats?.resolved as number) ?? 0;
  const reputation = (stats?.reputation as number) ?? 0;
  const resolutionRate = Math.round(((stats?.resolutionRate as number) ?? 0) * 100);
  const recentIssues = (stats?.recentIssues as Array<Record<string, unknown>>) ?? [];
  const trend = (stats?.trend as Array<{ date: string; count: number }>) ?? [];
  const statusChart = (stats?.statusChart as Array<{ status: string; count: number }>) ?? [];

  return (
    <div className="space-y-6">
      {/* Stat cards — 3 column like reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reports
            </CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Civic issues you&apos;ve reported across Bangalore
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved Issues
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully fixed and verified in your wards
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reputation Score
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reputation}</div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{resolutionRate}% resolved</span>
              </div>
              <Progress value={Math.min(resolutionRate, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Overall Performance</CardTitle>
            <CardDescription>Issue status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChart.length > 0 ? (
              <ChartContainer
                config={Object.fromEntries(
                  statusChart.map((s) => [s.status, { label: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] ?? s.status }]),
                )}
                className="mx-auto aspect-square max-h-[220px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={statusChart}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={2}
                  >
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Report issues to see performance data
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Track how your reported issues move from submission to resolution across BBMP wards.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Report Activity</CardTitle>
            <CardDescription>Your reporting trend over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Reports", color: "hsl(var(--foreground))" } }}
              className="aspect-[2/1] max-h-[280px] w-full"
            >
              <AreaChart data={trend} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.slice(5)}
                  fontSize={11}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--foreground))"
                  fill="hsl(var(--foreground))"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent activities */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Recent Activities</CardTitle>
          <CardDescription>Your latest civic reports and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentIssues.length === 0 ? (
            <div className="text-center py-10">
              <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No reports yet</p>
              <Link href="/report" className="text-sm text-primary hover:underline">
                Report your first issue →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentIssues.map((issue) => (
                <div
                  key={issue.id as string}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <Link
                    href={`/dashboard/reports/${issue.id}`}
                    className="flex items-center justify-between flex-1 min-w-0 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {issue.title as string}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ISSUE_TYPE_LABELS[issue.type as keyof typeof ISSUE_TYPE_LABELS]} ·{" "}
                          {formatDistanceToNow(new Date(issue.createdAt as string), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <IssueStatusBadge
                        status={issue.status as IssueStatus}
                        className="text-xs"
                      />
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                  </Link>
                  <IssueUpvoteButton
                    issueId={issue.id as string}
                    initialCount={Math.max(
                      (issue.voteCount as number) ?? 0,
                      (issue.reportCount as number) ?? 0,
                    )}
                    className="w-full sm:w-auto shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
