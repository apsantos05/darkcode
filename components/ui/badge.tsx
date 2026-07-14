import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted/10 text-muted border-muted/20",
  purple: "bg-primary/15 text-neon border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  blue: "bg-sky-500/15 text-sky-400 border-sky-500/30",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Mapeamentos de status de domínio para tons visuais. */
export const CLIENT_STATUS_TONE: Record<string, BadgeTone> = {
  LEAD: "neutral",
  NEGOTIATION: "blue",
  ONBOARDING: "purple",
  ACTIVE: "success",
  PAUSED: "warning",
  DEFAULTING: "danger",
  CLOSED: "neutral",
};

export const PROJECT_STATUS_TONE: Record<string, BadgeTone> = {
  PLANNING: "blue",
  IN_PROGRESS: "purple",
  IN_REVIEW: "warning",
  WAITING_CLIENT: "warning",
  PAUSED: "neutral",
  DONE: "success",
  CANCELED: "neutral",
  LATE: "danger",
};

export const TASK_STATUS_TONE: Record<string, BadgeTone> = {
  NOT_STARTED: "neutral",
  IN_ANALYSIS: "blue",
  IN_PROGRESS: "purple",
  WAITING_CLIENT: "warning",
  WAITING_THIRD_PARTY: "warning",
  IN_REVIEW: "blue",
  DONE: "success",
  BLOCKED: "danger",
  CANCELED: "neutral",
};

export const PRIORITY_TONE: Record<string, BadgeTone> = {
  LOW: "neutral",
  MEDIUM: "blue",
  HIGH: "warning",
  URGENT: "danger",
  CRITICAL: "danger",
};

export const REVENUE_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  PAID: "success",
  CANCELED: "neutral",
  REFUNDED: "danger",
  PARTIALLY_PAID: "blue",
};

export const DEADLINE_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELED: "neutral",
  COUNTERPROPOSAL: "blue",
};

export const USER_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  ACTIVE: "success",
  BLOCKED: "danger",
};
