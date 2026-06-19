"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/types";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_FILTER_OPTIONS,
  COMPLAINT_CATEGORY_KEYS,
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
import { cn } from "@/lib/utils";

export function CaseFilters({
  handlers,
  departmentOptions,
}: {
  handlers: User[];
  departmentOptions: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const hasFilters = hasActiveCaseListFilters(params);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/cases?${next.toString()}`);
  }

  function clearFilters() {
    router.push(CASE_LIST_DEFAULT_PATH);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-end border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
          className={cn(
            "inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            hasFilters
              ? "border-slate-300 text-slate-700 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 text-slate-400"
          )}
        >
          清除篩選
        </button>
      </div>

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

        <div className="min-w-0 sm:max-w-xs sm:col-span-2 lg:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">客訴類別</label>
          <select
            className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={params.get("complaint_type") ?? ""}
            onChange={(e) => update("complaint_type", e.target.value)}
          >
            <option value="">全部</option>
            {COMPLAINT_CATEGORY_KEYS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <CaseSearchInput />
      </div>
    </div>
  );
}
