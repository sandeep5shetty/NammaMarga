import type { Severity } from "@prisma/client";

const SEVERITY_SCORE: Record<Severity, number> = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 90,
};

export function calculatePriorityScore(params: {
  severity: Severity;
  voteCount: number;
  createdAt: Date;
  validationCount?: number;
  nearCriticalInfrastructure?: boolean;
}): number {
  const hoursOpen = (Date.now() - params.createdAt.getTime()) / (1000 * 60 * 60);
  const severityScore = SEVERITY_SCORE[params.severity];
  const voteScore = Math.min(params.voteCount * 3, 45);
  const ageScore = Math.min(hoursOpen / 12, 30);
  const validationScore = Math.min((params.validationCount ?? 0) * 5, 25);
  const locationScore = params.nearCriticalInfrastructure ? 15 : 0;

  return Math.round(
    severityScore + voteScore + ageScore + validationScore + locationScore,
  );
}
