import { redirect } from "next/navigation";
import { UserManagementTable } from "@/components/users/UserManagementTable";
import { getUsersForManagement } from "@/lib/data/users";
import { getActiveDepartmentNames } from "@/lib/data/departments";
import { requireUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";

export default async function UsersPage() {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser.role)) {
    redirect("/");
  }

  const [users, activeDepartments] = await Promise.all([
    getUsersForManagement(),
    getActiveDepartmentNames(),
  ]);

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">使用者管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {users.length} 位使用者 · 僅系統管理員可編輯
        </p>
      </div>

      <UserManagementTable
        users={users}
        currentUserId={currentUser.id}
        activeDepartments={activeDepartments}
      />
    </div>
  );
}
