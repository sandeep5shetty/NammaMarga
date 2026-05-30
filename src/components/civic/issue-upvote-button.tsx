"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { Check, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type IssueUpvoteButtonProps = {
  issueId: string;
  initialCount?: number;
  /** Compact for cards; default for detail pages */
  size?: "sm" | "default";
  className?: string;
  label?: string;
  /** When the user already confirmed (e.g. from nearby API). */
  initialConfirmed?: boolean;
  onVoted?: (voteCount: number) => void;
};

export function IssueUpvoteButton({
  issueId,
  initialCount = 0,
  size = "sm",
  className,
  label = "I've also seen this issue",
  initialConfirmed = false,
  onVoted,
}: IssueUpvoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(initialConfirmed);

  useEffect(() => {
    setConfirmed(initialConfirmed);
  }, [initialConfirmed]);

  useEffect(() => {
    setVoteCount(initialCount);
  }, [initialCount]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirmed || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/issues/${issueId}/also-seen`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not confirm");

      const count = (json.data?.voteCount as number) ?? voteCount + 1;
      setVoteCount(count);
      setConfirmed(true);

      if (json.alreadyReported) {
        toast.info("You already confirmed this issue");
      } else {
        toast.success("Thanks — your confirmation was recorded");
      }
      onVoted?.(count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not confirm");
    } finally {
      setLoading(false);
    }
  };

  const displayCount = Math.max(voteCount, initialCount);

  return (
    <Button
      type="button"
      variant={confirmed ? "secondary" : "outline"}
      size={size}
      disabled={loading || confirmed}
      onClick={handleClick}
      className={cn(
        "shrink-0 gap-1.5 font-medium",
        confirmed && "text-muted-foreground",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : confirmed ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Users className="h-3.5 w-3.5" />
      )}
      <span className={size === "sm" ? "text-xs" : "text-sm"}>{label}</span>
      {displayCount > 0 && (
        <span className="tabular-nums text-muted-foreground font-normal">({displayCount})</span>
      )}
    </Button>
  );
}
