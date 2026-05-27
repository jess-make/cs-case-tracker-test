import type { CaseStatus, UrgencyLevel, UserRole } from "@/types";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: "新案件",
  assigned: "已指派",
  in_progress: "處理中",
  replied: "已回覆",
  cs_confirming: "客服確認中",
  closed: "已結案",
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  replied: "bg-purple-100 text-purple-700",
  cs_confirming: "bg-cyan-100 text-cyan-700",
  closed: "bg-emerald-100 text-emerald-700",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "緊急",
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  cs: "客服",
  handler: "處理人",
  admin: "管理者",
};

export const COMPLAINT_SOURCES = [
  "電話",
  "Email",
  "LINE",
  "官網",
  "門市",
  "FB",
  "IG",
  "其他",
] as const;

export const CUSTOMER_GENDERS = ["男", "女"] as const;

export const COMPLAINT_TYPES = [
  "產品品質",
  "配送問題",
  "服務態度",
  "帳務爭議",
  "退換貨",
  "系統問題",
  "其他",
] as const;

/** 建立案件：指派部門選項 */
export const DEPARTMENTS = [
  "後勤部-維修",
  "後勤部-品檢",
  "後勤部-倉儲",
  "業務部-電商",
  "業務部-門市",
  "業務部-客服",
  "行銷部",
  "開發部",
] as const;

/** 狀態流轉順序 */
export const STATUS_FLOW: CaseStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "replied",
  "cs_confirming",
  "closed",
];

export function getNextStatus(current: CaseStatus): CaseStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}
