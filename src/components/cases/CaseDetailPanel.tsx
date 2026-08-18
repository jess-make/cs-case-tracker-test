"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Case, CaseLog, CaseAttachment } from "@/types";
import { StatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { getCaseLogDisplayContent } from "@/lib/case-log-display";
import {
  getNextStatus,
  normalizeCaseStatus,
} from "@/lib/case-status";
import {
  getCaseFlowDisplaySteps,
  getCaseStatusDisplayLabel,
} from "@/lib/case-status-display";
import { getAssigneeDisplayName } from "@/lib/case-display";
import {
  advanceCaseStatusAction,
  revertCaseStatusAction,
  closeCaseAction,
  addReplyAction,
  approveCompensationAction,
} from "@/app/actions/cases";
import { Loader2, User, Building2, Pencil } from "lucide-react";
import { CaseEditForm } from "@/components/cases/CaseEditForm";
import { CaseAttachmentsSection } from "@/components/cases/CaseAttachmentsSection";
import { LocalAttachmentPicker } from "@/components/cases/LocalAttachmentPicker";
import type { CasePermissions } from "@/lib/auth/permissions";
import type {
  CategoryIssueTaxonomy,
  SourceChannelTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";
import {
  QUALITY_INSPECTION_REPLY_OPTIONS,
  isQualityInspectionReplyStep,
} from "@/lib/quality-inspection-reply";
import {
  type PendingAttachment,
  appendAttachmentsToFormData,
  revokeAllPendingAttachments,
  ATTACHMENT_HINT,
} from "@/lib/attachment-preview";
import {
  getCaseWorkflowRevertTarget,
} from "@/lib/case-workflow-revert";
import {
  COMPENSATION_APPROVAL_STATUS_LABELS,
  formatCompensationStatus,
} from "@/lib/compensation-approval";

const REPLY_REQUIRED_MESSAGE = "請輸入處理說明後再送出。";
const QUALITY_RESULT_REQUIRED_MESSAGE = "請選擇品檢結果後再送出。";
const COMPENSATION_DECISION_REQUIRED_MESSAGE = "請選擇核准或不同意。";
const COMPENSATION_NOTE_REQUIRED_MESSAGE = "請填寫審核說明。";

export function CaseDetailPanel({
  caseData,
  logs = [],
  attachments = [],
  permissions,
  activeDepartments,
  categoryIssueTaxonomy,
  sourceChannelTaxonomy,
  assignmentPlan,
}: {
  caseData: Case;
  logs?: CaseLog[] | null;
  attachments?: CaseAttachment[];
  permissions: CasePermissions;
  activeDepartments: string[];
  categoryIssueTaxonomy: CategoryIssueTaxonomy;
  sourceChannelTaxonomy: SourceChannelTaxonomy;
  assignmentPlan?: string[];
}) {
  const [reply, setReply] = useState("");
  const [qualityInspectionResult, setQualityInspectionResult] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [compensationDecision, setCompensationDecision] = useState("");
  const [compensationReviewNote, setCompensationReviewNote] = useState("");
  const [compensationError, setCompensationError] = useState<string | null>(null);
  const [replyAttachments, setReplyAttachments] = useState<PendingAttachment[]>([]);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const safeLogs = logs ?? [];
  const displayStatus = normalizeCaseStatus(caseData.status);
  const nextStatus = getNextStatus(displayStatus);
  const statusDisplayLabel = getCaseStatusDisplayLabel(caseData, assignmentPlan);
  const flowDisplaySteps = getCaseFlowDisplaySteps(caseData, assignmentPlan);
  const revertTarget = getCaseWorkflowRevertTarget(caseData, assignmentPlan);
  const revertTargetLabel = revertTarget
    ? getCaseStatusDisplayLabel(
        {
          status: revertTarget.status,
          department: revertTarget.department,
        },
        assignmentPlan
      )
    : null;
  const nextStatusLabel = nextStatus
    ? getCaseStatusDisplayLabel(
        {
          status: nextStatus,
          department: caseData.department,
        },
        assignmentPlan
      )
    : null;
  const closeStatusLabel = getCaseStatusDisplayLabel(
    {
      status: "closed",
      department: caseData.department,
    },
    assignmentPlan
  );
  const showQualityInspectionReply = isQualityInspectionReplyStep(caseData);
  const hasCompensationApproval = Boolean(caseData.compensation_type);
  const canReviewCompensation =
    permissions.canApproveCompensation &&
    caseData.compensation_status === "pending";

  function handleAdvance() {
    startTransition(async () => {
      await advanceCaseStatusAction(caseData.id);
      router.refresh();
    });
  }

  function handleRevert() {
    if (!revertTargetLabel) return;
    if (!confirm(`確定要回推至「${revertTargetLabel}」嗎？`)) {
      return;
    }

    startTransition(async () => {
      await revertCaseStatusAction(caseData.id);
      router.refresh();
    });
  }

  function handleClose() {
    if (!confirm("確定要結案嗎？")) return;
    startTransition(async () => {
      await closeCaseAction(caseData.id);
      router.refresh();
    });
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (showQualityInspectionReply && !qualityInspectionResult) {
      setReplyError(QUALITY_RESULT_REQUIRED_MESSAGE);
      return;
    }

    if (!showQualityInspectionReply && !reply.trim()) {
      setReplyError(REPLY_REQUIRED_MESSAGE);
      return;
    }

    setReplyError(null);
    const formData = new FormData();
    formData.set("content", reply);
    if (showQualityInspectionReply) {
      formData.set("quality_inspection_result", qualityInspectionResult);
    }
    appendAttachmentsToFormData(
      formData,
      replyAttachments.map((item) => item.file)
    );

    startTransition(async () => {
      const result = await addReplyAction(caseData.id, formData);
      if (result?.error) {
        setReplyError(result.error);
        return;
      }
      setReply("");
      setQualityInspectionResult("");
      revokeAllPendingAttachments(replyAttachments);
      setReplyAttachments([]);
      router.refresh();
    });
  }

  function handleCompensationReview(e: React.FormEvent) {
    e.preventDefault();
    if (!compensationDecision) {
      setCompensationError(COMPENSATION_DECISION_REQUIRED_MESSAGE);
      return;
    }
    if (!compensationReviewNote.trim()) {
      setCompensationError(COMPENSATION_NOTE_REQUIRED_MESSAGE);
      return;
    }

    setCompensationError(null);
    const formData = new FormData();
    formData.set("decision", compensationDecision);
    formData.set("review_note", compensationReviewNote);

    startTransition(async () => {
      const result = await approveCompensationAction(caseData.id, formData);
      if (result?.error) {
        setCompensationError(result.error);
        return;
      }
      setCompensationDecision("");
      setCompensationReviewNote("");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="min-w-0 space-y-4 lg:col-span-2 lg:space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-all text-lg font-bold text-slate-900">{caseData.case_number}</h2>
              <p className="text-sm text-slate-500">建立於 {formatDate(caseData.created_at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={displayStatus} label={statusDisplayLabel} />
              <UrgencyBadge urgency={caseData.urgency} />
              {!editing && permissions.canEditCase && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  編輯案件
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <CaseEditForm
              caseData={caseData}
              attachments={attachments}
              canDeleteAttachment={permissions.canDeleteAttachment}
              activeDepartments={activeDepartments}
              categoryIssueTaxonomy={categoryIssueTaxonomy}
              sourceChannelTaxonomy={sourceChannelTaxonomy}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                router.refresh();
              }}
            />
          ) : (
            <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={User} label="客戶姓名" value={caseData.customer_name} />
            <InfoRow
              icon={User}
              label="客戶性別"
              value={caseData.customer_gender ?? "—"}
            />
            <InfoRow icon={User} label="客戶聯繫方式" value={caseData.customer_contact} />
            <InfoRow
              icon={User}
              label="電商訂單編號"
              value={caseData.ecommerce_order_no?.trim() || "—"}
            />
            <InfoRow
              icon={Building2}
              label="批號"
              value={caseData.batch_no?.trim() || "—"}
            />
            <InfoRow
              icon={Building2}
              label="寄件編號"
              value={caseData.shipping_tracking_no?.trim() || "—"}
            />
            <InfoRow icon={Building2} label="案件來源" value={caseData.source} />
            <InfoRow
              icon={Building2}
              label="服務管道"
              value={caseData.source_detail?.trim() || "—"}
            />
            <InfoRow icon={Building2} label="案件類別" value={caseData.complaint_type} />
            <InfoRow
              icon={Building2}
              label="子分類"
              value={caseData.complaint_subtype ?? "—"}
            />
            <InfoRow icon={Building2} label="指派部門" value={caseData.department?.trim() || "—"} />
            <InfoRow icon={User} label="處理人" value={getAssigneeDisplayName(caseData)} />
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-1 text-sm font-medium text-slate-700">問題描述</p>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{caseData.description}</p>
          </div>
            </>
          )}

          {!editing && caseData.resolution && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-4">
              <p className="mb-1 text-sm font-medium text-emerald-800">改善結果</p>
              <p className="text-sm text-emerald-700">{caseData.resolution}</p>
            </div>
          )}

          {!editing && (
            <CaseAttachmentsSection attachments={attachments} />
          )}
        </section>

        {hasCompensationApproval && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-slate-900">
              補償簽核
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CompensationInfo label="補償方式" value={caseData.compensation_type ?? "—"} />
              <CompensationInfo
                label="簽核狀態"
                value={formatCompensationStatus(caseData.compensation_status)}
              />
              <CompensationInfo
                label="申請人"
                value={caseData.compensation_requested_by?.name ?? "—"}
              />
              <CompensationInfo
                label="申請時間"
                value={
                  caseData.compensation_requested_at
                    ? formatDate(caseData.compensation_requested_at)
                    : "—"
                }
              />
              <CompensationInfo
                label="審核人"
                value={caseData.compensation_reviewed_by?.name ?? "—"}
              />
              <CompensationInfo
                label="審核時間"
                value={
                  caseData.compensation_reviewed_at
                    ? formatDate(caseData.compensation_reviewed_at)
                    : "—"
                }
              />
            </div>
            {caseData.compensation_review_note && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-1 text-sm font-medium text-slate-700">
                  審核說明
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">
                  {caseData.compensation_review_note}
                </p>
              </div>
            )}

            {canReviewCompensation && (
              <form
                onSubmit={handleCompensationReview}
                className="mt-4 border-t border-slate-100 pt-4"
              >
                {compensationError && (
                  <p
                    className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {compensationError}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(180px,220px)_1fr]">
                  <div>
                    <label
                      htmlFor={`compensation-decision-${caseData.id}`}
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      審核結果 *
                    </label>
                    <select
                      id={`compensation-decision-${caseData.id}`}
                      value={compensationDecision}
                      onChange={(e) => {
                        setCompensationDecision(e.target.value);
                        if (compensationError) setCompensationError(null);
                      }}
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">請選擇</option>
                      <option value="approved">
                        {COMPENSATION_APPROVAL_STATUS_LABELS.approved}
                      </option>
                      <option value="rejected">
                        {COMPENSATION_APPROVAL_STATUS_LABELS.rejected}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`compensation-note-${caseData.id}`}
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      審核說明 *
                    </label>
                    <textarea
                      id={`compensation-note-${caseData.id}`}
                      value={compensationReviewNote}
                      onChange={(e) => {
                        setCompensationReviewNote(e.target.value);
                        if (compensationError) setCompensationError(null);
                      }}
                      required
                      rows={3}
                      className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  送出審核
                </button>
              </form>
            )}
          </section>
        )}

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">案件回覆</h3>
          {permissions.canReplyCase && displayStatus !== "closed" && (
            <form onSubmit={handleReply} className="mb-6">
              {replyError && (
                <p
                  className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {replyError}
                </p>
              )}
              {showQualityInspectionReply ? (
                <div className="border-l-4 border-[#ECB6B] py-3 pl-4 pr-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(180px,240px)_1fr]">
                    <div>
                      <label
                        htmlFor={`quality-inspection-result-${caseData.id}`}
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        品檢結果 *
                      </label>
                      <select
                        id={`quality-inspection-result-${caseData.id}`}
                        name="quality_inspection_result"
                        value={qualityInspectionResult}
                        onChange={(e) => {
                          setQualityInspectionResult(e.target.value);
                          if (replyError) setReplyError(null);
                        }}
                        required
                        className="h-11 w-full rounded-lg border border-[#ECB6B] bg-white px-3 text-sm text-slate-800 focus:border-[#ECB6B] focus:outline-none focus:ring-2 focus:ring-[#ECB6B]/30"
                      >
                        <option value="">請選擇</option>
                        {QUALITY_INSPECTION_REPLY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`reply-content-${caseData.id}`}
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        簡述
                      </label>
                      <textarea
                        id={`reply-content-${caseData.id}`}
                        name="content"
                        value={reply}
                        onChange={(e) => {
                          setReply(e.target.value);
                          if (replyError) setReplyError(null);
                        }}
                        rows={3}
                        className="w-full min-h-11 rounded-lg border border-[#ECB6B] bg-white px-3 py-2.5 text-sm focus:border-[#ECB6B] focus:outline-none focus:ring-2 focus:ring-[#ECB6B]/30"
                        placeholder="請補充檢查結果、原因或處理方式"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <label
                    htmlFor={`reply-content-${caseData.id}`}
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    處理回覆 *
                  </label>
                  <textarea
                    id={`reply-content-${caseData.id}`}
                    name="content"
                    value={reply}
                    onChange={(e) => {
                      setReply(e.target.value);
                      if (replyError) setReplyError(null);
                    }}
                    rows={3}
                    required
                    className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="請輸入處理回覆內容"
                  />
                </>
              )}
              {permissions.canManageAttachments && (
                <div className="mt-3">
                  <LocalAttachmentPicker
                    label="附件"
                    labelClass="mb-1 block text-sm font-medium text-slate-700"
                    hint={ATTACHMENT_HINT}
                    files={replyAttachments}
                    onFilesChange={setReplyAttachments}
                    inputId={`reply-attachments-${caseData.id}`}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={pending}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                送出回覆
              </button>
            </form>
          )}

          <h4 className="mb-3 text-sm font-medium text-slate-700">處理紀錄</h4>
          <div className="max-w-full space-y-3 overflow-hidden">
            {safeLogs.length === 0 ? (
              <p className="text-sm text-slate-500">尚無處理紀錄</p>
            ) : (
              safeLogs.map((log, index) => {
                const displayContent = getCaseLogDisplayContent(log);
                return (
                <div
                  key={log.id || `log-${index}`}
                  className="min-w-0 border-l-2 border-brand-200 pl-3 sm:pl-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                      <span className="text-sm font-medium text-slate-800">{log.action}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    {displayContent && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                        {displayContent}
                      </p>
                    )}
                    {log.user && (
                      <p className="mt-0.5 text-xs text-slate-400">{log.user.name}</p>
                    )}
                  </div>
                </div>
              );
              })
            )}
          </div>
        </section>
      </div>

      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">案件流程</h3>

          <div className="mb-4 space-y-2">
            {flowDisplaySteps.map((step) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 text-sm ${
                  step.active
                    ? "font-semibold text-brand-600"
                    : "text-slate-400"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    step.active
                      ? "bg-brand-600"
                      : "bg-slate-200"
                  }`}
                />
                {step.label}
              </div>
            ))}
          </div>

          {(permissions.canAdvanceWorkflow || permissions.canRevertWorkflow) && (
            <div className="space-y-2">
              {permissions.canRevertWorkflow && revertTargetLabel && (
                <button
                  onClick={handleRevert}
                  disabled={pending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <span>回推至</span>
                  <span aria-hidden="true" className="text-slate-400">
                    →
                  </span>
                  <span className="break-words">{revertTargetLabel}</span>
                </button>
              )}
              {permissions.canAdvanceWorkflow && displayStatus !== "closed" && nextStatusLabel && (
                <button
                  onClick={handleAdvance}
                  disabled={pending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  <span>推進至</span>
                  <span aria-hidden="true" className="text-white/70">
                    →
                  </span>
                  <span className="break-words">{nextStatusLabel}</span>
                </button>
              )}
              {permissions.canAdvanceWorkflow && (displayStatus === "cs_confirming" || displayStatus === "replied") && (
                <button
                  onClick={handleClose}
                  disabled={pending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <span>推進至</span>
                  <span aria-hidden="true" className="text-white/70">
                    →
                  </span>
                  <span className="break-words">{closeStatusLabel}</span>
                </button>
              )}
            </div>
          )}

          {displayStatus === "closed" && (
            <p className="text-center text-sm text-emerald-600">
              已於 {formatDate(caseData.closed_at)} 結案
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function CompensationInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
