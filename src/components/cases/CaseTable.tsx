import Link from "next/link";
import type { Case } from "@/types";
import { StatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { formatDateOnly } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

function EmptyCases() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 sm:p-12">
      目前沒有案件
    </div>
  );
}

function CaseMobileCards({ cases }: { cases: Case[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {cases.map((c) => (
        <Link
          key={c.id}
          href={`/cases/${c.id}`}
          className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
        >
          <p className="mb-3 text-xs text-slate-500">
            建檔日{" "}
            <span className="font-medium text-slate-700">
              {formatDateOnly(c.created_at)}
            </span>
          </p>

          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">案件編號</p>
              <p className="flex items-center gap-1 font-medium text-brand-600">
                <span className="truncate">{c.case_number}</span>
                {c.is_overdue && c.status !== "closed" && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                )}
              </p>
            </div>
            <StatusBadge status={c.status} />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">客戶</dt>
              <dd className="truncate font-medium text-slate-800">{c.customer_name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">客訴類型</dt>
              <dd className="truncate text-slate-700">{c.complaint_type}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">緊急程度</dt>
              <dd className="mt-0.5">
                <UrgencyBadge urgency={c.urgency} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">負責人</dt>
              <dd className="truncate text-slate-700">{c.assignee?.name ?? "—"}</dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}

function CaseDesktopTable({ cases }: { cases: Case[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">建檔日</th>
            <th className="px-4 py-3 font-medium text-slate-600">案件編號</th>
            <th className="px-4 py-3 font-medium text-slate-600">客戶</th>
            <th className="px-4 py-3 font-medium text-slate-600">客訴類型</th>
            <th className="px-4 py-3 font-medium text-slate-600">緊急程度</th>
            <th className="px-4 py-3 font-medium text-slate-600">案件狀態</th>
            <th className="px-4 py-3 font-medium text-slate-600">負責人</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatDateOnly(c.created_at)}
              </td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CaseTable({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return <EmptyCases />;
  }

  return (
    <>
      <CaseMobileCards cases={cases} />
      <CaseDesktopTable cases={cases} />
    </>
  );
}
