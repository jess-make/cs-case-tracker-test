"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import type { Department } from "@/types";
import {
  createDepartmentAction,
  setDepartmentActiveAction,
} from "@/app/actions/departments";
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

export function DepartmentManagementTable({
  departments,
}: DepartmentManagementTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [togglePendingId, setTogglePendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

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
    setTogglePendingId(department.id);
    startTransition(async () => {
      const result = await setDepartmentActiveAction(
        department.id,
        !department.is_active
      );
      setTogglePendingId(null);
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
              placeholder="例如：業務部-客服"
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-slate-900">
                      {department.name}
                    </p>
                    <div className="mt-2">
                      <ActiveBadge active={department.is_active} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(department)}
                    disabled={pending && togglePendingId === department.id}
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium",
                      department.is_active
                        ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                    )}
                  >
                    {pending && togglePendingId === department.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : department.is_active ? (
                      "停用"
                    ) : (
                      "啟用"
                    )}
                  </button>
                </div>
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
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggle(department)}
                        disabled={pending && togglePendingId === department.id}
                        className={cn(
                          "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium",
                          department.is_active
                            ? "border-slate-300 text-slate-700 hover:bg-white"
                            : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                        )}
                      >
                        {pending && togglePendingId === department.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : department.is_active ? (
                          "停用"
                        ) : (
                          "啟用"
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
