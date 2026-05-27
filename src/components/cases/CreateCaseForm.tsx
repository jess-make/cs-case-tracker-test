"use client";

import { useState } from "react";
import Link from "next/link";
import {
  COMPLAINT_SOURCES,
  COMPLAINT_TYPES,
  CUSTOMER_GENDERS,
  DEPARTMENTS,
  URGENCY_LABELS,
} from "@/lib/constants";
import type { UrgencyLevel } from "@/types";
import { createCaseAction } from "@/app/actions/cases";
import { Loader2 } from "lucide-react";

export function CreateCaseForm() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createCaseAction(formData);
    } catch {
      setPending(false);
    }
  }

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";
  const btnSecondary =
    "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto";
  const btnPrimary =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div>
          <label className={labelClass}>客戶姓名 *</label>
          <input name="customer_name" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>客戶性別 *</label>
          <select name="customer_gender" required className={inputClass} defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {CUSTOMER_GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>客戶聯繫方式 *</label>
          <input
            name="customer_contact"
            required
            className={inputClass}
            placeholder="電話 / Email / LINE ID"
          />
        </div>
        <div>
          <label className={labelClass}>客訴來源 *</label>
          <select name="source" required className={inputClass} defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {COMPLAINT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>客訴類型 *</label>
          <select name="complaint_type" required className={inputClass} defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {COMPLAINT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>緊急程度 *</label>
          <select name="urgency" required className={inputClass} defaultValue="medium">
            {(Object.keys(URGENCY_LABELS) as UrgencyLevel[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>指派部門 *</label>
          <select name="department" required className={inputClass} defaultValue="">
            <option value="" disabled>
              請選擇
            </option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>問題描述 *</label>
        <textarea
          name="description"
          required
          rows={5}
          className={inputClass}
          placeholder="請詳細描述客訴內容..."
        />
      </div>

      <div>
        <label className={labelClass}>附件上傳</label>
        <input
          type="file"
          name="attachments"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="block w-full min-h-11 text-sm text-slate-600 file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
        <p className="mt-1 text-xs text-slate-500">支援圖片、PDF、Word，可多選（選填）</p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end sm:pt-6">
        <Link href="/cases" className={btnSecondary}>
          取消
        </Link>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          建立案件
        </button>
      </div>
    </form>
  );
}
