"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  DATE_PRESET_LABELS,
  DATE_PRESETS,
  DEFAULT_DATE_PRESET,
  formatSlashDate,
  getDefaultDateParams,
  getPresetRange,
  isValidSlashDate,
  parseSlashDate,
  type DatePreset,
} from "@/lib/date-range";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500";

interface DateRangeFilterProps {
  basePath?: string;
  bordered?: boolean;
  className?: string;
}

function slashToDateInputValue(value: string): string {
  const date = parseSlashDate(value);
  if (!date) return "";

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputValueToSlash(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[1]}/${match[2]}/${match[3]}`;
}

export function DateRangeFilter({
  basePath = "/cases",
  bordered = true,
  className,
}: DateRangeFilterProps) {
  const router = useRouter();
  const params = useSearchParams();

  const preset = (params.get("date_preset") as DatePreset) ?? DEFAULT_DATE_PRESET;
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const isCustom = preset === "custom";

  const [startInput, setStartInput] = useState(dateFrom);
  const [endInput, setEndInput] = useState(dateTo);

  useEffect(() => {
    if (!params.get("date_from") && !params.get("date_to")) {
      const defaults = getDefaultDateParams();
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(defaults)) {
        next.set(key, value);
      }
      router.replace(`${basePath}?${next.toString()}`);
    }
  }, [basePath, params, router]);

  useEffect(() => {
    setStartInput(dateFrom);
    setEndInput(dateTo);
  }, [dateFrom, dateTo]);

  function pushParams(next: URLSearchParams) {
    router.push(`${basePath}?${next.toString()}`);
  }

  function updateDateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    pushParams(next);
  }

  function applyPreset(nextPreset: DatePreset) {
    if (nextPreset === "custom") {
      updateDateParams({
        date_preset: "custom",
        date_from: dateFrom || startInput,
        date_to: dateTo || endInput,
      });
      return;
    }

    const { from, to } = getPresetRange(nextPreset);
    updateDateParams({
      date_preset: nextPreset,
      date_from: formatSlashDate(from),
      date_to: formatSlashDate(to),
    });
  }

  function commitCustomRange(
    nextStartInput = startInput,
    nextEndInput = endInput
  ) {
    if (!isValidSlashDate(nextStartInput) || !isValidSlashDate(nextEndInput)) {
      return;
    }

    const from = parseSlashDate(nextStartInput)!;
    const to = parseSlashDate(nextEndInput)!;
    if (from > to) return;

    updateDateParams({
      date_preset: "custom",
      date_from: nextStartInput.trim(),
      date_to: nextEndInput.trim(),
    });
  }

  function handleStartBlur() {
    if (!isCustom) return;
    commitCustomRange();
  }

  function handleEndBlur() {
    if (!isCustom) return;
    commitCustomRange();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }

  function handleStartPickerChange(value: string) {
    const slashDate = dateInputValueToSlash(value);
    if (!slashDate) return;
    setStartInput(slashDate);
    if (isCustom) commitCustomRange(slashDate, endInput);
  }

  function handleEndPickerChange(value: string) {
    const slashDate = dateInputValueToSlash(value);
    if (!slashDate) return;
    setEndInput(slashDate);
    if (isCustom) commitCustomRange(startInput, slashDate);
  }

  return (
    <div
      className={cn(
        "space-y-3",
        bordered && "border-b border-slate-100 pb-4",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-slate-500">建檔日期</span>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPreset(p)}
              className={cn(
                "min-h-9 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
              )}
            >
              {DATE_PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="shrink-0 text-xs font-medium text-slate-500">期間</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-36">
            <input
              type="text"
              inputMode="numeric"
              placeholder="YYYY/MM/DD"
              className={inputClass}
              value={startInput}
              readOnly={!isCustom}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={handleStartBlur}
              onKeyDown={handleKeyDown}
              aria-label="開始日期"
            />
            <input
              type="date"
              className="absolute inset-y-1 right-1 h-9 w-9 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              value={slashToDateInputValue(startInput)}
              disabled={!isCustom}
              tabIndex={-1}
              onChange={(e) => handleStartPickerChange(e.target.value)}
              aria-label="用月曆選擇開始日期"
            />
            <CalendarDays
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2",
                isCustom ? "text-slate-400" : "text-slate-300"
              )}
            />
          </div>
          <span className="hidden text-slate-400 sm:inline">→</span>
          <span className="text-center text-xs text-slate-400 sm:hidden">↓</span>
          <div className="relative sm:w-36">
            <input
              type="text"
              inputMode="numeric"
              placeholder="YYYY/MM/DD"
              className={inputClass}
              value={endInput}
              readOnly={!isCustom}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={handleEndBlur}
              onKeyDown={handleKeyDown}
              aria-label="結束日期"
            />
            <input
              type="date"
              className="absolute inset-y-1 right-1 h-9 w-9 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              value={slashToDateInputValue(endInput)}
              disabled={!isCustom}
              tabIndex={-1}
              onChange={(e) => handleEndPickerChange(e.target.value)}
              aria-label="用月曆選擇結束日期"
            />
            <CalendarDays
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2",
                isCustom ? "text-slate-400" : "text-slate-300"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
