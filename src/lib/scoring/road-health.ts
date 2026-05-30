import type { Issue, Severity } from "@prisma/client";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  LOW: 2,
  MEDIUM: 5,
  HIGH: 10,
  CRITICAL: 18,
};

const ACTIVE_STATUSES = new Set([
  "REPORTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
]);

export function calculateRoadHealthScore(issues: Pick<Issue, "severity" | "status" | "createdAt" | "resolvedAt">[]): number {
  const active = issues.filter((i) => ACTIVE_STATUSES.has(i.status));
  const resolved = issues.filter((i) => ["RESOLVED", "VERIFIED"].includes(i.status));

  const issuePenalty = Math.min(active.length * 6, 30);

  const severityPenalty = active.reduce(
    (sum, i) => sum + SEVERITY_WEIGHT[i.severity],
    0,
  );

  const now = Date.now();
  const unresolvedDays = active.length
    ? active.reduce((sum, i) => {
        const days = (now - i.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / active.length
    : 0;
  const unresolvedPenalty = Math.min(unresolvedDays * 1.5, 20);

  const recentCritical = active.filter((i) => {
    const days = (now - i.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return i.severity === "CRITICAL" && days <= 7;
  }).length;
  const recencyPenalty = recentCritical * 8;

  const resolutionBonus = Math.min(
    resolved.filter((i) => {
      if (!i.resolvedAt) return false;
      const days = (now - i.resolvedAt.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length * 2,
    10,
  );

  const score =
    100 - issuePenalty - severityPenalty - unresolvedPenalty - recencyPenalty + resolutionBonus;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthScoreLabel(score: number): "good" | "moderate" | "poor" | "critical" {
  if (score >= 80) return "good";
  if (score >= 60) return "moderate";
  if (score >= 40) return "poor";
  return "critical";
}

export function healthScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}
