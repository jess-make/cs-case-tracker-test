export interface TaxonomyItem {
  id: string;
  name: string;
  is_active: boolean;
}

/** 大分類選項：啟用項目 + 保留目前值 */
export function buildParentNameOptions(
  parents: TaxonomyItem[],
  currentValue?: string | null
): string[] {
  const options = parents.filter((p) => p.is_active).map((p) => p.name);
  const current = currentValue?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  return options;
}

/** 小分類選項：依父層名稱取啟用項目 + 保留目前值 */
export function buildChildNameOptions(
  parentName: string,
  childrenByParentName: Record<string, TaxonomyItem[]>,
  currentValue?: string | null
): string[] {
  const children = childrenByParentName[parentName] ?? [];
  const options = children.filter((c) => c.is_active).map((c) => c.name);
  const current = currentValue?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  return options;
}

/** 篩選選項：啟用 + 停用 + URL 孤兒值（同名只保留一筆，維持順序） */
export function mergeTaxonomyFilterNames(
  items: TaxonomyItem[],
  selected?: string
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    merged.push(trimmed);
  }

  for (const item of items) {
    if (item.is_active) add(item.name);
  }
  for (const item of items) {
    if (!item.is_active) add(item.name);
  }
  const sel = selected?.trim();
  if (sel) add(sel);
  return merged;
}
