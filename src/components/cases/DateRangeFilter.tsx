"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500 sm:w-36";

export function DateRangeFilter() {
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
      router.replace(`/cases?${next.toString()}`);
    }
  }, [params, router]);

  useEffect(() => {
    setStartInput(dateFrom);
    setEndInput(dateTo);
  }, [dateFrom, dateTo]);

  function pushParams(next: URLSearchParams) {
    router.push(`/cases?${next.toString()}`);
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

  function commitCustomRange() {
    if (!isValidSlashDate(startInput) || !isValidSlashDate(endInput)) return;

    const from = parseSlashDate(startInput)!;
    const to = parseSlashDate(endInput)!;
    if (from > to) return;

    updateDateParams({
      date_preset: "custom",
      date_from: startInput.trim(),
      date_to: endInput.trim(),
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

  return (
    <div className="space-y-3 border-b border-slate-100 pb-4">
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
          <span className="hidden text-slate-400 sm:inline">→</span>
          <span className="text-center text-xs text-slate-400 sm:hidden">↓</span>
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
        </div>
      </div>
    </div>
  );
}
