"use client";

import {
  buildIssueLifecycleSteps,
  lifecycleProgressPercent,
  type IssueLifecycleInput,
} from "@/lib/issues/lifecycle";
import { STATUS_LABELS } from "@/types/civic";
import { cn } from "@/utils";

const MINI_LABELS = ["Report", "BBMP", "Assign", "Fix", "Done", "Verify", "Closed"];

export function IssueLifecycleProgress({
  issue,
  className,
}: {
  issue: IssueLifecycleInput;
  className?: string;
}) {
  const { steps } = buildIssueLifecycleSteps(issue);
  const progress = lifecycleProgressPercent(steps);
  const trackable = steps.filter((s) => s.id !== "terminal").slice(0, 7);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium text-foreground">{STATUS_LABELS[issue.status]}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between gap-0.5">
        {trackable.map((step, i) => (
          <div
            key={step.id}
            className="flex flex-col items-center flex-1 min-w-0"
            title={step.label}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                step.state === "complete" && "bg-emerald-600",
                step.state === "current" && "bg-primary ring-2 ring-primary/30",
                step.state === "upcoming" && "bg-muted-foreground/30",
              )}
            />
            <span className="text-[9px] text-muted-foreground mt-1 truncate w-full text-center hidden sm:block">
              {MINI_LABELS[i] ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
