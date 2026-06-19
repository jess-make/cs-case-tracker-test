import {
  DEFAULT_DATE_PRESET,
  getDefaultDateParams,
  type DatePreset,
} from "@/lib/date-range";

/** 案件列表非日期篩選 query 鍵 */
export const CASE_LIST_FILTER_PARAM_KEYS = [
  "status",
  "assignee_id",
  "department",
  "urgency",
  "source",
  "source_detail",
  "complaint_type",
  "complaint_subtype",
  "q",
] as const;

type SearchParamsLike = {
  get(name: string): string | null;
};

/** 是否偏離預設篩選（本月 + 其餘全部） */
export function hasActiveCaseListFilters(params: SearchParamsLike): boolean {
  for (const key of CASE_LIST_FILTER_PARAM_KEYS) {
    if (params.get(key)?.trim()) return true;
  }

  const defaults = getDefaultDateParams();
  const datePreset = params.get("date_preset");
  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");

  if (!datePreset && !dateFrom && !dateTo) return false;

  if ((datePreset as DatePreset | null) !== DEFAULT_DATE_PRESET) return true;
  if (dateFrom !== defaults.date_from) return true;
  if (dateTo !== defaults.date_to) return true;

  return false;
}

/** 清除後導向路徑（由 DateRangeFilter 自動補上預設本月） */
export const CASE_LIST_DEFAULT_PATH = "/cases";
