"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Case, CaseLog } from "@/types";
import { StatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { getCaseLogDisplayContent } from "@/lib/case-log-display";
import {
  CASE_FLOW_STEPS,
  getCaseStatusLabel,
  getNextStatus,
  isActiveFlowStep,
  normalizeCaseStatus,
} from "@/lib/case-status";
import { getAssigneeDisplayName } from "@/lib/case-display";
import {
  advanceCaseStatusAction,
  closeCaseAction,
  addReplyAction,
} from "@/app/actions/cases";
import { Loader2, User, Building2, Pencil } from "lucide-react";
import { CaseEditForm } from "@/components/cases/CaseEditForm";

export function CaseDetailPanel({
  caseData,
  logs = [],
  canEdit = true,
}: {
  caseData: Case;
  logs?: CaseLog[] | null;
  canEdit?: boolean;
}) {
  const [reply, setReply] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const safeLogs = logs ?? [];
  const attachmentUrls = caseData.attachment_urls ?? [];
  const displayStatus = normalizeCaseStatus(caseData.status);
  const nextStatus = getNextStatus(displayStatus);

  function handleAdvance() {
    startTransition(async () => {
      await advanceCaseStatusAction(caseData.id);
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
    startTransition(async () => {
      await addReplyAction(caseData.id, reply);
      setReply("");
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
              <StatusBadge status={displayStatus} />
              <UrgencyBadge urgency={caseData.urgency} />
              {!editing && canEdit && (
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
            <InfoRow icon={Building2} label="客訴來源" value={caseData.source} />
            <InfoRow
              icon={Building2}
              label="客訴管道"
              value={caseData.source_detail?.trim() || "—"}
            />
            <InfoRow icon={Building2} label="客訴類別" value={caseData.complaint_type} />
            <InfoRow
              icon={Building2}
              label="客訴問題"
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

          {!editing && attachmentUrls.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">附件</p>
              <ul className="space-y-1">
                {attachmentUrls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                      附件 {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">處理回覆</h3>
          {displayStatus !== "closed" && (
            <form onSubmit={handleReply} className="mb-6">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="輸入處理回覆或改善說明..."
              />
              <button
                type="submit"
                disabled={pending || !reply.trim()}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
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
          <h3 className="mb-4 text-base font-semibold text-slate-900">案件操作</h3>

          <div className="mb-4 space-y-2">
            {CASE_FLOW_STEPS.map((s) => (
              <div
                key={s}
                className={`flex items-center gap-2 text-sm ${
                  isActiveFlowStep(caseData.status, s)
                    ? "font-semibold text-brand-600"
                    : "text-slate-400"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActiveFlowStep(caseData.status, s)
                      ? "bg-brand-600"
                      : "bg-slate-200"
                  }`}
                />
                {getCaseStatusLabel(s)}
              </div>
            ))}
          </div>

          {displayStatus !== "closed" && (
            <div className="space-y-2">
              {nextStatus && (
                <button
                  onClick={handleAdvance}
                  disabled={pending}
                  className="min-h-11 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  推進至：{getCaseStatusLabel(nextStatus)}
                </button>
              )}
              {(displayStatus === "cs_confirming" || displayStatus === "replied") && (
                <button
                  onClick={handleClose}
                  disabled={pending}
                  className="min-h-11 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  結案
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
