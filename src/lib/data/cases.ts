import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { resolveDateRange, toCreatedAtBounds } from "@/lib/date-range";
import { normalizeCase, normalizeCaseLog } from "@/lib/data/normalize";
import type {
  Case,
  CaseLog,
  CreateCaseInput,
  DashboardStats,
  CaseStatus,
  UpdateCaseInput,
  User,
} from "@/types";
import { buildCaseEditSummary } from "@/lib/case-edit-summary";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

async function fetchUsersByIds(ids: string[]): Promise<Map<string, User>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  try {
    const { data, error } = await (await supabase())
      .from("users")
      .select("*")
      .in("id", unique);
    if (error) {
      console.error("[fetchUsersByIds]", error.message);
      return new Map();
    }
    return new Map((data as User[]).map((u) => [u.id, u]));
  } catch (err) {
    console.error("[fetchUsersByIds]", err);
    return new Map();
  }
}

async function enrichCases(cases: Case[]): Promise<Case[]> {
  const ids: string[] = [];
  for (const c of cases) {
    if (c.assignee_id) ids.push(c.assignee_id);
    if (c.created_by_id) ids.push(c.created_by_id);
  }
  const userMap = await fetchUsersByIds(ids);

  return cases.map((c) =>
    normalizeCase({
      ...c,
      assignee: c.assignee_id ? userMap.get(c.assignee_id) ?? null : null,
      created_by: c.created_by_id ? userMap.get(c.created_by_id) ?? null : null,
    } as Record<string, unknown>)
  );
}

async function enrichLogs(logs: CaseLog[]): Promise<CaseLog[]> {
  const userMap = await fetchUsersByIds(
    logs.map((l) => l.user_id).filter((id): id is string => Boolean(id))
  );

  return logs.map((l) =>
    normalizeCaseLog({
      ...l,
      user: l.user_id ? userMap.get(l.user_id) ?? null : null,
    } as Record<string, unknown>)
  );
}

/** 取得預設操作者（第一筆客服，否則第一筆使用者） */
export async function getDefaultActorUserId(): Promise<string | null> {
  const client = await supabase();

  const { data: csUser } = await client
    .from("users")
    .select("id")
    .eq("role", "cs")
    .limit(1)
    .maybeSingle();
  if (csUser?.id) return csUser.id;

  const { data: anyUser } = await client
    .from("users")
    .select("id")
    .limit(1)
    .maybeSingle();
  return anyUser?.id ?? null;
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data as User[]) ?? [];
}

export async function getHandlers(): Promise<User[]> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("*")
    .in("role", ["handler", "admin"])
    .order("name");
  if (error) throw error;
  return (data as User[]) ?? [];
}

export async function getCases(filters?: {
  status?: string;
  assignee_id?: string;
  complaint_type?: string;
  urgency?: string;
  q?: string;
  date_preset?: string;
  date_from?: string;
  date_to?: string;
  filterByDate?: boolean;
}): Promise<Case[]> {
  const client = await supabase();
  let query = client.from("cases").select("*").order("created_at", {
    ascending: false,
  });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.assignee_id) query = query.eq("assignee_id", filters.assignee_id);
  if (filters?.complaint_type)
    query = query.eq("complaint_type", filters.complaint_type);
  if (filters?.urgency) query = query.eq("urgency", filters.urgency);

  if (filters?.filterByDate) {
    const { from, to } = resolveDateRange({
      date_preset: filters.date_preset,
      date_from: filters.date_from,
      date_to: filters.date_to,
    });
    const bounds = toCreatedAtBounds(from, to);
    query = query.gte("created_at", bounds.from).lte("created_at", bounds.to);
  }

  if (filters?.q?.trim()) {
    const sanitized = filters.q.trim().replace(/,/g, "");
    const term = `%${sanitized}%`;
    query = query.or(
      `case_number.ilike.${term},customer_name.ilike.${term},customer_contact.ilike.${term},ecommerce_order_no.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).map((row) =>
    normalizeCase(row as Record<string, unknown>)
  );
  return enrichCases(rows);
}

export async function getCaseById(id: string): Promise<Case | null> {
  try {
    const { data, error } = await (await supabase())
      .from("cases")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[getCaseById]", error.message);
      return null;
    }
    if (!data) return null;

    const [enriched] = await enrichCases([
      normalizeCase(data as Record<string, unknown>),
    ]);
    return enriched;
  } catch (err) {
    console.error("[getCaseById]", err);
    return null;
  }
}

export async function getCaseLogs(caseId: string): Promise<CaseLog[]> {
  try {
    const { data, error } = await (await supabase())
      .from("case_logs")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getCaseLogs]", error.message);
      return [];
    }

    const logs = (data ?? []).map((row) =>
      normalizeCaseLog(row as Record<string, unknown>)
    );
    return enrichLogs(logs);
  } catch (err) {
    console.error("[getCaseLogs]", err);
    return [];
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await (await supabase())
    .from("cases")
    .select("status");

  if (error) throw error;

  const cases = data ?? [];
  return {
    total: cases.length,
    inProgress: cases.filter((c) =>
      ["assigned", "in_progress", "replied"].includes(c.status)
    ).length,
    pendingConfirm: cases.filter((c) => c.status === "cs_confirming").length,
    closed: cases.filter((c) => c.status === "closed").length,
  };
}

export async function createCase(
  input: CreateCaseInput,
  createdById: string | null
): Promise<Case> {
  const client = await supabase();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const caseNumber = `CS-${datePart}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

  const { data, error } = await client
    .from("cases")
    .insert({
      customer_name: input.customer_name,
      customer_contact: input.customer_contact,
      customer_gender: input.customer_gender,
      source: input.source,
      source_detail: input.source_detail,
      complaint_type: input.complaint_type,
      complaint_subtype: input.complaint_subtype,
      description: input.description,
      urgency: input.urgency,
      department: input.department,
      ecommerce_order_no: input.ecommerce_order_no?.trim() || null,
      assignee_id: null,
      created_by_id: createdById,
      status: "new",
      due_date: null,
      attachment_urls: input.attachment_urls ?? [],
      case_number: caseNumber,
    })
    .select()
    .single();

  if (error) throw error;

  await addCaseLog(data.id, createdById, "建立案件", "客服建立新案件");

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return enriched;
}

export async function updateCase(
  caseId: string,
  input: UpdateCaseInput,
  userId: string | null
): Promise<{ case: Case | null; error?: string; unchanged?: boolean }> {
  const existing = await getCaseById(caseId);
  if (!existing) return { case: null, error: "案件不存在" };

  const summary = buildCaseEditSummary(existing, input);
  if (!summary) return { case: existing, unchanged: true };

  const client = await supabase();
  const { data, error } = await client
    .from("cases")
    .update({
      customer_name: input.customer_name,
      customer_contact: input.customer_contact,
      customer_gender: input.customer_gender,
      source: input.source,
      source_detail: input.source_detail,
      complaint_type: input.complaint_type,
      complaint_subtype: input.complaint_subtype,
      description: input.description,
      urgency: input.urgency,
      department: input.department,
      ecommerce_order_no: input.ecommerce_order_no?.trim() || null,
    })
    .eq("id", caseId)
    .select()
    .single();

  if (error) throw error;

  await addCaseLog(caseId, userId, "編輯案件", summary);

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return { case: enriched };
}

export async function addCaseLog(
  caseId: string,
  userId: string | null,
  action: string,
  content: string
): Promise<boolean> {
  const { error } = await (await supabase()).from("case_logs").insert({
    case_id: caseId,
    user_id: userId,
    action,
    content,
  });
  if (error) {
    console.error("[addCaseLog]", error.message);
    return false;
  }
  return true;
}

export async function updateCaseStatus(
  caseId: string,
  status: CaseStatus,
  userId: string | null,
  extra?: { resolution?: string }
): Promise<Case | null> {
  const updates: Record<string, unknown> = { status, ...extra };
  if (status === "closed") {
    updates.closed_at = new Date().toISOString();
  }

  const client = await supabase();
  const { data, error } = await client
    .from("cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single();

  if (error) throw error;

  await addCaseLog(caseId, userId, "狀態更新", `狀態變更為：${status}`);

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return enriched;
}

export async function addCaseReply(
  caseId: string,
  userId: string | null,
  content: string
): Promise<{ ok: boolean; logSaved: boolean }> {
  const logSaved = await addCaseLog(caseId, userId, "處理回覆", content);

  const { error } = await (await supabase())
    .from("cases")
    .update({ status: "replied" })
    .eq("id", caseId);

  if (error) throw error;

  return { ok: true, logSaved };
}

export async function uploadAttachment(file: File): Promise<string> {
  const client = await supabase();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await client.storage
    .from("case-attachments")
    .upload(path, file);

  if (error) throw error;

  const { data } = client.storage.from("case-attachments").getPublicUrl(path);
  return data.publicUrl;
}
