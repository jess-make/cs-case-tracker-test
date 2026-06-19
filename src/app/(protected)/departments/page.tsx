import { redirect } from "next/navigation";
import { DepartmentManagementTable } from "@/components/departments/DepartmentManagementTable";
import { getDepartmentsForManagement } from "@/lib/data/departments";
import { requireUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";

export default async function DepartmentsPage() {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser.role)) {
    redirect("/");
  }

  const departments = await getDepartmentsForManagement();

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">部門管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {departments.length} 個部門 · 僅系統管理員可編輯 · 停用後不會出現在新選單，既有資料仍保留原部門名稱
        </p>
      </div>

      <DepartmentManagementTable departments={departments} />
    </div>
  );
}
