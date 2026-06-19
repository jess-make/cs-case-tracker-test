import type { SupabaseClient } from "@supabase/supabase-js";

export type TaxonomySortTable =
  | "complaint_categories"
  | "complaint_issues"
  | "complaint_sources"
  | "complaint_channels";

type OrderableQuery = {
  order: (
    column: string,
    options?: { ascending?: boolean }
  ) => OrderableQuery;
};

/** Supabase 查詢：sort_order ASC, created_at ASC */
export function applyTaxonomySort<T extends OrderableQuery>(query: T): T {
  return query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true }) as T;
}

/** 子項管理列表：先依父層分組，再依 sort_order */
export function applyChildTaxonomyManagementSort<T extends OrderableQuery>(
  query: T,
  parentColumn: "category_id" | "source_id"
): T {
  return query
    .order(parentColumn, { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true }) as T;
}

export async function getNextTaxonomySortOrder(
  client: SupabaseClient,
  table: TaxonomySortTable,
  scope?: { column: string; value: string }
): Promise<number> {
  let query = client
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (scope) {
    query = query.eq(scope.column, scope.value);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  const current = data?.sort_order;
  return (typeof current === "number" ? current : -1) + 1;
}

export async function applySortOrderUpdates(
  client: SupabaseClient,
  table: TaxonomySortTable,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    client.from(table).update({ sort_order: index }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
