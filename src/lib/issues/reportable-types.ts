import { ISSUE_TYPE_LABELS } from "@/types/civic";
import { IssueType } from "@prisma/client";

/**
 * Civic issue categories citizens may report — all Prisma IssueType values except OTHER.
 * OTHER is reserved for non-reportable / unclassifiable content.
 */
export const REPORTABLE_ISSUE_TYPES = [
  IssueType.POTHOLE,
  IssueType.GARBAGE,
  IssueType.SEWAGE,
  IssueType.WATER_LEAK,
  IssueType.WATERLOGGING,
  IssueType.STREETLIGHT,
  IssueType.ROAD_DAMAGE,
  IssueType.TRAFFIC_SIGNAL,
  IssueType.FALLEN_TREE,
] as const;

export type ReportableIssueType = (typeof REPORTABLE_ISSUE_TYPES)[number];

const REPORTABLE_SET = new Set<string>(REPORTABLE_ISSUE_TYPES);

export function isReportableIssueType(type: string): type is ReportableIssueType {
  return REPORTABLE_SET.has(type);
}

export function getReportableTypeListText(): string {
  return REPORTABLE_ISSUE_TYPES.map((t) => ISSUE_TYPE_LABELS[t]).join(", ");
}

export const UNSUPPORTED_ISSUE_MESSAGE =
  "This does not match a supported civic issue category on NammaMarga. We only accept reports for road and public infrastructure problems in Bangalore.";

export function validateReportableIssueType(type: string):
  | { ok: true; type: ReportableIssueType }
  | { ok: false; message: string } {
  if (type === IssueType.OTHER) {
    return {
      ok: false,
      message: `${UNSUPPORTED_ISSUE_MESSAGE} Supported types: ${getReportableTypeListText()}.`,
    };
  }
  if (!isReportableIssueType(type)) {
    return {
      ok: false,
      message: `Unsupported issue type "${type}". Supported types: ${getReportableTypeListText()}.`,
    };
  }
  return { ok: true, type };
}
