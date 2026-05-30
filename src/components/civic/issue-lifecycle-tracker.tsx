"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildIssueLifecycleSteps,
  lifecycleProgressPercent,
  type IssueLifecycleInput,
} from "@/lib/issues/lifecycle";
import { cn } from "@/utils";
import { format } from "date-fns";
import {
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  Hammer,
  ShieldCheck,
  Users,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEP_ICONS: Record<string, LucideIcon> = {
  reported: FileText,
  acknowledged: CheckCircle2,
  contractor: Building2,
  in_progress: Hammer,
  resolved: CheckCircle2,
  verification: Users,
  verified: ShieldCheck,
  terminal: Circle,
};

function formatStepTime(iso?: string) {
  if (!iso) return null;
  try {
    return format(new Date(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return null;
  }
}

export function IssueLifecycleTracker({
  issue,
  className,
}: {
  issue: IssueLifecycleInput;
  className?: string;
}) {
  const { steps, currentLabel, isTerminal } = buildIssueLifecycleSteps(issue);
  const progress = lifecycleProgressPercent(steps);

  return (
    <Card className={cn("bg-card/50 border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">Resolution progress</CardTitle>
            <CardDescription className="mt-1">
              {isTerminal
                ? "Final status for this report"
                : `Currently: ${currentLabel}`}
            </CardDescription>
          </div>
          {!isTerminal && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-2 w-28 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {progress}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.id] ?? Circle;
            const isLast = index === steps.length - 1;
            const timeLabel = formatStepTime(step.timestamp);

            return (
              <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-[15px] top-8 bottom-0 w-px",
                      step.state === "complete"
                        ? "bg-emerald-500/50"
                        : "bg-border",
                    )}
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    step.state === "complete" &&
                      "border-emerald-600 bg-emerald-600 text-white",
                    step.state === "current" &&
                      "border-primary bg-primary/10 text-primary",
                    step.state === "upcoming" &&
                      "border-border bg-muted/50 text-muted-foreground",
                    step.state === "skipped" && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {step.state === "complete" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : step.state === "current" ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        step.state === "current" && "text-foreground",
                        step.state === "complete" && "text-foreground",
                        step.state === "upcoming" && "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    {step.state === "current" && (
                      <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Now
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                  {timeLabel && (
                    <p className="text-xs text-muted-foreground/80 mt-1">{timeLabel}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
