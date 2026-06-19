"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CUSTOMER_GENDERS,
  URGENCY_LABELS,
} from "@/lib/constants";
import type { UrgencyLevel } from "@/types";
import { createCaseAction } from "@/app/actions/cases";
import { SourceChannelFields } from "@/components/cases/SourceChannelFields";
import { CategoryIssueFields } from "@/components/cases/CategoryIssueFields";
import { DepartmentSelect } from "@/components/cases/DepartmentSelect";
import { LocalAttachmentPicker } from "@/components/cases/LocalAttachmentPicker";
import { Loader2 } from "lucide-react";
import {
  type PendingAttachment,
  appendAttachmentsToFormData,
  ATTACHMENT_HINT,
} from "@/lib/attachment-preview";
import type {
  CategoryIssueTaxonomy,
  SourceChannelTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";

export function CreateCaseForm({
  activeDepartments,
  categoryIssueTaxonomy,
  sourceChannelTaxonomy,
}: {
  activeDepartments: string[];
  categoryIssueTaxonomy: CategoryIssueTaxonomy;
  sourceChannelTaxonomy: SourceChannelTaxonomy;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaintCategory, setComplaintCategory] = useState("");
  const [complaintSubtype, setComplaintSubtype] = useState("");
  const [source, setSource] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [department, setDepartment] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const categoryItems = useMemo(
    () =>
      categoryIssueTaxonomy.categories.map((c) => ({
        id: c.id,
        name: c.name,
        is_active: c.is_active,
      })),
    [categoryIssueTaxonomy.categories]
  );
  const sourceItems = useMemo(
    () =>
      sourceChannelTaxonomy.sources.map((s) => ({
        id: s.id,
        name: s.name,
        is_active: s.is_active,
      })),
    [sourceChannelTaxonomy.sources]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    appendAttachmentsToFormData(
      formData,
      pendingAttachments.map((item) => item.file)
    );
    try {
      const result = await createCaseAction(formData);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setError("建立案件失敗，請稍後再試");
      setPending(false);
    }
  }

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";
  const btnSecondary =
    "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto";
  const btnPrimary =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto";

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-5 sm:space-y-6"
    >
      {error && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
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
          <label className={labelClass}>緊急程度 *</label>
          <select name="urgency" required className={inputClass} defaultValue="medium">
            {(Object.keys(URGENCY_LABELS) as UrgencyLevel[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <SourceChannelFields
          source={source}
          sourceDetail={sourceDetail}
          onSourceChange={setSource}
          onDetailChange={setSourceDetail}
          inputClass={inputClass}
          labelClass={labelClass}
          sourceItems={sourceItems}
          channelsBySourceName={sourceChannelTaxonomy.channelsBySourceName}
        />
        <CategoryIssueFields
          category={complaintCategory}
          issue={complaintSubtype}
          onCategoryChange={setComplaintCategory}
          onIssueChange={setComplaintSubtype}
          inputClass={inputClass}
          labelClass={labelClass}
          categoryItems={categoryItems}
          issuesByCategoryName={categoryIssueTaxonomy.issuesByCategoryName}
        />
        <DepartmentSelect
          id="create-department"
          value={department}
          onChange={setDepartment}
          inputClass={inputClass}
          labelClass={labelClass}
          departments={activeDepartments}
        />
        <div>
          <label className={labelClass}>電商訂單編號</label>
          <input
            name="ecommerce_order_no"
            className={inputClass}
            placeholder="選填"
          />
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

      <LocalAttachmentPicker
        labelClass={labelClass}
        files={pendingAttachments}
        onFilesChange={setPendingAttachments}
        inputId="create-attachments"
        hint={ATTACHMENT_HINT}
      />

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
