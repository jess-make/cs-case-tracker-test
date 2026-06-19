"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Department } from "@/types";
import {
  createDepartmentAction,
  deleteDepartmentAction,
  renameDepartmentAction,
  setDepartmentActiveAction,
} from "@/app/actions/departments";
import { isProtectedSystemDepartment } from "@/lib/case-department";
import { cn } from "@/lib/utils";

interface DepartmentManagementTableProps {
  departments: Department[];
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

function DepartmentEditDialog({
  department,
  open,
  onClose,
}: {
  department: Department;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(department.name);
  const protectedDept = isProtectedSystemDepartment(department.name);

  if (!open) return null;

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("請填寫部門名稱");
      return;
    }
    if (trimmed === department.name) {
      onClose();
      return;
    }

    const confirmed = confirm(
      `確定要將部門「${department.name}」改名為「${trimmed}」嗎？既有使用者與案件也會同步更新。`
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("name", trimmed);

    startTransition(async () => {
      const result = await renameDepartmentAction(department.id, formData);
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
      aria-labelledby="department-edit-title"
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 id="department-edit-title" className="text-lg font-semibold text-slate-900">
            編輯部門
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
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

          {protectedDept ? (
            <p className="text-sm text-amber-800">
              此為系統客服部門，不可改名。
            </p>
          ) : (
            <div>
              <label className={labelClass} htmlFor="edit-department-name">
                部門名稱
              </label>
              <input
                id="edit-department-name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              取消
            </button>
            {!protectedDept && (
              <button
                type="submit"
                disabled={pending || !name.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                儲存
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function DepartmentRowActions({
  department,
  pending,
  actionPendingId,
  onEdit,
  onToggle,
  onDelete,
}: {
  department: Department;
  pending: boolean;
  actionPendingId: string | null;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isBusy = pending && actionPendingId === department.id;
  const protectedDept = isProtectedSystemDepartment(department.name);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        disabled={pending}
        title={protectedDept ? "此為系統客服部門，不可改名" : "編輯部門名稱"}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium",
          protectedDept
            ? "cursor-not-allowed border-slate-200 text-slate-400"
            : "border-slate-300 text-slate-700 hover:bg-slate-50"
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        編輯
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={isBusy}
        className={cn(
          "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium",
          department.is_active
            ? "border-slate-300 text-slate-700 hover:bg-slate-50"
            : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
        )}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : department.is_active ? (
          "停用"
        ) : (
          "啟用"
        )}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending || protectedDept}
        title={protectedDept ? "此為系統客服部門，不可刪除" : "刪除部門"}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium",
          protectedDept
            ? "cursor-not-allowed border-red-100 text-red-300"
            : "border-red-200 text-red-600 hover:bg-red-50"
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
        刪除
      </button>
    </div>
  );
}

export function DepartmentManagementTable({
  departments,
}: DepartmentManagementTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDepartmentAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function handleToggle(department: Department) {
    setError(null);
    setActionPendingId(department.id);
    startTransition(async () => {
      const result = await setDepartmentActiveAction(
        department.id,
        !department.is_active
      );
      setActionPendingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(department: Department) {
    if (isProtectedSystemDepartment(department.name)) return;

    const confirmed = confirm(
      `確定要刪除部門「${department.name}」嗎？此操作無法復原。`
    );
    if (!confirmed) return;

    setError(null);
    setActionPendingId(department.id);
    startTransition(async () => {
      const result = await deleteDepartmentAction(department.id);
      setActionPendingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <h2 className="mb-3 text-sm font-semibold text-slate-900">新增部門</h2>
        {error && (
          <p
            className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className={labelClass} htmlFor="department-name">
              部門名稱
            </label>
            <input
              id="department-name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="例如：測試部"
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            新增部門
          </button>
        </div>
      </form>

      {departments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 sm:p-12">
          目前沒有部門
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {departments.map((department) => (
              <div
                key={department.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 min-w-0">
                  <p className="break-all text-sm font-medium text-slate-900">
                    {department.name}
                  </p>
                  <div className="mt-2">
                    <ActiveBadge active={department.is_active} />
                  </div>
                </div>
                <DepartmentRowActions
                  department={department}
                  pending={pending}
                  actionPendingId={actionPendingId}
                  onEdit={() => setEditingDepartment(department)}
                  onToggle={() => handleToggle(department)}
                  onDelete={() => handleDelete(department)}
                />
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    部門名稱
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    狀態
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((department) => (
                  <tr key={department.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {department.name}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={department.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <DepartmentRowActions
                        department={department}
                        pending={pending}
                        actionPendingId={actionPendingId}
                        onEdit={() => setEditingDepartment(department)}
                        onToggle={() => handleToggle(department)}
                        onDelete={() => handleDelete(department)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingDepartment && (
        <DepartmentEditDialog
          key={editingDepartment.id}
          department={editingDepartment}
          open={Boolean(editingDepartment)}
          onClose={() => setEditingDepartment(null)}
        />
      )}
    </div>
  );
}
