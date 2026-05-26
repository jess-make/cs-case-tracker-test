import type { CaseStatus, UrgencyLevel } from "@/types";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: CaseStatus }) {
  const label = CASE_STATUS_LABELS[status] ?? status ?? "未知";
  const color =
    CASE_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        color
      )}
    >
      {label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const label = URGENCY_LABELS[urgency] ?? urgency ?? "—";
  const color = URGENCY_COLORS[urgency] ?? "bg-slate-100 text-slate-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        color
      )}
    >
      {label}
    </span>
  );
}
