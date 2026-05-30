"use client";

import { cn } from "@/utils";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WizardStep = {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function WizardStepIndicator({
  steps,
  currentStep,
}: {
  steps: WizardStep[];
  currentStep: number;
}) {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-1">
        {steps.map((s, index) => {
          const isComplete = currentStep > s.id;
          const isActive = currentStep === s.id;
          const isLast = index === steps.length - 1;
          const Icon = s.icon;

          return (
            <div key={s.id} className="flex flex-1 items-start min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isComplete && "border-green-500 bg-green-500 text-white",
                    isActive && "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400 scale-110 shadow-lg shadow-green-500/20",
                    !isComplete && !isActive && "border-muted-foreground/25 bg-muted/50 text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border text-[9px] font-bold">
                    {s.id}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs font-semibold text-center truncate w-full px-0.5",
                    isActive ? "text-foreground" : isComplete ? "text-green-700 dark:text-green-400" : "text-muted-foreground",
                  )}
                >
                  {s.title}
                </p>
                <p className="text-[10px] text-muted-foreground text-center line-clamp-2 leading-tight mt-0.5 hidden sm:block">
                  {s.description}
                </p>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mt-5 mx-1 rounded-full transition-colors duration-500 min-w-[12px]",
                    isComplete ? "bg-green-500" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WizardStepHeading({
  step,
  totalSteps,
  title,
  description,
}: {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 rounded-xl border border-border/80 bg-gradient-to-br from-muted/40 to-transparent p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">
        Step {step} of {totalSteps}
      </p>
      <h3 className="text-lg font-semibold font-heading">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}
