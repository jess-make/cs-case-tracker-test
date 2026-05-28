"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass =
  "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

export function CaseSearchInput() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = params.get("q") ?? "";
      const trimmed = value.trim();
      if (trimmed === current.trim()) return;

      const next = new URLSearchParams(params.toString());
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      router.push(`/cases?${next.toString()}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [value, params, router]);

  return (
    <div className="min-w-0 sm:col-span-2 lg:min-w-[280px] lg:flex-1">
      <label className="mb-1 block text-xs font-medium text-slate-500">案件查詢</label>
      <input
        type="search"
        className={inputClass}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="輸入 CS 案件編號、客戶姓名、電話或電商訂單編號"
        aria-label="案件查詢"
      />
    </div>
  );
}
