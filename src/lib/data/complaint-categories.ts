import { mergeTaxonomyFilterNames } from "@/lib/complaint-taxonomy";
import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { countIssuesByCategoryId } from "@/lib/data/complaint-issues";
import type { ComplaintCategory } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

function normalizeComplaintCategory(
  raw: Record<string, unknown>
): ComplaintCategory {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    is_active: raw.is_active !== false,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

/** 下拉選單：僅啟用中的客訴類別名稱 */
export async function getActiveComplaintCategoryNames(): Promise<string[]> {
  const { data, error } = await (await supabase())
    .from("complaint_categories")
    .select("name")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => String(row.name));
}

/** 案件列表篩選：啟用類別 + 停用類別 + 目前選取（含孤兒名稱） */
export async function getComplaintCategoryNamesForCaseFilter(
  selectedCategory?: string
): Promise<string[]> {
  const { data, error } = await (await supabase())
    .from("complaint_categories")
    .select("name, is_active")
    .order("name");

  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    id: String(row.name),
    name: String(row.name),
    is_active: row.is_active !== false,
  }));
  return mergeTaxonomyFilterNames(items, selectedCategory);
}

/** 客訴類別管理：全部類別 */
export async function getComplaintCategoriesForManagement(): Promise<
  ComplaintCategory[]
> {
  const { data, error } = await (await supabase())
    .from("complaint_categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(
    normalizeComplaintCategory
  );
}

export async function getComplaintCategoryById(
  id: string
): Promise<ComplaintCategory | null> {
  const { data, error } = await (await supabase())
    .from("complaint_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeComplaintCategory(data as Record<string, unknown>);
}

export async function getComplaintCategoryUsageCount(
  categoryName: string
): Promise<number> {
  const { count, error } = await (await supabase())
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("complaint_type", categoryName);

  if (error) throw error;
  return count ?? 0;
}

export async function createComplaintCategory(
  name: string
): Promise<ComplaintCategory> {
  const trimmed = name.trim();
  const { data, error } = await (await supabase())
    .from("complaint_categories")
    .insert({ name: trimmed, is_active: true })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("客訴類別名稱已存在");
    }
    throw error;
  }

  return normalizeComplaintCategory(data as Record<string, unknown>);
}

export async function setComplaintCategoryActive(
  id: string,
  isActive: boolean
): Promise<ComplaintCategory> {
  const { data, error } = await (await supabase())
    .from("complaint_categories")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeComplaintCategory(data as Record<string, unknown>);
}

export async function renameComplaintCategory(
  id: string,
  newName: string
): Promise<ComplaintCategory> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("客訴類別名稱不可為空");
  }

  const client = await supabase();
  const existing = await getComplaintCategoryById(id);
  if (!existing) {
    throw new Error("找不到客訴類別");
  }

  const oldName = existing.name;
  if (oldName === trimmed) {
    return existing;
  }

  const { data: duplicate } = await client
    .from("complaint_categories")
    .select("id")
    .eq("name", trimmed)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    throw new Error("客訴類別名稱已存在");
  }

  const { error: casesError } = await client
    .from("cases")
    .update({ complaint_type: trimmed })
    .eq("complaint_type", oldName);

  if (casesError) {
    throw new Error(`更新案件客訴類別失敗：${casesError.message}`);
  }

  const { data, error: categoryError } = await client
    .from("complaint_categories")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .single();

  if (categoryError) {
    await client
      .from("cases")
      .update({ complaint_type: oldName })
      .eq("complaint_type", trimmed);
    if (categoryError.code === "23505") {
      throw new Error("客訴類別名稱已存在");
    }
    throw new Error(`更新客訴類別失敗：${categoryError.message}`);
  }

  return normalizeComplaintCategory(data as Record<string, unknown>);
}

export async function deleteComplaintCategory(id: string): Promise<void> {
  const existing = await getComplaintCategoryById(id);
  if (!existing) {
    throw new Error("找不到客訴類別");
  }

  const cases = await getComplaintCategoryUsageCount(existing.name);
  if (cases > 0) {
    throw new Error(
      `無法刪除客訴類別，目前仍有 ${cases} 筆案件使用此類別。`
    );
  }

  const issueCount = await countIssuesByCategoryId(id);
  if (issueCount > 0) {
    throw new Error("無法刪除客訴類別，請先刪除底下的客訴問題。");
  }

  const { error } = await (await supabase())
    .from("complaint_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
