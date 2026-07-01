"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/types";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_FILTER_OPTIONS,
  URGENCY_LABELS,
} from "@/lib/constants";
import type { UrgencyLevel } from "@/types";
import { DateRangeFilter } from "@/components/cases/DateRangeFilter";
import { CaseSearchInput } from "@/components/cases/CaseSearchInput";
import { DEPARTMENT_FILTER_UNASSIGNED } from "@/lib/case-department";
import {
  CASE_LIST_DEFAULT_PATH,
  hasActiveCaseListFilters,
} from "@/lib/case-list-filters";
import {
  mergeTaxonomyFilterNames,
  type TaxonomyItem,
} from "@/lib/complaint-taxonomy";
import { cn } from "@/lib/utils";

interface CaseFiltersProps {
  handlers: User[];
  departmentOptions: string[];
  sourceItems: TaxonomyItem[];
  channelsBySourceName: Record<string, TaxonomyItem[]>;
  categoryItems: TaxonomyItem[];
  issuesByCategoryName: Record<string, TaxonomyItem[]>;
}

function flattenChildItems(
  childrenByParentName: Record<string, TaxonomyItem[]>
): TaxonomyItem[] {
  return Object.values(childrenByParentName).flat();
}

function hasChildName(items: TaxonomyItem[], name: string): boolean {
  const trimmed = name.trim();
  return Boolean(trimmed) && items.some((item) => item.name.trim() === trimmed);
}

function buildChildFilterOptions(
  parentName: string,
  childrenByParentName: Record<string, TaxonomyItem[]>,
  selectedChildName: string
): string[] {
  const children = parentName
    ? childrenByParentName[parentName] ?? []
    : flattenChildItems(childrenByParentName);
  const selected =
    !parentName || hasChildName(children, selectedChildName)
      ? selectedChildName
      : undefined;

  return mergeTaxonomyFilterNames(children, selected);
}

export function CaseFilters({
  handlers,
  departmentOptions,
  sourceItems,
  channelsBySourceName,
  categoryItems,
  issuesByCategoryName,
}: CaseFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const hasFilters = hasActiveCaseListFilters(params);
  const selectedSource = params.get("source") ?? "";
  const selectedChannel = params.get("source_detail") ?? "";
  const selectedCategory = params.get("complaint_type") ?? "";
  const selectedIssue = params.get("complaint_subtype") ?? "";

  const sourceOptions = mergeTaxonomyFilterNames(sourceItems, selectedSource);
  const channelOptions = buildChildFilterOptions(
    selectedSource,
    channelsBySourceName,
    selectedChannel
  );
  const complaintCategoryOptions = mergeTaxonomyFilterNames(
    categoryItems,
    selectedCategory
  );
  const complaintIssueOptions = buildChildFilterOptions(
    selectedCategory,
    issuesByCategoryName,
    selectedIssue
  );

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());

    if (value) next.set(key, value);
    else next.delete(key);

    if (key === "source") {
      next.delete("source_detail");
    }
    if (key === "complaint_type") {
      next.delete("complaint_subtype");
    }

    router.push(`/cases?${next.toString()}`);
  }

  function clearFilters() {
    router.push(CASE_LIST_DEFAULT_PATH);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <DateRangeFilter />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap">
        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">狀態</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={params.get("status") ?? ""}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">全部</option>
            {CASE_STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">處理人</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={params.get("assignee_id") ?? ""}
            onChange={(e) => update("assignee_id", e.target.value)}
          >
            <option value="">全部</option>
            {handlers.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            指派部門
          </label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={params.get("department") ?? ""}
            onChange={(e) => update("department", e.target.value)}
          >
            <option value="">全部</option>
            <option value={DEPARTMENT_FILTER_UNASSIGNED}>暫未指派</option>
            {departmentOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">緊急程度</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={params.get("urgency") ?? ""}
            onChange={(e) => update("urgency", e.target.value)}
          >
            <option value="">全部</option>
            {(Object.keys(URGENCY_LABELS) as UrgencyLevel[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">客訴來源</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={selectedSource}
            onChange={(e) => update("source", e.target.value)}
          >
            <option value="">全部</option>
            {sourceOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">客訴管道</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={selectedChannel}
            onChange={(e) => update("source_detail", e.target.value)}
          >
            <option value="">全部</option>
            {channelOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">客訴類別</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={selectedCategory}
            onChange={(e) => update("complaint_type", e.target.value)}
          >
            <option value="">全部</option>
            {complaintCategoryOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-500">客訴問題</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={selectedIssue}
            onChange={(e) => update("complaint_subtype", e.target.value)}
          >
            <option value="">全部</option>
            {complaintIssueOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:max-w-xs sm:col-span-2 lg:col-span-1">
          <CaseSearchInput />
        </div>

        <div className="flex min-w-0 items-end sm:col-span-2 lg:ml-auto">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className={cn(
              "inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors sm:w-auto",
              hasFilters
                ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-200 text-slate-400"
            )}
          >
            清除篩選
          </button>
        </div>
      </div>
    </div>
  );
}
