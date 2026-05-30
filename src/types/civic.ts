import type {
  IssueStatus,
  IssueType,
  Severity,
  UserRole,
  VerificationStatus,
} from "@prisma/client";

export type {
  IssueStatus,
  IssueType,
  Severity,
  UserRole,
  VerificationStatus,
};

export interface IssueClassification {
  type: IssueType;
  severity: Severity;
  confidence: number;
  title: string;
  summary: string;
  reasoning: string;
}

export interface FixVerification {
  verified: boolean;
  confidence: number;
  reasoning: string;
  improvements: string[];
}

export interface IssueSummary {
  summary: string;
  keyPoints: string[];
  recommendedAction: string;
  estimatedResolutionDays: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface IssueWithRelations {
  id: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  severity: Severity;
  confidence: number;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address: string | null;
  reportCount: number;
  createdAt: Date;
  ward?: { name: string; number: number } | null;
  reporter?: { name: string | null; image: string | null } | null;
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  POTHOLE: "Pothole",
  GARBAGE: "Garbage Dump",
  SEWAGE: "Sewage Problem",
  WATER_LEAK: "Water Leakage",
  WATERLOGGING: "Waterlogging",
  STREETLIGHT: "Broken Streetlight",
  ROAD_DAMAGE: "Road Damage",
  TRAFFIC_SIGNAL: "Traffic Signal Issue",
  FALLEN_TREE: "Fallen Tree",
  OTHER: "Other",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  REPORTED: "Reported",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  MERGED: "Merged",
};

/** Citizen-facing status colors (light + dark friendly). */
export const STATUS_COLORS: Record<
  IssueStatus,
  { bg: string; text: string; border: string }
> = {
  REPORTED: {
    bg: "bg-slate-500/10",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/30",
  },
  ACKNOWLEDGED: {
    bg: "bg-sky-500/10",
    text: "text-sky-800 dark:text-sky-300",
    border: "border-sky-500/30",
  },
  IN_PROGRESS: {
    bg: "bg-amber-500/10",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-500/30",
  },
  RESOLVED: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-800 dark:text-emerald-300",
    border: "border-emerald-500/30",
  },
  VERIFIED: {
    bg: "bg-emerald-600/15",
    text: "text-emerald-900 dark:text-emerald-200",
    border: "border-emerald-600/40",
  },
  REJECTED: {
    bg: "bg-red-500/10",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-500/30",
  },
  MERGED: {
    bg: "bg-violet-500/10",
    text: "text-violet-800 dark:text-violet-300",
    border: "border-violet-500/30",
  },
};
