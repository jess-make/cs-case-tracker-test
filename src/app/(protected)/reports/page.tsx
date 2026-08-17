import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
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

export default async function ReportsPage() {
  const currentUser = await requireUser();
  if (!canAccessReportManagement(currentUser)) {
    redirect("/");
  }

  const taxonomy = await getCategoryIssueTaxonomy().catch(() => EMPTY_TAXONOMY);
  const categories = taxonomy.categories.filter((category) => category.is_active);

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          報表管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {categories.length} 份案件類別報表
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">報表清單</h2>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              目前沒有可用的案件類別報表
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    報表名稱
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    案件類別
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    子分類
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    欄位狀態
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    狀態
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {categories.map((category) => {
                  const issueCount =
                    taxonomy.issuesByCategoryId[category.id]?.filter(
                      (issue) => issue.is_active
                    ).length ?? 0;

                  return (
                    <tr key={category.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {category.name}案件報表
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {category.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {issueCount} 個子分類
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        待設定
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          規劃中
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
