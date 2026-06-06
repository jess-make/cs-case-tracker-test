"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2 } from "lucide-react";
import type { User, UserRole } from "@/types";
import { DEPARTMENTS, ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import { updateUserAction } from "@/app/actions/users";
import { cn } from "@/lib/utils";

interface UserManagementTableProps {
  users: User[];
  currentUserId: string;
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
      )}
    >
      {active ? "啟用" : "停用"}
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
      {ROLE_LABELS[role]}
    </span>
  );
}

function UserEditDialog({
  user,
  open,
  onClose,
  isSelf,
}: {
  user: User;
  open: boolean;
  onClose: () => void;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState(user.department ?? "");

  if (!open) return null;

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  const departmentOptions = [
    ...DEPARTMENTS,
    ...(user.department && !DEPARTMENTS.includes(user.department as (typeof DEPARTMENTS)[number])
      ? [user.department]
      : []),
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateUserAction(user.id, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-edit-title"
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 id="user-edit-title" className="text-lg font-semibold text-slate-900">
            編輯使用者
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 py-5 sm:px-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="user-email">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                value={user.email}
                readOnly
                className={cn(inputClass, "bg-slate-50 text-slate-500")}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="user-name">
                姓名
              </label>
              <input
                id="user-name"
                name="name"
                type="text"
                required
                defaultValue={user.name}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="user-role">
                角色
              </label>
              <select
                id="user-role"
                name="role"
                defaultValue={user.role}
                className={inputClass}
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="user-department">
                部門
              </label>
              <select
                id="user-department"
                name="department"
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">未設定</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="user-line-id">
                LINE User ID
              </label>
              <input
                id="user-line-id"
                name="line_user_id"
                type="text"
                defaultValue={user.line_user_id ?? ""}
                placeholder="選填"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="user-is-active">
                啟用狀態
              </label>
              {isSelf ? (
                <>
                  <input type="hidden" name="is_active" value="true" />
                  <input
                    id="user-is-active"
                    type="text"
                    readOnly
                    value="啟用"
                    className={cn(inputClass, "bg-slate-50 text-slate-500")}
                  />
                  <p className="mt-1 text-xs text-slate-500">無法停用自己的帳號</p>
                </>
              ) : (
                <select
                  id="user-is-active"
                  name="is_active"
                  defaultValue={user.is_active !== false ? "true" : "false"}
                  className={inputClass}
                >
                  <option value="true">啟用</option>
                  <option value="false">停用</option>
                </select>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserMobileCards({
  users,
  onEdit,
}: {
  users: User[];
  onEdit: (user: User) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {users.map((user) => (
        <div
          key={user.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{user.name}</p>
              <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
            </div>
            <ActiveBadge active={user.is_active !== false} />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">角色</dt>
              <dd className="mt-0.5">
                <RoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">部門</dt>
              <dd className="text-slate-700">{user.department?.trim() || "—"}</dd>
            </div>
            <div className="col-span-2 min-w-0">
              <dt className="text-xs text-slate-500">LINE User ID</dt>
              <dd className="truncate font-mono text-xs text-slate-700">
                {user.line_user_id?.trim() || "—"}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => onEdit(user)}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            編輯
          </button>
        </div>
      ))}
    </div>
  );
}

function UserDesktopTable({
  users,
  onEdit,
}: {
  users: User[];
  onEdit: (user: User) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 sm:p-12">
        目前沒有使用者
      </div>
    );
  }

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">姓名</th>
            <th className="px-4 py-3 font-medium text-slate-600">Email</th>
            <th className="px-4 py-3 font-medium text-slate-600">角色</th>
            <th className="px-4 py-3 font-medium text-slate-600">部門</th>
            <th className="px-4 py-3 font-medium text-slate-600">LINE User ID</th>
            <th className="px-4 py-3 font-medium text-slate-600">啟用狀態</th>
            <th className="px-4 py-3 font-medium text-slate-600">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
              <td className="px-4 py-3 text-slate-700">{user.email}</td>
              <td className="px-4 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3 text-slate-700">
                {user.department?.trim() || "—"}
              </td>
              <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-slate-700">
                {user.line_user_id?.trim() || "—"}
              </td>
              <td className="px-4 py-3">
                <ActiveBadge active={user.is_active !== false} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <Pencil className="h-4 w-4" />
                  編輯
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserManagementTable({ users, currentUserId }: UserManagementTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 sm:p-12">
        目前沒有使用者
      </div>
    );
  }

  return (
    <>
      <UserMobileCards users={users} onEdit={setEditingUser} />
      <UserDesktopTable users={users} onEdit={setEditingUser} />
      {editingUser && (
        <UserEditDialog
          key={editingUser.id}
          user={editingUser}
          open={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          isSelf={editingUser.id === currentUserId}
        />
      )}
    </>
  );
}
