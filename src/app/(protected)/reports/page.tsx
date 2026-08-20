import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Download, FileText } from "lucide-react";
import { canAccessReportManagement } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { DateRangeFilter } from "@/components/cases/DateRangeFilter";
import {
  getCategoryIssueTaxonomy,
  type CategoryIssueTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";
import { getDefaultDateParams } from "@/lib/date-range";

const EMPTY_TAXONOMY: CategoryIssueTaxonomy = {
  categories: [],
  issuesByCategoryId: {},
  issuesByCategoryName: {},
};

const DOWNLOADABLE_REPORTS = [
  {
    key: "return",
    name: "退貨案件",
    template: "return-exchange",
    category: "退貨",
  },
  {
    key: "exchange",
    name: "換貨案件",
    template: "return-exchange",
    category: "換貨",
  },
  {
    key: "quality-inspection-stats",
    name: "修正機況統計",
    template: "quality-inspection-stats",
  },
  {
    key: "consultation",
    name: "諮詢服務案件",
    template: "category-case",
    category: "諮詢服務",
  },
  {
    key: "product",
    name: "商品問題案件",
    template: "category-case",
    category: "商品問題",
  },
  {
    key: "store",
    name: "門市問題案件",
    template: "category-case",
    category: "門市問題",
  },
  {
    key: "logistics",
    name: "物流問題案件",
    template: "category-case",
    category: "物流問題",
  },
  {
    key: "recycling",
    name: "舊機回收案件",
    template: "category-case",
    category: "舊機回收",
  },
  {
    key: "other",
    name: "其他案件",
    template: "category-case",
    category: "其他",
  },
] as const;

interface PageProps {
  searchParams: Promise<{
    date_preset?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

type ReportFormat = "csv" | "xlsx";

function getReportDateParams(params: Awaited<PageProps["searchParams"]>) {
  const defaults = getDefaultDateParams();
  return {
    date_preset: params.date_preset?.trim() || defaults.date_preset,
    date_from: params.date_from?.trim() || defaults.date_from,
    date_to: params.date_to?.trim() || defaults.date_to,
  };
}

function buildReportHref(
  report: (typeof DOWNLOADABLE_REPORTS)[number],
  format: ReportFormat,
  params: Awaited<PageProps["searchParams"]>
): string {
  const query = new URLSearchParams({
    template: report.template,
    format,
    ...getReportDateParams(params),
  });
  if ("category" in report) {
    query.set("complaint_type", report.category);
  }
  return `/api/reports/cases?${query.toString()}`;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentUser = await requireUser();
  if (!canAccessReportManagement(currentUser)) {
    redirect("/");
  }

  const taxonomy = await getCategoryIssueTaxonomy().catch(() => EMPTY_TAXONOMY);
  const categories = taxonomy.categories.filter((category) => category.is_active);
  const downloadableCategories = new Set<string>(
    DOWNLOADABLE_REPORTS.flatMap((report) =>
      "category" in report ? [report.category] : []
    )
  );
  const plannedReports = categories
    .filter((category) => !downloadableCategories.has(category.name))
    .map((category) => ({
      id: category.id,
      name: `${category.name}案件`,
    }));
  const totalReports = DOWNLOADABLE_REPORTS.length + plannedReports.length;

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          報表管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {totalReports} 份報表
        </p>
      </div>

      <Suspense fallback={<div className="mb-4 h-28 animate-pulse rounded-xl bg-slate-100" />}>
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <DateRangeFilter basePath="/reports" bordered={false} />
        </div>
      </Suspense>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <FileText className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900">可下載報表</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    報表名稱
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    狀態
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {DOWNLOADABLE_REPORTS.map((report) => (
                  <tr key={report.key} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {report.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        可下載
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link
                          href={buildReportHref(report, "csv", params)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          下載 CSV
                        </Link>
                        <Link
                          href={buildReportHref(report, "xlsx", params)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                        >
                          <Download className="h-4 w-4" />
                          下載 XLSX
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {plannedReports.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">規劃中報表</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      報表名稱
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      狀態
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {plannedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {report.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          規劃中
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
