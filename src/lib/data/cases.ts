import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { resolveDateRange, toCreatedAtBounds } from "@/lib/date-range";
import { normalizeCase, normalizeCaseLog } from "@/lib/data/normalize";
import { canViewCase } from "@/lib/auth/case-access";
import { DEPARTMENT_FILTER_UNASSIGNED } from "@/lib/case-department";
import { CS_DEPARTMENT } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth/session";
import type {
  Case,
  CaseLog,
  CreateCaseInput,
  DashboardStats,
  CaseStatus,
  UpdateCaseInput,
  User,
  UserRole,
} from "@/types";
import {
  createCaseLog,
  logCaseEdited,
  logStatusChange,
  logCaseReply,
  logWorkflowReverted,
} from "@/lib/data/case-logs";
import { buildCaseEditSummary } from "@/lib/case-edit-summary";
import { hasAssignedDepartment } from "@/lib/case-department";
import {
  getNextDepartmentInAssignmentPlan,
  isDepartmentInAssignmentPlan,
} from "@/lib/case-auto-assignment";
import { getCaseAssignmentPlan } from "@/lib/data/case-assignment-rules";
import {
  isCompensationEligibleCase,
  parseCompensationType,
} from "@/lib/compensation-approval";
import { isDepartmentInScope } from "@/lib/department-scope";
import {
  buildDashboardStats,
} from "@/lib/dashboard-cases";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

type ReplyActor = {
  role: UserRole;
  department: string | null;
};

const AUTO_ASSIGNMENT_DEPARTMENT_PATTERN =
  /^自動指派部門：「(.+?)」→「(.+?)」/;

/** 查詢案件並 join 負責人／建立者姓名（保留 assignee_id 供篩選與轉派） */
const CASE_SELECT_WITH_USERS = `
  *,
  assignee:users!cases_assignee_id_fkey (
    id, name, email, role, department, line_user_id, created_at, updated_at
  ),
  created_by:users!cases_created_by_id_fkey (
    id, name, email, role, department, line_user_id, created_at, updated_at
  ),
  compensation_requested_by:users!cases_compensation_requested_by_id_fkey (
    id, name, email, role, department, line_user_id, created_at, updated_at
  ),
  compensation_reviewed_by:users!cases_compensation_reviewed_by_id_fkey (
    id, name, email, role, department, line_user_id, created_at, updated_at
  )
`;

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
    if (c.compensation_requested_by_id) ids.push(c.compensation_requested_by_id);
    if (c.compensation_reviewed_by_id) ids.push(c.compensation_reviewed_by_id);
  }
  const userMap = await fetchUsersByIds(ids);

  const enriched = cases.map((c) =>
    normalizeCase({
      ...c,
      assignee: c.assignee_id
        ? userMap.get(c.assignee_id) ?? c.assignee ?? null
        : null,
      created_by: c.created_by_id
        ? userMap.get(c.created_by_id) ?? c.created_by ?? null
        : null,
      compensation_requested_by: c.compensation_requested_by_id
        ? userMap.get(c.compensation_requested_by_id) ??
          c.compensation_requested_by ??
          null
        : null,
      compensation_reviewed_by: c.compensation_reviewed_by_id
        ? userMap.get(c.compensation_reviewed_by_id) ??
          c.compensation_reviewed_by ??
          null
        : null,
    } as Record<string, unknown>)
  );

  return attachParticipantDepartments(enriched);
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

function normalizeDepartmentName(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function addUniqueDepartment(target: string[], department: string): void {
  const normalized = normalizeDepartmentName(department);
  if (normalized && !target.includes(normalized)) {
    target.push(normalized);
  }
}

function parseAutoAssignmentFromDepartment(content: string | null): string | null {
  const match = content?.trim().match(AUTO_ASSIGNMENT_DEPARTMENT_PATTERN);
  return match?.[1]?.trim() || null;
}

async function fetchParticipantDepartmentsByCaseId(
  caseIds: string[]
): Promise<Map<string, string[]>> {
  const uniqueIds = [...new Set(caseIds.filter(Boolean))];
  const byCaseId = new Map<string, string[]>();
  if (uniqueIds.length === 0) return byCaseId;

  const { data, error } = await (await supabase())
    .from("case_logs")
    .select("case_id, content")
    .in("case_id", uniqueIds)
    .eq("action", "編輯案件");

  if (error) {
    console.error("[fetchParticipantDepartmentsByCaseId]", error.message);
    return byCaseId;
  }

  for (const row of data ?? []) {
    const caseId = String(row.case_id ?? "");
    const department = parseAutoAssignmentFromDepartment(
      (row.content as string | null) ?? null
    );
    if (!caseId || !department || department === CS_DEPARTMENT) continue;
    const departments = byCaseId.get(caseId) ?? [];
    addUniqueDepartment(departments, department);
    byCaseId.set(caseId, departments);
  }

  return byCaseId;
}

async function attachParticipantDepartments(cases: Case[]): Promise<Case[]> {
  const participantsByCaseId = await fetchParticipantDepartmentsByCaseId(
    cases.map((caseData) => caseData.id)
  );

  return cases.map((caseData) => ({
    ...caseData,
    participant_departments: participantsByCaseId.get(caseData.id) ?? [],
  }));
}

/** 取得預設操作者（第一筆一般使用者，否則第一筆使用者） */
export async function getDefaultActorUserId(): Promise<string | null> {
  const client = await supabase();

  const { data: defaultUser } = await client
    .from("users")
    .select("id")
    .eq("role", "user")
    .limit(1)
    .maybeSingle();
  if (defaultUser?.id) return defaultUser.id;

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

/** 案件列表「處理人」篩選選項（僅客服部門人員） */
export async function getAssigneeFilterUsers(): Promise<User[]> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("*")
    .eq("department", CS_DEPARTMENT)
    .order("name");
  if (error) throw error;
  return (data as User[]) ?? [];
}

function canAutoAdvanceDepartmentStep(
  caseData: Case,
  actor: ReplyActor | null | undefined
): boolean {
  const caseDept = caseData.department?.trim();
  const actorDept = actor?.department?.trim();
  if (!caseDept || !actorDept || !actor) return false;
  if (actor.role === "admin" || actorDept === CS_DEPARTMENT) return false;
  if (actorDept === caseDept) return true;

  return actor.role === "department_head" && isDepartmentInScope(caseDept, actorDept);
}

function isCsReplyActor(actor: ReplyActor | null | undefined): boolean {
  return (
    actor?.role === "admin" ||
    actor?.department?.trim() === CS_DEPARTMENT
  );
}

function shouldConfirmByCsReply(
  caseData: Case,
  actor: ReplyActor | null | undefined
): boolean {
  return (
    isCsReplyActor(actor) &&
    normalizeDepartmentName(caseData.department) === CS_DEPARTMENT &&
    caseData.status === "replied"
  );
}

/** @deprecated 請改用 getAssigneeFilterUsers */
export const getHandlers = getAssigneeFilterUsers;

export async function getCases(
  viewer: SessionUser,
  filters?: {
  status?: string;
  assignee_id?: string;
  department?: string;
  complaint_type?: string;
  complaint_subtype?: string;
  source?: string;
  source_detail?: string;
  urgency?: string;
  q?: string;
  date_preset?: string;
  date_from?: string;
  date_to?: string;
  filterByDate?: boolean;
  }
): Promise<Case[]> {
  const client = await supabase();
  let query = client
    .from("cases")
    .select(CASE_SELECT_WITH_USERS)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    const status =
      filters.status === "assigned" ? "in_progress" : filters.status;
    query = query.eq("status", status);
  }
  if (filters?.assignee_id) query = query.eq("assignee_id", filters.assignee_id);
  if (filters?.department) {
    if (filters.department === DEPARTMENT_FILTER_UNASSIGNED) {
      query = query.or("department.is.null,department.eq.");
    } else {
      query = query.eq("department", filters.department);
    }
  }
  if (filters?.complaint_type)
    query = query.eq("complaint_type", filters.complaint_type);
  if (filters?.complaint_subtype)
    query = query.eq("complaint_subtype", filters.complaint_subtype);
  if (filters?.source) query = query.eq("source", filters.source);
  if (filters?.source_detail)
    query = query.eq("source_detail", filters.source_detail);
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
      `case_number.ilike.${term},customer_name.ilike.${term},customer_contact.ilike.${term},ecommerce_order_no.ilike.${term},batch_no.ilike.${term},shipping_tracking_no.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).map((row) =>
    normalizeCase(row as Record<string, unknown>)
  );
  const enriched = await enrichCases(rows);
  return enriched.filter((caseData) => canViewCase(viewer, caseData));
}

export async function getCaseById(
  id: string,
  viewer?: SessionUser
): Promise<Case | null> {
  try {
    const { data, error } = await (await supabase())
      .from("cases")
      .select(CASE_SELECT_WITH_USERS)
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

    if (viewer && !canViewCase(viewer, enriched)) {
      return null;
    }

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

export async function getCaseLogsByCaseIds(
  caseIds: string[]
): Promise<Map<string, CaseLog[]>> {
  const uniqueIds = [...new Set(caseIds.filter(Boolean))];
  const byCaseId = new Map<string, CaseLog[]>();
  if (uniqueIds.length === 0) return byCaseId;

  try {
    const { data, error } = await (await supabase())
      .from("case_logs")
      .select("*")
      .in("case_id", uniqueIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getCaseLogsByCaseIds]", error.message);
      return byCaseId;
    }

    for (const row of data ?? []) {
      const log = normalizeCaseLog(row as Record<string, unknown>);
      const logs = byCaseId.get(log.case_id) ?? [];
      logs.push(log);
      byCaseId.set(log.case_id, logs);
    }

    return byCaseId;
  } catch (err) {
    console.error("[getCaseLogsByCaseIds]", err);
    return byCaseId;
  }
}

export async function getDashboardStats(viewer: SessionUser): Promise<DashboardStats> {
  const cases = await getCases(viewer);
  return buildDashboardStats(cases);
}

export async function createCase(
  input: CreateCaseInput,
  createdById: string | null
): Promise<Case> {
  const client = await supabase();
  const assignedDepartment = hasAssignedDepartment(input.department);
  const initialStatus = assignedDepartment ? "in_progress" : "new";
  const compensationType =
    isCompensationEligibleCase(input.complaint_type) && input.compensation_type
      ? parseCompensationType(input.compensation_type)
      : null;
  const compensationRequestedAt = compensationType
    ? new Date().toISOString()
    : null;

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
      department: input.department ?? null,
      ecommerce_order_no: input.ecommerce_order_no?.trim() || null,
      batch_no: input.batch_no?.trim() || null,
      shipping_tracking_no: input.shipping_tracking_no?.trim() || null,
      assignee_id: createdById,
      created_by_id: createdById,
      status: initialStatus,
      due_date: null,
      compensation_type: compensationType,
      compensation_status: compensationType ? "pending" : null,
      compensation_requested_by_id: compensationType ? createdById : null,
      compensation_requested_at: compensationRequestedAt,
      compensation_reviewed_by_id: null,
      compensation_reviewed_at: null,
      compensation_review_note: null,
      attachment_urls: [],
    })
    .select()
    .single();

  if (error) throw error;

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return enriched;
}

export async function updateCase(
  caseId: string,
  input: UpdateCaseInput,
  userId: string | null
): Promise<{
  case: Case | null;
  error?: string;
  unchanged?: boolean;
  departmentAssigned?: boolean;
}> {
  const existing = await getCaseById(caseId);
  if (!existing) return { case: null, error: "案件不存在" };

  const summary = buildCaseEditSummary(existing, input);
  const prevDept = existing.department?.trim() ?? "";
  const nextDept = (input.department ?? "").trim();
  const departmentAssigned = Boolean(nextDept) && prevDept !== nextDept;
  const hadDepartment = hasAssignedDepartment(existing.department);
  const hasDepartment = hasAssignedDepartment(input.department);
  const newlyAssignedDepartment = !hadDepartment && hasDepartment;
  const promoteToInProgress =
    newlyAssignedDepartment && existing.status === "new";

  if (!summary && !promoteToInProgress) {
    return { case: existing, unchanged: true, departmentAssigned: false };
  }

  const client = await supabase();
  const updates: Record<string, unknown> = {
    customer_name: input.customer_name,
    customer_contact: input.customer_contact,
    customer_gender: input.customer_gender,
    source: input.source,
    source_detail: input.source_detail,
    complaint_type: input.complaint_type,
    complaint_subtype: input.complaint_subtype,
    description: input.description,
    urgency: input.urgency,
    department: input.department ?? null,
    ecommerce_order_no: input.ecommerce_order_no?.trim() || null,
    batch_no: input.batch_no?.trim() || null,
    shipping_tracking_no: input.shipping_tracking_no?.trim() || null,
  };

  if (promoteToInProgress) {
    updates.status = "in_progress";
  }

  const { data, error } = await client
    .from("cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single();

  if (error) throw error;

  if (summary) {
    await logCaseEdited(caseId, userId, summary);
  }

  if (promoteToInProgress) {
    await logStatusChange(caseId, userId, "in_progress");
  }

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return { case: enriched, departmentAssigned };
}

export async function reviewCaseCompensation(
  caseId: string,
  status: "approved" | "rejected",
  note: string,
  reviewerId: string
): Promise<Case | null> {
  const trimmedNote = note.trim();
  if (!trimmedNote) {
    throw new Error("請填寫審核說明");
  }

  const client = await supabase();
  const { data, error } = await client
    .from("cases")
    .update({
      compensation_status: status,
      compensation_review_note: trimmedNote,
      compensation_reviewed_by_id: reviewerId,
      compensation_reviewed_at: new Date().toISOString(),
    })
    .eq("id", caseId)
    .eq("compensation_status", "pending")
    .not("compensation_type", "is", null)
    .select(CASE_SELECT_WITH_USERS)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return enriched;
}

export async function addCaseLog(
  caseId: string,
  userId: string | null,
  action: string,
  content: string
): Promise<boolean> {
  return createCaseLog(caseId, userId, action, content);
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
  } else {
    updates.closed_at = null;
  }

  const client = await supabase();
  const { data, error } = await client
    .from("cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single();

  if (error) throw error;

  await logStatusChange(caseId, userId, status);

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return enriched;
}

export async function revertCaseStatus(
  caseId: string,
  status: CaseStatus,
  userId: string | null,
  options?: { department?: string | null }
): Promise<Case | null> {
  const existing = await getCaseById(caseId);
  if (!existing) return null;

  const targetDepartment =
    options && "department" in options
      ? options.department ?? null
      : existing.department;
  const updates: Record<string, unknown> = { status, closed_at: null };
  if (options && "department" in options) {
    updates.department = targetDepartment;
  }

  const client = await supabase();
  const { data, error } = await client
    .from("cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single();

  if (error) throw error;

  await logWorkflowReverted(caseId, userId, existing.status, status, {
    fromDepartment: existing.department,
    toDepartment: targetDepartment,
  });

  const [enriched] = await enrichCases([
    normalizeCase(data as Record<string, unknown>),
  ]);
  return enriched;
}

export async function addCaseReply(
  caseId: string,
  userId: string | null,
  content: string,
  actor?: ReplyActor
): Promise<{
  ok: boolean;
  logSaved: boolean;
  case: Case | null;
  departmentAssigned: boolean;
}> {
  const existing = await getCaseById(caseId);
  if (!existing) {
    return { ok: false, logSaved: false, case: null, departmentAssigned: false };
  }

  const replyLogSaved = await logCaseReply(caseId, userId, content);
  const departmentStepCompleted = canAutoAdvanceDepartmentStep(existing, actor);
  const assignmentPlan = await getCaseAssignmentPlan(
    existing.complaint_type,
    existing.complaint_subtype
  );
  const currentDepartmentIsAutoStep = isDepartmentInAssignmentPlan(
    assignmentPlan,
    existing.department
  );
  const nextDepartment = departmentStepCompleted
    ? getNextDepartmentInAssignmentPlan(assignmentPlan, existing.department)
    : null;
  const shouldReturnToCs =
    departmentStepCompleted &&
    !nextDepartment &&
    hasAssignedDepartment(existing.department) &&
    normalizeDepartmentName(existing.department) !== CS_DEPARTMENT &&
    (currentDepartmentIsAutoStep || existing.status === "in_progress");
  const nextStatus: CaseStatus = nextDepartment
    ? "in_progress"
    : shouldReturnToCs
      ? "replied"
      : shouldConfirmByCsReply(existing, actor)
        ? "cs_confirming"
        : existing.status;

  const updates: Record<string, unknown> = {};
  if (nextStatus !== existing.status) {
    updates.status = nextStatus;
  }
  if (nextDepartment) {
    updates.department = nextDepartment;
  }
  if (shouldReturnToCs) {
    updates.department = CS_DEPARTMENT;
  }

  let updatedCase = existing;
  let normalizedUpdatedCase: Case | null = null;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await (await supabase())
      .from("cases")
      .update(updates)
      .eq("id", caseId)
      .select()
      .single();

    if (error) throw error;
    normalizedUpdatedCase = normalizeCase(data as Record<string, unknown>);
  }

  let statusLogSaved = true;
  if (existing.status !== nextStatus) {
    statusLogSaved = await logStatusChange(caseId, userId, nextStatus);
  }

  let assignmentLogSaved = true;
  const assignedDepartment =
    nextDepartment ?? (shouldReturnToCs ? CS_DEPARTMENT : null);
  if (assignedDepartment) {
    assignmentLogSaved = await logCaseEdited(
      caseId,
      userId,
      `自動指派部門：「${existing.department?.trim() || "—"}」→「${assignedDepartment}」`
    );
  }

  if (normalizedUpdatedCase) {
    [updatedCase] = await enrichCases([
      normalizedUpdatedCase,
    ]);
  }

  return {
    ok: true,
    logSaved: replyLogSaved && statusLogSaved && assignmentLogSaved,
    case: updatedCase,
    departmentAssigned: Boolean(nextDepartment),
  };
}
