import { db } from "@/lib/prisma";
import { resolveRoadSegmentId } from "@/lib/geo/road-segment";
import { resolveWardId } from "@/lib/geo/ward-resolver";
import { calculatePriorityScore } from "@/lib/scoring/priority";
import { calculateRoadHealthScore } from "@/lib/scoring/road-health";
import type { IssueType, Severity } from "@prisma/client";

export async function enrichAndCreateIssue(params: {
  title: string;
  description?: string;
  type: IssueType;
  severity: Severity;
  confidence: number;
  aiSummary?: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address?: string;
  wardId?: string;
  reporterId: string;
  detection?: {
    modelProvider: string;
    modelVersion?: string;
    detectedCategory: IssueType;
    confidence: number;
    severityHint?: Severity;
    rawResponse?: unknown;
  };
}) {
  const wardId = params.wardId ?? (await resolveWardId(params.latitude, params.longitude));
  const roadSegmentId = await resolveRoadSegmentId(
    params.latitude,
    params.longitude,
    wardId,
  );

  const priorityScore = calculatePriorityScore({
    severity: params.severity,
    voteCount: 0,
    createdAt: new Date(),
  });

  const issue = await db.issue.create({
    data: {
      title: params.title,
      description: params.description,
      type: params.type,
      severity: params.severity,
      confidence: params.confidence,
      aiSummary: params.aiSummary,
      imageUrl: params.imageUrl,
      latitude: params.latitude,
      longitude: params.longitude,
      address: params.address,
      wardId: wardId ?? undefined,
      roadSegmentId: roadSegmentId ?? undefined,
      reporterId: params.reporterId,
      priorityScore,
    },
    include: { ward: true, roadSegment: true },
  });

  if (params.detection) {
    await db.issueDetection.create({
      data: {
        issueId: issue.id,
        modelProvider: params.detection.modelProvider,
        modelVersion: params.detection.modelVersion,
        detectedCategory: params.detection.detectedCategory,
        confidence: params.detection.confidence,
        severityHint: params.detection.severityHint,
        rawResponse: params.detection.rawResponse as object | undefined,
      },
    });
  }

  await db.issueStatusHistory.create({
    data: {
      issueId: issue.id,
      changedByUserId: params.reporterId,
      toStatus: "REPORTED",
      note: "Issue reported by citizen",
    },
  });

  if (roadSegmentId) {
    await recalculateRoadHealth(roadSegmentId);
  }

  return issue;
}

export async function recalculateRoadHealth(roadSegmentId: string) {
  const issues = await db.issue.findMany({
    where: { roadSegmentId, duplicateOfId: null },
    select: { severity: true, status: true, createdAt: true, resolvedAt: true },
  });

  const healthScore = calculateRoadHealthScore(issues);

  await db.roadSegment.update({
    where: { id: roadSegmentId },
    data: { healthScore, lastScoredAt: new Date() },
  });

  return healthScore;
}

export async function refreshIssuePriority(issueId: string) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: { votes: true },
  });
  if (!issue) return null;

  const validationCount = issue.votes.filter((v) => v.severityConfirmation).length;
  const priorityScore = calculatePriorityScore({
    severity: issue.severity,
    voteCount: issue.voteCount,
    createdAt: issue.createdAt,
    validationCount,
  });

  return db.issue.update({
    where: { id: issueId },
    data: { priorityScore },
  });
}
