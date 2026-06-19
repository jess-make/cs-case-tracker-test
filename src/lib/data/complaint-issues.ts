import { mergeTaxonomyFilterNames } from "@/lib/complaint-taxonomy";
import {
  applyChildTaxonomyManagementSort,
  applySortOrderUpdates,
  applyTaxonomySort,
  getNextTaxonomySortOrder,
} from "@/lib/taxonomy-sort-order";
import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import type { ComplaintIssue } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

function normalizeIssue(raw: Record<string, unknown>): ComplaintIssue {
  return {
    id: String(raw.id ?? ""),
    category_id: String(raw.category_id ?? ""),
    name: String(raw.name ?? ""),
    is_active: raw.is_active !== false,
    sort_order: Number(raw.sort_order ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export async function getComplaintIssuesForManagement(): Promise<ComplaintIssue[]> {
  const { data, error } = await applyChildTaxonomyManagementSort(
    (await supabase()).from("complaint_issues").select("*"),
    "category_id"
  );

  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeIssue);
}

export async function getComplaintIssueById(
  id: string
): Promise<ComplaintIssue | null> {
  const { data, error } = await (await supabase())
    .from("complaint_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeIssue(data as Record<string, unknown>);
}

export async function getComplaintIssueUsageCount(
  issueName: string
): Promise<number> {
  const { count, error } = await (await supabase())
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("complaint_subtype", issueName);

  if (error) throw error;
  return count ?? 0;
}

export async function countIssuesByCategoryId(
  categoryId: string
): Promise<number> {
  const { count, error } = await (await supabase())
    .from("complaint_issues")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (error) throw error;
  return count ?? 0;
}

export async function createComplaintIssue(
  categoryId: string,
  name: string
): Promise<ComplaintIssue> {
  const trimmed = name.trim();
  const client = await supabase();
  const sort_order = await getNextTaxonomySortOrder(
    client,
    "complaint_issues",
    { column: "category_id", value: categoryId }
  );
  const { data, error } = await client
    .from("complaint_issues")
    .insert({
      category_id: categoryId,
      name: trimmed,
      is_active: true,
      sort_order,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("此類別下已有相同問題名稱");
    }
    throw error;
  }

  return normalizeIssue(data as Record<string, unknown>);
}

export async function reorderComplaintIssues(
  categoryId: string,
  orderedIds: string[]
): Promise<void> {
  if (!categoryId?.trim()) throw new Error("無效的客訴類別");
  if (!orderedIds.length) return;

  const client = await supabase();
  const { data, error } = await client
    .from("complaint_issues")
    .select("id")
    .eq("category_id", categoryId);

  if (error) throw error;

  const validIds = new Set((data ?? []).map((row) => String(row.id)));
  if (
    orderedIds.length !== validIds.size ||
    !orderedIds.every((id) => validIds.has(id))
  ) {
    throw new Error("排序資料無效");
  }

  await applySortOrderUpdates(client, "complaint_issues", orderedIds);
}

export async function setComplaintIssueActive(
  id: string,
  isActive: boolean
): Promise<ComplaintIssue> {
  const { data, error } = await (await supabase())
    .from("complaint_issues")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeIssue(data as Record<string, unknown>);
}

export async function renameComplaintIssue(
  id: string,
  newName: string
): Promise<ComplaintIssue> {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("客訴問題名稱不可為空");

  const client = await supabase();
  const existing = await getComplaintIssueById(id);
  if (!existing) throw new Error("找不到客訴問題");

  const oldName = existing.name;
  if (oldName === trimmed) return existing;

  const { data: duplicate } = await client
    .from("complaint_issues")
    .select("id")
    .eq("category_id", existing.category_id)
    .eq("name", trimmed)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) throw new Error("此類別下已有相同問題名稱");

  const { error: casesError } = await client
    .from("cases")
    .update({ complaint_subtype: trimmed })
    .eq("complaint_subtype", oldName);

  if (casesError) {
    throw new Error(`更新案件客訴問題失敗：${casesError.message}`);
  }

  const { data, error } = await client
    .from("complaint_issues")
    .update({ name: trimmed })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    await client
      .from("cases")
      .update({ complaint_subtype: oldName })
      .eq("complaint_subtype", trimmed);
    if (error.code === "23505") throw new Error("此類別下已有相同問題名稱");
    throw new Error(`更新客訴問題失敗：${error.message}`);
  }

  return normalizeIssue(data as Record<string, unknown>);
}

export async function deleteComplaintIssue(id: string): Promise<void> {
  const existing = await getComplaintIssueById(id);
  if (!existing) throw new Error("找不到客訴問題");

  const cases = await getComplaintIssueUsageCount(existing.name);
  if (cases > 0) {
    throw new Error(
      `無法刪除客訴問題，目前仍有 ${cases} 筆案件使用此問題。`
    );
  }

  const { error } = await (await supabase())
    .from("complaint_issues")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** 篩選用：全部問題名稱 */
export async function getComplaintIssueNamesForCaseFilter(
  selected?: string
): Promise<string[]> {
  const { data, error } = await applyTaxonomySort(
    (await supabase())
      .from("complaint_issues")
      .select("name, is_active, sort_order")
  );

  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    id: String(row.name),
    name: String(row.name),
    is_active: row.is_active !== false,
  }));
  return mergeTaxonomyFilterNames(items, selected);
}
