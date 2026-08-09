import type { Case, UpdateCaseInput } from "@/types";
import { URGENCY_LABELS } from "@/lib/constants";
import type { UrgencyLevel } from "@/types";

const FIELD_LABELS: Record<keyof UpdateCaseInput, string> = {
  customer_name: "客戶姓名",
  customer_gender: "客戶性別",
  customer_contact: "客戶聯繫方式",
  ecommerce_order_no: "電商訂單編號",
  batch_no: "批號",
  shipping_tracking_no: "寄件編號",
  source: "案件來源",
  source_detail: "服務管道",
  complaint_type: "案件類別",
  complaint_subtype: "子分類",
  urgency: "緊急程度",
  department: "指派部門",
  description: "問題描述",
};

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function formatDisplay(field: keyof UpdateCaseInput, value: string): string {
  if (field === "urgency") {
    return (URGENCY_LABELS[value as UrgencyLevel] ?? value) || "—";
  }
  return value || "—";
}

function beforeValue(before: Case, field: keyof UpdateCaseInput): string {
  switch (field) {
    case "ecommerce_order_no":
      return normalizeValue(before.ecommerce_order_no);
    case "batch_no":
      return normalizeValue(before.batch_no);
    case "shipping_tracking_no":
      return normalizeValue(before.shipping_tracking_no);
    case "complaint_subtype":
      return normalizeValue(before.complaint_subtype);
    case "customer_gender":
      return normalizeValue(before.customer_gender);
    case "department":
      return normalizeValue(before.department);
    default:
      return normalizeValue(before[field] as string);
  }
}

export function buildCaseEditSummary(
  before: Case,
  after: UpdateCaseInput,
  options?: { afterAssigneeName?: string | null }
): string | null {
  const changes: string[] = [];

  for (const field of Object.keys(FIELD_LABELS) as (keyof UpdateCaseInput)[]) {
    const oldVal = beforeValue(before, field);
    const newVal = normalizeValue(after[field] as string | null | undefined);

    if (oldVal !== newVal) {
      changes.push(
        `${FIELD_LABELS[field]}：「${formatDisplay(field, oldVal)}」→「${formatDisplay(field, newVal)}」`
      );
    }
  }

  const beforeAssignee = normalizeValue(before.assignee?.name);
  const afterAssignee = normalizeValue(options?.afterAssigneeName);
  if (options?.afterAssigneeName !== undefined && beforeAssignee !== afterAssignee) {
    changes.push(
      `處理人：「${beforeAssignee || "—"}」→「${afterAssignee || "—"}」`
    );
  }

  if (changes.length === 0) return null;
  return `案件資料已編輯：\n${changes.map((line) => `- ${line}`).join("\n")}`;
}
