import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "@/types/civic";
import type { IssueStatus } from "@prisma/client";
import { cn } from "@/utils";

export function IssueStatusBadge({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  const colors = STATUS_COLORS[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
