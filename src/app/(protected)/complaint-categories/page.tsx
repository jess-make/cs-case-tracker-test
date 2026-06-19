import { redirect } from "next/navigation";
import { ComplaintCategoryManagementTable } from "@/components/complaint-categories/ComplaintCategoryManagementTable";
import { getCategoryIssueTaxonomy } from "@/lib/data/complaint-taxonomy-form";
import { requireUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";

export default async function ComplaintCategoriesPage() {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser.role)) {
    redirect("/");
  }

  const { categories, issuesByCategoryId } = await getCategoryIssueTaxonomy();

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          客訴類別管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {categories.length} 個類別 · 僅系統管理員可編輯 · 停用後不會出現在新案件選單，既有案件仍保留原類別與問題名稱
        </p>
      </div>

      <ComplaintCategoryManagementTable
        categories={categories}
        issuesByCategoryId={issuesByCategoryId}
      />
    </div>
  );
}
