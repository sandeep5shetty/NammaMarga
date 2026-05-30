import { REPORTABLE_ISSUE_TYPES } from "@/lib/issues/reportable-types";
import { IssueType, Severity } from "@prisma/client";
import { z } from "zod";

const reportableTypeEnum = z.enum(
  REPORTABLE_ISSUE_TYPES as unknown as [IssueType, ...IssueType[]],
);

/** Raw model output for a supported civic issue. */
export const classificationSchema = z.object({
  isCivicIssue: z.literal(true),
  type: reportableTypeEnum,
  severity: z.nativeEnum(Severity),
  confidence: z.number().min(0).max(1),
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(500),
  reasoning: z.string().min(10).max(500),
});

/** Raw model output when the photo is not a reportable civic issue. */
export const classificationRejectionSchema = z.object({
  isCivicIssue: z.literal(false),
  reason: z.string().min(10).max(500),
  summary: z.string().max(500).optional(),
});

export const classificationResponseSchema = z.discriminatedUnion("isCivicIssue", [
  classificationSchema,
  classificationRejectionSchema,
]);

export const verificationSchema = z.object({
  verified: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10).max(500),
  improvements: z.array(z.string()).max(5),
});

export const summarySchema = z.object({
  summary: z.string().min(20).max(600),
  keyPoints: z.array(z.string()).min(1).max(6),
  recommendedAction: z.string().min(10).max(300),
  estimatedResolutionDays: z.number().min(1).max(365),
});

export const classifyRequestSchema = z.object({
  imageUrl: z.string().url(),
  description: z.string().max(1000).optional(),
});

export const verifyRequestSchema = z.object({
  beforeImageUrl: z.string().url(),
  afterImageUrl: z.string().url(),
  issueType: z.nativeEnum(IssueType),
  description: z.string().max(1000).optional(),
});

export const summaryRequestSchema = z.object({
  issueIds: z.array(z.string()).min(1).max(50).optional(),
  wardId: z.string().optional(),
  period: z.enum(["week", "month", "quarter"]).optional(),
});
