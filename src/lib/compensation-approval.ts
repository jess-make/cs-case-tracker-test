import type { CompensationApprovalStatus, CompensationType } from "@/types";

export const COMPENSATION_CASE_CATEGORY = "商品問題";

export const COMPENSATION_TYPES = [
  "部分退款",
  "折價券",
  "其他補償",
] as const satisfies readonly CompensationType[];

export const COMPENSATION_APPROVAL_STATUS_LABELS: Record<
  CompensationApprovalStatus,
  string
> = {
  pending: "待審核",
  approved: "核准",
  rejected: "不同意",
};

export const COMPENSATION_APPROVAL_DECISIONS = [
  "approved",
  "rejected",
] as const satisfies readonly CompensationApprovalStatus[];

export function normalizeCompensationText(
  value: string | null | undefined
): string {
  return (value ?? "").trim();
}

export function isCompensationEligibleCase(
  category: string | null | undefined
): boolean {
  return normalizeCompensationText(category) === COMPENSATION_CASE_CATEGORY;
}

export function isCompensationType(value: string): value is CompensationType {
  return COMPENSATION_TYPES.includes(value as CompensationType);
}

export function parseCompensationType(
  value: string | null | undefined
): CompensationType | null {
  const normalized = normalizeCompensationText(value);
  if (!normalized) return null;
  if (!isCompensationType(normalized)) {
    throw new Error("補償簽核選項不正確，請重新選擇");
  }
  return normalized;
}

export function isCompensationApprovalStatus(
  value: string
): value is CompensationApprovalStatus {
  return (
    value === "pending" ||
    value === "approved" ||
    value === "rejected"
  );
}

export function formatCompensationStatus(
  status: CompensationApprovalStatus | null | undefined
): string {
  return status ? COMPENSATION_APPROVAL_STATUS_LABELS[status] : "未申請";
}
