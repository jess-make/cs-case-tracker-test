import Link from "next/link";
import { Suspense } from "react";
import { Download, Plus } from "lucide-react";
import { CaseTable } from "@/components/cases/CaseTable";
import { CaseFilters } from "@/components/cases/CaseFilters";
import { getCases, getAssigneeFilterUsers } from "@/lib/data/cases";
import { getDepartmentNamesForCaseFilter } from "@/lib/data/departments";
import {
  getCategoryIssueTaxonomy,
  getSourceChannelTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";
import { requireUser } from "@/lib/auth/session";
import { canCreateCase } from "@/lib/auth/permissions";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    assignee_id?: string;
    department?: string;
    source?: string;
    source_detail?: string;
    complaint_type?: string;
    complaint_subtype?: string;
    urgency?: string;
    q?: string;
    date_preset?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

function buildCaseReportHref(params: Awaited<PageProps["searchParams"]>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) {
      query.set(key, value.trim());
    }
  }
  const qs = query.toString();
  return qs ? `/api/reports/cases?${qs}` : "/api/reports/cases";
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentUser = await requireUser();
  const showCreate = canCreateCase(currentUser);
  const reportHref = buildCaseReportHref(params);

  const [
    cases,
    handlers,
    departmentOptions,
    sourceChannelTaxonomy,
    categoryIssueTaxonomy,
  ] = await Promise.all([
    getCases(currentUser, {
      status: params.status,
      assignee_id: params.assignee_id,
      department: params.department,
      source: params.source,
      source_detail: params.source_detail,
      complaint_type: params.complaint_type,
      complaint_subtype: params.complaint_subtype,
      urgency: params.urgency,
      q: params.q,
      date_preset: params.date_preset,
      date_from: params.date_from,
      date_to: params.date_to,
      filterByDate: true,
    }),
    getAssigneeFilterUsers(),
    getDepartmentNamesForCaseFilter(params.department).catch(() => [] as string[]),
    getSourceChannelTaxonomy().catch(() => ({
      sources: [],
      channelsBySourceId: {},
      channelsBySourceName: {},
    })),
    getCategoryIssueTaxonomy().catch(() => ({
      categories: [],
      issuesByCategoryId: {},
      issuesByCategoryName: {},
    })),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">案件列表</h1>
          <p className="mt-1 text-sm text-slate-500">共 {cases.length} 筆案件</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={reportHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            下載報表
          </Link>
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
      </div>

      <Suspense fallback={<div className="mb-6 h-16 animate-pulse rounded-xl bg-slate-100" />}>
        <div className="mb-6">
          <CaseFilters
            handlers={handlers}
            departmentOptions={departmentOptions}
            sourceItems={sourceChannelTaxonomy.sources}
            channelsBySourceName={sourceChannelTaxonomy.channelsBySourceName}
            categoryItems={categoryIssueTaxonomy.categories}
            issuesByCategoryName={categoryIssueTaxonomy.issuesByCategoryName}
          />
        </div>
      </Suspense>

      <CaseTable cases={cases} />
    </div>
  );
}
