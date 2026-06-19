import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { DEPARTMENT_FILTER_UNASSIGNED } from "@/lib/case-department";
import type { Department } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
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
    !merged.includes(selected)
  ) {
    merged.push(selected);
  }

  return merged;
}
