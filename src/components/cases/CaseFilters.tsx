"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/types";
import { CASE_STATUS_LABELS, COMPLAINT_TYPES } from "@/lib/constants";
import type { CaseStatus } from "@/types";

export function CaseFilters({ handlers }: { handlers: User[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/cases?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">狀態</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={params.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">全部</option>
          {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
            <option key={s} value={s}>
              {CASE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">處理人</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">客訴類型</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={params.get("complaint_type") ?? ""}
          onChange={(e) => update("complaint_type", e.target.value)}
        >
          <option value="">全部</option>
          {COMPLAINT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
