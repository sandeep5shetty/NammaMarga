import { STATUS_LABELS } from "@/types/civic";
import type { IssueStatus, VerificationStatus } from "@prisma/client";

export type LifecycleStepState = "complete" | "current" | "upcoming" | "skipped";

export type LifecycleStep = {
  id: string;
  label: string;
  description: string;
  state: LifecycleStepState;
  timestamp?: string;
  detail?: string;
};

export type IssueLifecycleInput = {
  status: IssueStatus;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
  contractor?: { name: string; company?: string | null } | null;
  verifications?: Array<{
    status: VerificationStatus;
    createdAt: string | Date;
    verifier?: { name: string | null } | null;
  }>;
  statusHistory?: Array<{
    toStatus: IssueStatus;
    fromStatus?: IssueStatus | null;
    createdAt: string | Date;
    note?: string | null;
    changedBy?: { name: string | null } | null;
  }>;
};

const STATUS_RANK: Record<IssueStatus, number> = {
  REPORTED: 0,
  ACKNOWLEDGED: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  VERIFIED: 4,
  REJECTED: -2,
  MERGED: -2,
};

function rank(status: IssueStatus): number {
  return STATUS_RANK[status] ?? 0;
}

function ts(date: string | Date | undefined | null): string | undefined {
  if (!date) return undefined;
  return typeof date === "string" ? date : date.toISOString();
}

function findHistoryTime(
  history: IssueLifecycleInput["statusHistory"],
  target: IssueStatus,
): string | undefined {
  const entry = history
    ?.filter((h) => h.toStatus === target)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  return ts(entry?.createdAt);
}

export function buildIssueLifecycleSteps(issue: IssueLifecycleInput): {
  steps: LifecycleStep[];
  currentLabel: string;
  isTerminal: boolean;
} {
  const status = issue.status;
  const r = rank(status);

  if (status === "REJECTED" || status === "MERGED") {
    return {
      steps: [
        {
          id: "terminal",
          label: STATUS_LABELS[status],
          description:
            status === "REJECTED"
              ? "This report was reviewed and not accepted for action."
              : "This report was merged into another nearby issue.",
          state: "current",
          timestamp: ts(issue.createdAt),
        },
      ],
      currentLabel: STATUS_LABELS[status],
      isTerminal: true,
    };
  }

  const approvedVerifications =
    issue.verifications?.filter((v) => v.status === "APPROVED").length ?? 0;
  const pendingVerifications =
    issue.verifications?.filter((v) => v.status === "PENDING").length ?? 0;
  const hasContractor = !!issue.contractor;

  const stepDefs = [
    {
      id: "reported",
      label: "Reported",
      description: "Your report was submitted with photo and location.",
      complete: true,
      current: r === 0,
      timestamp: ts(issue.createdAt),
    },
    {
      id: "acknowledged",
      label: "BBMP acknowledged",
      description: "Ward office has reviewed and queued the issue.",
      complete: r >= 1,
      current: r === 1,
      timestamp: findHistoryTime(issue.statusHistory, "ACKNOWLEDGED"),
    },
    {
      id: "contractor",
      label: "Contractor assigned",
      description: hasContractor
        ? `${issue.contractor!.name}${issue.contractor!.company ? ` · ${issue.contractor!.company}` : ""}`
        : "BBMP assigns a licensed contractor for the repair.",
      complete: hasContractor,
      current: r >= 1 && r <= 2 && !hasContractor,
      timestamp: hasContractor ? findHistoryTime(issue.statusHistory, "IN_PROGRESS") : undefined,
      detail: issue.contractor?.name,
    },
    {
      id: "in_progress",
      label: "Fix in progress",
      description: "Repair crew is working on site.",
      complete: r >= 3,
      current: r === 2,
      timestamp: findHistoryTime(issue.statusHistory, "IN_PROGRESS"),
    },
    {
      id: "resolved",
      label: "Marked resolved",
      description: "BBMP marked the repair as resolved — ready for citizen verification.",
      complete: r >= 4,
      current: r === 3,
      timestamp: ts(issue.resolvedAt) ?? findHistoryTime(issue.statusHistory, "RESOLVED"),
    },
    {
      id: "verification",
      label: "Community verification",
      description:
        approvedVerifications > 0
          ? `${approvedVerifications} citizen confirmation(s) on record.`
          : pendingVerifications > 0
            ? `${pendingVerifications} verification(s) awaiting review.`
            : "Citizens confirm the fix with before/after photos.",
      complete: r >= 4 || approvedVerifications >= 2,
      current: r === 3,
      timestamp: issue.verifications?.[0] ? ts(issue.verifications[0].createdAt) : undefined,
    },
    {
      id: "verified",
      label: "Verified & closed",
      description: "Fix confirmed — issue closed in the public record.",
      complete: r >= 4,
      current: r === 4,
      timestamp: findHistoryTime(issue.statusHistory, "VERIFIED"),
    },
  ];

  const steps: LifecycleStep[] = stepDefs.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    state: d.complete ? "complete" : d.current ? "current" : "upcoming",
    timestamp: d.timestamp,
    detail: d.detail,
  }));

  const current = steps.find((s) => s.state === "current");
  return {
    steps,
    currentLabel: current?.label ?? STATUS_LABELS[status],
    isTerminal: false,
  };
}

export function lifecycleProgressPercent(steps: LifecycleStep[]): number {
  const trackable = steps.filter((s) => s.state !== "skipped");
  if (trackable.length === 0) return 0;
  const complete = trackable.filter((s) => s.state === "complete").length;
  const hasCurrent = trackable.some((s) => s.state === "current");
  return Math.min(100, Math.round(((complete + (hasCurrent ? 0.5 : 0)) / trackable.length) * 100));
}
