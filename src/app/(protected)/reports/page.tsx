import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Download, FileText } from "lucide-react";
import { canAccessReportManagement } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import {
  getCategoryIssueTaxonomy,
  type CategoryIssueTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";

const EMPTY_TAXONOMY: CategoryIssueTaxonomy = {
  categories: [],
  issuesByCategoryId: {},
  issuesByCategoryName: {},
};

const DOWNLOADABLE_REPORTS = [
  {
    key: "return",
    name: "退貨案件報表",
    category: "退貨",
    href: "/api/reports/cases?template=return-exchange&complaint_type=%E9%80%80%E8%B2%A8",
  },
  {
    key: "exchange",
    name: "換貨案件報表",
    category: "換貨",
    href: "/api/reports/cases?template=return-exchange&complaint_type=%E6%8F%9B%E8%B2%A8",
  },
] as const;

export default async function ReportsPage() {
  const currentUser = await requireUser();
  if (!canAccessReportManagement(currentUser)) {
    redirect("/");
  }

  const taxonomy = await getCategoryIssueTaxonomy().catch(() => EMPTY_TAXONOMY);
  const categories = taxonomy.categories.filter((category) => category.is_active);
  const downloadableCategories = new Set<string>(
    DOWNLOADABLE_REPORTS.map((report) => report.category)
  );
  const plannedReports = categories
    .filter((category) => !downloadableCategories.has(category.name))
    .map((category) => ({
      id: category.id,
      name: `${category.name}案件報表`,
    }));
  const totalReports = DOWNLOADABLE_REPORTS.length + plannedReports.length;

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          報表管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {totalReports} 份案件類別報表
        </p>
      </div>

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
                      <Link
                        href={report.href}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                      >
                        <Download className="h-4 w-4" />
                        下載
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {plannedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              目前沒有規劃中的案件類別報表
            </p>
          </div>
        ) : (
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
