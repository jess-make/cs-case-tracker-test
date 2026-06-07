"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { createUserAction } from "@/app/actions/users";
import { DEPARTMENTS, ROLE_LABELS, USER_ROLES } from "@/lib/constants";

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { email: string; temporaryPassword: string }) => void;
}

export function UserCreateDialog({ open, onClose, onCreated }: UserCreateDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState("");

  if (!open) return null;

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUserAction(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("success" in result && result.success) {
        onCreated({
          email: result.email,
          temporaryPassword: result.temporaryPassword,
        });
        onClose();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-create-title"
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 id="user-create-title" className="text-lg font-semibold text-slate-900">
            新增使用者
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

          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="create-user-name">
                姓名
              </label>
              <input
                id="create-user-name"
                name="name"
                type="text"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="create-user-email">
                Email
              </label>
              <input
                id="create-user-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                className={inputClass}
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="create-user-role">
                角色
              </label>
              <select id="create-user-role" name="role" required className={inputClass} defaultValue="user">
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="create-user-department">
                部門
              </label>
              <select
                id="create-user-department"
                name="department"
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">未設定</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
              建立
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
