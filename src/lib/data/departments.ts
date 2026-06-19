import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
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