import type { CaseStatus, UrgencyLevel } from "@/types";
import { URGENCY_LABELS, URGENCY_COLORS } from "@/lib/constants";
import { getCaseStatusColor, getCaseStatusLabel } from "@/lib/case-status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: CaseStatus | string }) {
  const label = getCaseStatusLabel(String(status));
  const color = getCaseStatusColor(String(status));

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
