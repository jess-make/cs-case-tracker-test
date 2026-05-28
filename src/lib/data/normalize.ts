import type { Case, CaseLog, CaseStatus, UrgencyLevel, User } from "@/types";
import { STATUS_FLOW } from "@/lib/constants";

function coerceEmbeddedUser(raw: unknown): User | null {
  if (raw == null) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const u = row as Record<string, unknown>;
  if (!u.id && !u.name) return null;

  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    name: String(u.name ?? ""),
    role: (u.role as User["role"]) ?? "cs",
    department: (u.department as string | null) ?? null,
    line_user_id: (u.line_user_id as string | null) ?? null,
    created_at: String(u.created_at ?? ""),
    updated_at: String(u.updated_at ?? ""),
  };
}

const VALID_STATUS = new Set<CaseStatus>(STATUS_FLOW);
const VALID_URGENCY = new Set<UrgencyLevel>(["low", "medium", "high", "critical"]);

/** 將 Supabase 回傳資料正規化，避免 null 欄位導致前端 Runtime Error */
export function normalizeCase(raw: Record<string, unknown>): Case {
  const status = VALID_STATUS.has(raw.status as CaseStatus)
    ? (raw.status as CaseStatus)
    : "new";
  const urgency = VALID_URGENCY.has(raw.urgency as UrgencyLevel)
    ? (raw.urgency as UrgencyLevel)
    : "medium";

  return {
    id: String(raw.id ?? ""),
    case_number: String(raw.case_number ?? "—"),
    customer_name: String(raw.customer_name ?? ""),
    customer_contact: String(raw.customer_contact ?? ""),
    customer_gender: (raw.customer_gender as string | null) ?? null,
    source: String(raw.source ?? ""),
    source_detail: (raw.source_detail as string | null) ?? null,
    complaint_type: String(raw.complaint_type ?? "其他"),
    complaint_subtype: (raw.complaint_subtype as string | null) ?? null,
    description: String(raw.description ?? ""),
    urgency,
    department: String(raw.department ?? ""),
    ecommerce_order_no: (raw.ecommerce_order_no as string | null) ?? null,
    assignee_id: (raw.assignee_id as string | null) ?? null,
    created_by_id: (raw.created_by_id as string | null) ?? null,
    status,
    due_date: (raw.due_date as string | null) ?? null,
    resolution: (raw.resolution as string | null) ?? null,
    attachment_urls: Array.isArray(raw.attachment_urls)
      ? (raw.attachment_urls as string[])
      : [],
    is_overdue: Boolean(raw.is_overdue),
    closed_at: (raw.closed_at as string | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
    assignee: coerceEmbeddedUser(raw.assignee),
    created_by: coerceEmbeddedUser(raw.created_by),
  };
}

export function normalizeCaseLog(raw: Record<string, unknown>): CaseLog {
  const action =
    (raw.action as string | undefined) ??
    (raw.log_action as string | undefined) ??
    (raw.type as string | undefined) ??
    "紀錄";

  return {
    id: String(raw.id ?? ""),
    case_id: String(raw.case_id ?? ""),
    user_id: (raw.user_id as string | null) ?? null,
    action,
    content: (raw.content as string | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    user: (raw.user as CaseLog["user"]) ?? null,
  };
}
