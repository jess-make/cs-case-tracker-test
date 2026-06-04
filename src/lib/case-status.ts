import type { CaseStatus } from "@/types";
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from "@/lib/constants";

/** DB 舊狀態（不再顯示於流程，視同處理中） */
export const LEGACY_ASSIGNED_STATUS = "assigned";

/** 案件操作區／流程推進順序 */
export const CASE_FLOW_STEPS: CaseStatus[] = [
  "new",
  "in_progress",
  "replied",
  "cs_confirming",
  "closed",
];

/** 篩選下拉選項（與流程一致，不含 assigned） */
export const CASE_STATUS_FILTER_OPTIONS: CaseStatus[] = CASE_FLOW_STEPS;

/** 將 DB / 舊資料狀態轉為現行狀態 */
export function normalizeCaseStatus(status: string): CaseStatus {
  if (status === LEGACY_ASSIGNED_STATUS) return "in_progress";
  if (CASE_FLOW_STEPS.includes(status as CaseStatus)) return status as CaseStatus;
  return "new";
}

export function getCaseStatusLabel(status: string): string {
  return CASE_STATUS_LABELS[normalizeCaseStatus(status)];
}

export function getCaseStatusColor(status: string): string {
  return (
    CASE_STATUS_COLORS[normalizeCaseStatus(status)] ??
    "bg-slate-100 text-slate-600"
  );
}

export function getNextStatus(current: CaseStatus | string): CaseStatus | null {
  const status = normalizeCaseStatus(String(current));
  const idx = CASE_FLOW_STEPS.indexOf(status);
  if (idx < 0 || idx >= CASE_FLOW_STEPS.length - 1) return null;
  return CASE_FLOW_STEPS[idx + 1];
}

export function isActiveFlowStep(
  caseStatus: string,
  step: CaseStatus
): boolean {
  return normalizeCaseStatus(caseStatus) === step;
}
