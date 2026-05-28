import type { CaseStatus, UrgencyLevel, UserRole } from "@/types";

/** 系統顯示名稱 */
export const APP_NAME = "Grevia 客服案件追蹤平台";
export const APP_SUBTITLE = "客訴立案・處理・結案管理";

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
  assigned: "bg-brand-50 text-brand-700",
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
  medium: "bg-brand-50 text-brand-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  cs: "客服",
  handler: "處理人",
  admin: "管理者",
};

export const COMPLAINT_SOURCE_TYPES = ["綠途", "通路"] as const;

/** 客訴來源 → 客訴管道（二層選單） */
export const COMPLAINT_SOURCE_CHANNELS: Record<string, readonly string[]> = {
  通路: ["vivo", "全國電子"],
  綠途: ["MO+", "蝦皮直送", "蝦皮商城", "PCHOME", "門市"],
};

export const CUSTOMER_GENDERS = ["男", "女", "不透露"] as const;

/** 客訴類別 → 客訴問題（二層選單） */
export const COMPLAINT_CATEGORIES: Record<string, readonly string[]> = {
  商品問題: ["商品瑕疵", "規格不符", "缺件", "保固問題", "其他"],
  物流問題: ["配送延遲", "錯誤件", "修改收件資料", "其他"],
  服務問題: ["態度問題", "回覆過慢", "惡意客訴", "說明不清", "其他"],
  "退款/金流問題": ["發票問題", "折價券", "付款問題", "其他"],
  退換貨: ["功能異常", "外觀定義等級", "改變心意", "其他"],
  "系統/設備問題": ["無法操作", "付款異常", "設備故障", "系統錯誤", "其他"],
  其他: ["其他"],
};

export const COMPLAINT_CATEGORY_KEYS = Object.keys(
  COMPLAINT_CATEGORIES
) as (keyof typeof COMPLAINT_CATEGORIES)[];

/** 列表／詳情顯示：客訴類別 / 客訴問題 */
export function formatComplaintLabel(
  type: string,
  subtype: string | null | undefined
): string {
  if (!subtype) return type || "—";
  return `${type} / ${subtype}`;
}

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
