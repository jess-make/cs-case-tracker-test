"use client";

import { useMemo, useState, useTransition } from "react";
import type { Case, CaseAttachment } from "@/types";
import {
  CUSTOMER_GENDERS,
  URGENCY_LABELS,
} from "@/lib/constants";
import type { UrgencyLevel } from "@/types";
import { updateCaseAction } from "@/app/actions/cases";
import { SourceChannelFields } from "@/components/cases/SourceChannelFields";
import { CategoryIssueFields } from "@/components/cases/CategoryIssueFields";
import { DepartmentSelect } from "@/components/cases/DepartmentSelect";
import { buildDepartmentOptions } from "@/lib/case-department";
import {
  CaseAttachmentEditFields,
  appendEditPendingAttachments,
} from "@/components/cases/CaseAttachmentEditFields";
import { Loader2 } from "lucide-react";
import type { PendingAttachment } from "@/lib/attachment-preview";
import type {
  CategoryIssueTaxonomy,
  SourceChannelTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";

interface CaseEditFormProps {
  caseData: Case;
  attachments?: CaseAttachment[];
  canDeleteAttachment?: boolean;
  activeDepartments: string[];
  categoryIssueTaxonomy: CategoryIssueTaxonomy;
  sourceChannelTaxonomy: SourceChannelTaxonomy;
  onCancel: () => void;
  onSaved: () => void;
}

export function CaseEditForm({
  caseData,
  attachments = [],
  canDeleteAttachment = true,
  activeDepartments,
  categoryIssueTaxonomy,
  sourceChannelTaxonomy,
  onCancel,
  onSaved,
}: CaseEditFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [complaintCategory, setComplaintCategory] = useState(caseData.complaint_type);
  const [complaintSubtype, setComplaintSubtype] = useState(
    caseData.complaint_subtype ?? ""
  );
  const [source, setSource] = useState(caseData.source);
  const [sourceDetail, setSourceDetail] = useState(caseData.source_detail ?? "");
  const [department, setDepartment] = useState(caseData.department ?? "");
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
    setError(null);
    const formData = new FormData(e.currentTarget);
    appendEditPendingAttachments(formData, pendingAttachments);
    startTransition(async () => {
      const result = await updateCaseAction(caseData.id, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  const departmentOptions = buildDepartmentOptions(
    activeDepartments,
    caseData.department
  );

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-5"
    >
      {error && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>客戶姓名 *</label>
          <input
            name="customer_name"
            required
            className={inputClass}
            defaultValue={caseData.customer_name}
          />
        </div>
        <div>
          <label className={labelClass}>客戶性別 *</label>
          <select
            name="customer_gender"
            required
            className={inputClass}
            defaultValue={caseData.customer_gender ?? ""}
          >
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
            defaultValue={caseData.customer_contact}
          />
        </div>
        <div>
          <label className={labelClass}>電商訂單編號</label>
          <input
            name="ecommerce_order_no"
            className={inputClass}
            defaultValue={caseData.ecommerce_order_no ?? ""}
            placeholder="選填"
          />
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
          legacySource={caseData.source}
          legacyChannel={caseData.source_detail ?? undefined}
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
          legacyCategory={caseData.complaint_type}
          legacyIssue={caseData.complaint_subtype ?? undefined}
        />
        <div>
          <label className={labelClass}>緊急程度 *</label>
          <select
            name="urgency"
            required
            className={inputClass}
            defaultValue={caseData.urgency}
          >
            {(Object.keys(URGENCY_LABELS) as UrgencyLevel[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <DepartmentSelect
          id="edit-department"
          value={department}
          onChange={setDepartment}
          inputClass={inputClass}
          labelClass={labelClass}
          departments={departmentOptions}
        />
      </div>

      <div>
        <label className={labelClass}>問題描述 *</label>
        <textarea
          name="description"
          required
          rows={5}
          className={inputClass}
          defaultValue={caseData.description}
        />
      </div>

      <CaseAttachmentEditFields
        attachments={attachments}
        labelClass={labelClass}
        pendingFiles={pendingAttachments}
        onPendingFilesChange={setPendingAttachments}
        allowDelete={canDeleteAttachment}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          儲存
        </button>
      </div>
    </form>
  );
}
