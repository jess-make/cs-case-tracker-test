import Link from "next/link";
import { Plus } from "lucide-react";
import { CaseTable } from "@/components/cases/CaseTable";
import { CaseFilters } from "@/components/cases/CaseFilters";
import { getCases, getHandlers } from "@/lib/data/cases";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateCase } from "@/lib/auth/permissions";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    assignee_id?: string;
    complaint_type?: string;
    urgency?: string;
    q?: string;
    date_preset?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const showCreate = currentUser ? canCreateCase(currentUser.role) : false;

  const [cases, handlers] = await Promise.all([
    getCases({
      status: params.status,
      assignee_id: params.assignee_id,
      complaint_type: params.complaint_type,
      urgency: params.urgency,
      q: params.q,
      date_preset: params.date_preset,
      date_from: params.date_from,
      date_to: params.date_to,
      filterByDate: true,
    }),
    getHandlers(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">案件列表</h1>
          <p className="mt-1 text-sm text-slate-500">共 {cases.length} 筆案件</p>
        </div>
        {showCreate && (
          <Link
            href="/cases/new"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            建立案件
          </Link>
        )}
      </div>

      <Suspense fallback={<div className="mb-6 h-16 animate-pulse rounded-xl bg-slate-100" />}>
        <div className="mb-6">
          <CaseFilters handlers={handlers} />
        </div>
      </Suspense>

      <CaseTable cases={cases} />
    </div>
  );
}
