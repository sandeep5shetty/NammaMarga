import { IssueType, Severity } from "@prisma/client";
import { z } from "zod";

export const classificationSchema = z.object({
  type: z.nativeEnum(IssueType),
  severity: z.nativeEnum(Severity),
  confidence: z.number().min(0).max(1),
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(500),
  reasoning: z.string().min(10).max(500),
});

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
