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
