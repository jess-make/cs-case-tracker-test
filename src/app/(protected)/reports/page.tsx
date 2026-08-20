import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Download, FileText } from "lucide-react";
import { canAccessReportManagement } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { DateRangeFilter } from "@/components/cases/DateRangeFilter";
import { getCases } from "@/lib/data/cases";
import {
  getCategoryIssueTaxonomy,
  type CategoryIssueTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";
import { getDefaultDateParams } from "@/lib/date-range";
import {
  getCategoryCaseReportHeaders,
  QUALITY_INSPECTION_ANALYSIS_REPORT_HEADERS,
  QUALITY_INSPECTION_DETAIL_REPORT_HEADERS,
  RETURN_EXCHANGE_CASE_REPORT_HEADERS,
  type CategoryCaseReportType,
} from "@/lib/reports/case-report";

const EMPTY_TAXONOMY: CategoryIssueTaxonomy = {
  categories: [],
  issuesByCategoryId: {},
  issuesByCategoryName: {},
};

const DOWNLOADABLE_REPORTS = [
  {
    key: "return",
    name: "退貨案件",
    group: "operations",
    template: "return-exchange",
    category: "退貨",
  },
  {
    key: "exchange",
    name: "換貨案件",
    group: "operations",
    template: "return-exchange",
    category: "換貨",
  },
  {
    key: "quality-inspection-stats",
    name: "修正機況統計",
    group: "operations",
    template: "quality-inspection-stats",
  },
  {
    key: "consultation",
    name: "諮詢服務案件",
    group: "category",
    template: "category-case",
    category: "諮詢服務",
  },
  {
    key: "product",
    name: "商品問題案件",
    group: "category",
    template: "category-case",
    category: "商品問題",
  },
  {
    key: "store",
    name: "門市問題案件",
    group: "category",
    template: "category-case",
    category: "門市問題",
  },
  {
    key: "logistics",
    name: "物流問題案件",
    group: "category",
    template: "category-case",
    category: "物流問題",
  },
  {
    key: "recycling",
    name: "舊機回收案件",
    group: "category",
    template: "category-case",
    category: "舊機回收",
  },
  {
    key: "other",
    name: "其他案件",
    group: "category",
    template: "category-case",
    category: "其他",
  },
] as const;

const REPORT_GROUPS = [
  {
    key: "operations",
    title: "退換貨相關",
    description: "退貨、換貨與修正機況統計",
  },
  {
    key: "category",
    title: "案件類別明細",
    description: "依案件類別輸出指定欄位",
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
type DownloadableReport = (typeof DOWNLOADABLE_REPORTS)[number];
type FieldPreviewGroup = {
  label?: string;
  fields: readonly string[];
};

function getReportDateParams(params: Awaited<PageProps["searchParams"]>) {
  const defaults = getDefaultDateParams();
  return {
    date_preset: params.date_preset?.trim() || defaults.date_preset,
    date_from: params.date_from?.trim() || defaults.date_from,
    date_to: params.date_to?.trim() || defaults.date_to,
  };
}

function buildReportHref(
  report: DownloadableReport,
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

function getReportFieldPreview(report: DownloadableReport): FieldPreviewGroup[] {
  if (report.template === "return-exchange") {
    return [{ fields: RETURN_EXCHANGE_CASE_REPORT_HEADERS }];
  }

  if (report.template === "quality-inspection-stats") {
    return [
      {
        label: "統計分析",
        fields: QUALITY_INSPECTION_ANALYSIS_REPORT_HEADERS,
      },
      {
        label: "明細",
        fields: QUALITY_INSPECTION_DETAIL_REPORT_HEADERS,
      },
    ];
  }

  return [
    {
      fields: getCategoryCaseReportHeaders(
        report.category as CategoryCaseReportType
      ),
    },
  ];
}

function getReportCaseCount(
  report: DownloadableReport,
  cases: Awaited<ReturnType<typeof getCases>>
): number {
  if ("category" in report) {
    return cases.filter((caseData) => caseData.complaint_type === report.category)
      .length;
  }

  return cases.length;
}

function FieldPreview({ report }: { report: DownloadableReport }) {
  const groups = getReportFieldPreview(report);

  return (
    <details className="group max-w-xl">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <FileText className="h-4 w-4 text-slate-500" />
        查看欄位
      </summary>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        {groups.map((group, index) => (
          <div key={group.label ?? index} className={index > 0 ? "mt-3" : ""}>
            {group.label && (
              <p className="mb-2 text-xs font-semibold text-slate-600">
                {group.label}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {group.fields.map((field) => (
                <span
                  key={`${group.label ?? "fields"}-${field}`}
                  className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function ReportCountBadge({ count }: { count: number }) {
  const hasData = count > 0;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        hasData
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      本期間 {count} 筆
    </span>
  );
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentUser = await requireUser();
  if (!canAccessReportManagement(currentUser)) {
    redirect("/");
  }

  const dateParams = getReportDateParams(params);
  const [taxonomy, reportCases] = await Promise.all([
    getCategoryIssueTaxonomy().catch(() => EMPTY_TAXONOMY),
    getCases(currentUser, {
      ...dateParams,
      filterByDate: true,
    }).catch(() => [] as Awaited<ReturnType<typeof getCases>>),
  ]);
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
  const reportGroups = REPORT_GROUPS.map((group) => ({
    ...group,
    reports: DOWNLOADABLE_REPORTS.filter((report) => report.group === group.key),
  }));

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
        {reportGroups.map((group) => (
          <div
            key={group.key}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  {group.title}
                </h2>
              </div>
              <p className="text-xs text-slate-500">{group.description}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      報表名稱
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      期間資料
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      欄位
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {group.reports.map((report) => (
                    <tr key={report.key} className="align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                        {report.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <ReportCountBadge
                          count={getReportCaseCount(report, reportCases)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <FieldPreview report={report} />
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
        ))}

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
