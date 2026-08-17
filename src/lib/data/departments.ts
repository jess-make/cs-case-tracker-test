import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import {
  DEPARTMENT_FILTER_UNASSIGNED,
  isProtectedSystemDepartment,
} from "@/lib/case-department";
import { BUSINESS_HEAD_DEPARTMENT } from "@/lib/constants";
import type { Department } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function isAssignmentRuleSchemaUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as SupabaseLikeError;
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    (message?.includes("case_assignment_rule_steps") ?? false)
  );
}

const CASE_ASSIGNMENT_EXCLUDED_DEPARTMENTS = new Set([
  "CEO",
  "管理員",
  "後勤部",
  BUSINESS_HEAD_DEPARTMENT,
]);

function canShowInCaseAssignmentOptions(name: string): boolean {
  return !CASE_ASSIGNMENT_EXCLUDED_DEPARTMENTS.has(name.trim());
}

function normalizeDepartment(raw: Record<string, unknown>): Department {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    is_active: raw.is_active !== false,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

/** 下拉選單：僅啟用中的部門名稱 */
export async function getActiveDepartmentNames(): Promise<string[]> {
  const { data, error } = await (await supabase())
    .from("departments")
    .select("name")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => String(row.name));
}

/** 案件指派下拉：排除不會被指派案件的母部門／管理類部門 */
export async function getCaseAssignableDepartmentNames(): Promise<string[]> {
  return (await getActiveDepartmentNames()).filter(
    canShowInCaseAssignmentOptions
  );
}

/** 部門管理：全部部門 */
export async function getDepartmentsForManagement(): Promise<Department[]> {
  const { data, error } = await (await supabase())
    .from("departments")
    .select("*")
    .order("name");

  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeDepartment);
}

export async function createDepartment(name: string): Promise<Department> {
  const trimmed = name.trim();
  const { data, error } = await (await supabase())
    .from("departments")
    .insert({ name: trimmed, is_active: true })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("部門名稱已存在");
    }
    throw error;
  }

  return normalizeDepartment(data as Record<string, unknown>);
}

export async function setDepartmentActive(
  id: string,
  isActive: boolean
): Promise<Department> {
  const { data, error } = await (await supabase())
    .from("departments")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeDepartment(data as Record<string, unknown>);
}

/** 案件列表篩選：啟用部門 + 停用部門 + 目前選取（含舊資料孤兒名稱） */
export async function getDepartmentNamesForCaseFilter(
  selectedDepartment?: string
): Promise<string[]> {
  const { data, error } = await (await supabase())
    .from("departments")
    .select("name, is_active")
    .order("name");

  if (error) throw error;

  const active: string[] = [];
  const inactive: string[] = [];
  for (const row of data ?? []) {
    const name = String(row.name);
    if (!canShowInCaseAssignmentOptions(name)) continue;
    if (row.is_active !== false) active.push(name);
    else inactive.push(name);
  }

  const merged = [...active];
  for (const name of inactive) {
    if (!merged.includes(name)) merged.push(name);
  }

  const selected = selectedDepartment?.trim();
  if (
    selected &&
    selected !== DEPARTMENT_FILTER_UNASSIGNED &&
    canShowInCaseAssignmentOptions(selected) &&
    !merged.includes(selected)
  ) {
    merged.push(selected);
  }

  return merged;
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  const { data, error } = await (await supabase())
    .from("departments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeDepartment(data as Record<string, unknown>);
}

export async function getDepartmentUsageCounts(
  departmentName: string
): Promise<{ users: number; cases: number; assignmentRules: number }> {
  const client = await supabase();
  const [usersRes, casesRes] = await Promise.all([
    client
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("department", departmentName),
    client
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("department", departmentName),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (casesRes.error) throw casesRes.error;

  let assignmentRules = 0;
  const rulesRes = await client
    .from("case_assignment_rule_steps")
    .select("*", { count: "exact", head: true })
    .eq("department", departmentName);
  if (rulesRes.error && !isAssignmentRuleSchemaUnavailableError(rulesRes.error)) {
    throw rulesRes.error;
  }
  if (!rulesRes.error) {
    assignmentRules = rulesRes.count ?? 0;
  }

  return {
    users: usersRes.count ?? 0,
    cases: casesRes.count ?? 0,
    assignmentRules,
  };
}

export async function renameDepartment(
  id: string,
  newName: string
): Promise<Department> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("部門名稱不可為空");
  }

  const client = await supabase();
  const existing = await getDepartmentById(id);
  if (!existing) {
    throw new Error("找不到部門");
  }

  const oldName = existing.name;
  if (isProtectedSystemDepartment(oldName)) {
    throw new Error("此為系統客服部門，不可改名");
  }
  if (oldName === trimmed) {
    return existing;
  }

  const { data: duplicate } = await client
    .from("departments")
    .select("id")
    .eq("name", trimmed)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    throw new Error("部門名稱已存在");
  }

  const { error: usersError } = await client
    .from("users")
    .update({ department: trimmed })
    .eq("department", oldName);

  if (usersError) {
    throw new Error(`更新使用者部門失敗：${usersError.message}`);
  }

  const { error: casesError } = await client
    .from("cases")
    .update({ department: trimmed })
    .eq("department", oldName);

  if (casesError) {
    await client
      .from("users")
      .update({ department: oldName })
      .eq("department", trimmed);
    throw new Error(`更新案件部門失敗：${casesError.message}`);
  }

  const { error: assignmentRulesError } = await client
    .from("case_assignment_rule_steps")
    .update({ department: trimmed })
    .eq("department", oldName);

  if (
    assignmentRulesError &&
    !isAssignmentRuleSchemaUnavailableError(assignmentRulesError)
  ) {
    await client
      .from("users")
      .update({ department: oldName })
      .eq("department", trimmed);
    await client
      .from("cases")
      .update({ department: oldName })
      .eq("department", trimmed);
    throw new Error(`更新指派規則部門失敗：${assignmentRulesError.message}`);
  }

  const { data, error: deptError } = await client
    .from("departments")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .single();

  if (deptError) {
    await client
      .from("users")
      .update({ department: oldName })
      .eq("department", trimmed);
    await client
      .from("cases")
      .update({ department: oldName })
      .eq("department", trimmed);
    await client
      .from("case_assignment_rule_steps")
      .update({ department: oldName })
      .eq("department", trimmed);
    if (deptError.code === "23505") {
      throw new Error("部門名稱已存在");
    }
    throw new Error(`更新部門失敗：${deptError.message}`);
  }

  return normalizeDepartment(data as Record<string, unknown>);
}

export async function deleteDepartment(id: string): Promise<void> {
  const existing = await getDepartmentById(id);
  if (!existing) {
    throw new Error("找不到部門");
  }

  if (isProtectedSystemDepartment(existing.name)) {
    throw new Error("此為系統客服部門，不可刪除");
  }

  const { users, cases, assignmentRules } = await getDepartmentUsageCounts(
    existing.name
  );
  if (users > 0 || cases > 0 || assignmentRules > 0) {
    throw new Error(
      `無法刪除部門，目前仍有 ${users} 位使用者、${cases} 筆案件、${assignmentRules} 條指派規則使用此部門。`
    );
  }

  const { error } = await (await supabase())
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
