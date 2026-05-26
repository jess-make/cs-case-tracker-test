import Link from "next/link";
import type { Case } from "@/types";
import { StatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function CaseTable({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        目前沒有案件
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">案件編號</th>
            <th className="px-4 py-3 font-medium text-slate-600">客戶</th>
            <th className="px-4 py-3 font-medium text-slate-600">客訴類型</th>
            <th className="px-4 py-3 font-medium text-slate-600">緊急度</th>
            <th className="px-4 py-3 font-medium text-slate-600">案件狀態</th>
            <th className="px-4 py-3 font-medium text-slate-600">負責人</th>
            <th className="px-4 py-3 font-medium text-slate-600">處理期限</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/cases/${c.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {c.case_number}
                </Link>
                {c.is_overdue && c.status !== "closed" && (
                  <AlertTriangle className="ml-1 inline h-4 w-4 text-red-500" />
                )}
              </td>
              <td className="px-4 py-3 text-slate-700">{c.customer_name}</td>
              <td className="px-4 py-3 text-slate-600">{c.complaint_type}</td>
              <td className="px-4 py-3">
                <UrgencyBadge urgency={c.urgency} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {c.assignee?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(c.due_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
