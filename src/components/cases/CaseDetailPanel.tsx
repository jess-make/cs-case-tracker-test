"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Case, CaseLog } from "@/types";
import { StatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { CASE_STATUS_LABELS, getNextStatus } from "@/lib/constants";
import {
  advanceCaseStatusAction,
  closeCaseAction,
  addReplyAction,
} from "@/app/actions/cases";
import { Loader2, Clock, User, Building2 } from "lucide-react";

export function CaseDetailPanel({
  caseData,
  logs = [],
}: {
  caseData: Case;
  logs?: CaseLog[] | null;
}) {
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const safeLogs = logs ?? [];
  const attachmentUrls = caseData.attachment_urls ?? [];
  const nextStatus = getNextStatus(caseData.status);

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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{caseData.case_number}</h2>
              <p className="text-sm text-slate-500">建立於 {formatDate(caseData.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={caseData.status} />
              <UrgencyBadge urgency={caseData.urgency} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow icon={User} label="客戶姓名" value={caseData.customer_name} />
            <InfoRow icon={User} label="聯絡方式" value={caseData.customer_contact} />
            <InfoRow icon={Building2} label="客訴來源" value={caseData.source} />
            <InfoRow icon={Building2} label="客訴類型" value={caseData.complaint_type} />
            <InfoRow icon={Building2} label="負責部門" value={caseData.department} />
            <InfoRow icon={User} label="處理人" value={caseData.assignee?.name ?? "未指派"} />
            <InfoRow icon={Clock} label="處理期限" value={formatDate(caseData.due_date)} />
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-1 text-sm font-medium text-slate-700">問題描述</p>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{caseData.description}</p>
          </div>

          {caseData.resolution && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-4">
              <p className="mb-1 text-sm font-medium text-emerald-800">改善結果</p>
              <p className="text-sm text-emerald-700">{caseData.resolution}</p>
            </div>
          )}

          {attachmentUrls.length > 0 && (
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

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">處理回覆</h3>
          {caseData.status !== "closed" && (
            <form onSubmit={handleReply} className="mb-6">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="輸入處理回覆或改善說明..."
              />
              <button
                type="submit"
                disabled={pending || !reply.trim()}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                送出回覆
              </button>
            </form>
          )}

          <h4 className="mb-3 text-sm font-medium text-slate-700">處理紀錄</h4>
          <div className="space-y-3">
            {safeLogs.length === 0 ? (
              <p className="text-sm text-slate-500">尚無處理紀錄</p>
            ) : (
              safeLogs.map((log, index) => (
                <div
                  key={log.id || `log-${index}`}
                  className="flex gap-3 border-l-2 border-brand-200 pl-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{log.action}</span>
                      <span className="text-xs text-slate-400">{formatDate(log.created_at)}</span>
                    </div>
                    {log.content && (
                      <p className="mt-1 text-sm text-slate-600">{log.content}</p>
                    )}
                    {log.user && (
                      <p className="mt-0.5 text-xs text-slate-400">{log.user.name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">案件操作</h3>

          <div className="mb-4 space-y-2">
            {(["new", "assigned", "in_progress", "replied", "cs_confirming", "closed"] as const).map((s) => (
              <div
                key={s}
                className={`flex items-center gap-2 text-sm ${
                  caseData.status === s ? "font-semibold text-brand-600" : "text-slate-400"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${caseData.status === s ? "bg-brand-600" : "bg-slate-200"}`} />
                {CASE_STATUS_LABELS[s]}
              </div>
            ))}
          </div>

          {caseData.status !== "closed" && (
            <div className="space-y-2">
              {nextStatus && (
                <button
                  onClick={handleAdvance}
                  disabled={pending}
                  className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  推進至：{CASE_STATUS_LABELS[nextStatus]}
                </button>
              )}
              {(caseData.status === "cs_confirming" || caseData.status === "replied") && (
                <button
                  onClick={handleClose}
                  disabled={pending}
                  className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  結案
                </button>
              )}
            </div>
          )}

          {caseData.status === "closed" && (
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
