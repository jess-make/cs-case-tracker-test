"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ComplaintCategory, ComplaintIssue } from "@/types";
import {
  createComplaintCategoryAction,
  deleteComplaintCategoryAction,
  renameComplaintCategoryAction,
  reorderComplaintCategoriesAction,
  setComplaintCategoryActiveAction,
} from "@/app/actions/complaint-categories";
import {
  createComplaintIssueAction,
  deleteComplaintIssueAction,
  renameComplaintIssueAction,
  reorderComplaintIssuesAction,
  setComplaintIssueActiveAction,
} from "@/app/actions/complaint-issues";
import { DragSortableList } from "@/components/ui/DragSortableList";
import { cn } from "@/lib/utils";

interface ComplaintCategoryManagementTableProps {
  categories: ComplaintCategory[];
  issuesByCategoryId: Record<string, ComplaintIssue[]>;
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

function EditNameDialog({
  title,
  label,
  initialName,
  confirmRename,
  open,
  onClose,
  onSave,
}: {
  title: string;
  label: string;
  initialName: string;
  confirmRename?: (oldName: string, newName: string) => boolean;
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<{ error?: string } | undefined>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName);

  if (!open) return null;

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`請填寫${label}`);
      return;
    }
    if (trimmed === initialName) {
      onClose();
      return;
    }
    if (confirmRename && !confirmRename(initialName, trimmed)) return;

    startTransition(async () => {
      const result = await onSave(trimmed);
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
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
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
          <div>
            <label className={labelClass}>{label}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              disabled={pending}
            />
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
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

function RowActions({
  isActive,
  pending,
  isBusy,
  onEdit,
  onToggle,
  onDelete,
}: {
  isActive: boolean;
  pending: boolean;
  isBusy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        disabled={pending}
        className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
          isActive
            ? "border-slate-300 text-slate-700 hover:bg-slate-50"
            : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
        )}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : isActive ? "停用" : "啟用"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        刪除
      </button>
    </div>
  );
}

export function ComplaintCategoryManagementTable({
  categories,
  issuesByCategoryId,
}: ComplaintCategoryManagementTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [issueName, setIssueName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id ?? ""
  );
  const [editingCategory, setEditingCategory] = useState<ComplaintCategory | null>(
    null
  );
  const [editingIssue, setEditingIssue] = useState<ComplaintIssue | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedIssues = useMemo(
    () => issuesByCategoryId[selectedCategoryId] ?? [],
    [issuesByCategoryId, selectedCategoryId]
  );

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createComplaintCategoryAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setCategoryName("");
      router.refresh();
    });
  }

  function handleCreateIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCategoryId) return;
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createComplaintIssueAction(selectedCategoryId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIssueName("");
      router.refresh();
    });
  }

  function runAction(id: string, fn: () => Promise<{ error?: string } | undefined>) {
    setError(null);
    setActionPendingId(id);
    startTransition(async () => {
      const result = await fn();
      setActionPendingId(null);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <form
            onSubmit={handleCreateCategory}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-slate-900">新增客訴類別</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor="complaint-category-name">
                  客訴類別名稱
                </label>
                <input
                  id="complaint-category-name"
                  name="name"
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className={inputClass}
                  placeholder="例如：商品問題"
                  disabled={pending}
                />
              </div>
              <button
                type="submit"
                disabled={pending || !categoryName.trim()}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                新增類別
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">客訴類別</h2>
              <p className="mt-0.5 text-xs text-slate-500">拖曳左側圖示可調整順序</p>
            </div>
            {categories.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">目前沒有客訴類別</p>
            ) : (
              <DragSortableList
                items={categories}
                disabled={pending}
                onReorder={async (orderedIds) => {
                  const result = await reorderComplaintCategoriesAction(orderedIds);
                  if (!result?.error) router.refresh();
                  return result;
                }}
                renderItem={(category, { dragHandle }) => {
                  const isSelected = category.id === selectedCategoryId;
                  const issueCount = issuesByCategoryId[category.id]?.length ?? 0;
                  return (
                    <div
                      className={cn(
                        "flex gap-2 px-4 py-3",
                        isSelected && "bg-brand-50/60"
                      )}
                    >
                      {dragHandle}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(category.id)}
                          className="mb-2 w-full text-left"
                        >
                          <p className="text-sm font-medium text-slate-900">{category.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <ActiveBadge active={category.is_active} />
                            <span className="text-xs text-slate-500">{issueCount} 個問題</span>
                          </div>
                        </button>
                        <RowActions
                          isActive={category.is_active}
                          pending={pending}
                          isBusy={pending && actionPendingId === category.id}
                          onEdit={() => setEditingCategory(category)}
                          onToggle={() =>
                            runAction(category.id, () =>
                              setComplaintCategoryActiveAction(category.id, !category.is_active)
                            )
                          }
                          onDelete={() => {
                            if (
                              !confirm(
                                `確定要刪除客訴類別「${category.name}」嗎？此操作無法復原。`
                              )
                            ) {
                              return;
                            }
                            runAction(category.id, () =>
                              deleteComplaintCategoryAction(category.id)
                            );
                          }}
                        />
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={handleCreateIssue}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              新增客訴問題
              {selectedCategory ? `（${selectedCategory.name}）` : ""}
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor="complaint-issue-name">
                  客訴問題名稱
                </label>
                <input
                  id="complaint-issue-name"
                  name="name"
                  type="text"
                  required
                  value={issueName}
                  onChange={(e) => setIssueName(e.target.value)}
                  className={inputClass}
                  placeholder="例如：商品瑕疵"
                  disabled={pending || !selectedCategoryId}
                />
              </div>
              <button
                type="submit"
                disabled={pending || !issueName.trim() || !selectedCategoryId}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                新增問題
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                客訴問題
                {selectedCategory ? ` · ${selectedCategory.name}` : ""}
              </h2>
              {selectedCategoryId && selectedIssues.length > 0 && (
                <p className="mt-0.5 text-xs text-slate-500">拖曳左側圖示可調整順序</p>
              )}
            </div>
            {!selectedCategoryId ? (
              <p className="p-6 text-center text-sm text-slate-500">請先選擇客訴類別</p>
            ) : selectedIssues.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">此類別尚無客訴問題</p>
            ) : (
              <DragSortableList
                items={selectedIssues}
                disabled={pending}
                onReorder={async (orderedIds) => {
                  const result = await reorderComplaintIssuesAction(
                    selectedCategoryId,
                    orderedIds
                  );
                  if (!result?.error) router.refresh();
                  return result;
                }}
                renderItem={(issue, { dragHandle }) => (
                  <div className="flex gap-2 px-4 py-3">
                    {dragHandle}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-slate-900">{issue.name}</p>
                        <div className="mt-1">
                          <ActiveBadge active={issue.is_active} />
                        </div>
                      </div>
                      <RowActions
                        isActive={issue.is_active}
                        pending={pending}
                        isBusy={pending && actionPendingId === issue.id}
                        onEdit={() => setEditingIssue(issue)}
                        onToggle={() =>
                          runAction(issue.id, () =>
                            setComplaintIssueActiveAction(issue.id, !issue.is_active)
                          )
                        }
                        onDelete={() => {
                          if (
                            !confirm(`確定要刪除客訴問題「${issue.name}」嗎？此操作無法復原。`)
                          ) {
                            return;
                          }
                          runAction(issue.id, () => deleteComplaintIssueAction(issue.id));
                        }}
                      />
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>

      {editingCategory && (
        <EditNameDialog
          key={editingCategory.id}
          title="編輯客訴類別"
          label="客訴類別名稱"
          initialName={editingCategory.name}
          open
          onClose={() => setEditingCategory(null)}
          confirmRename={(oldName, newName) =>
            confirm(
              `確定要將客訴類別「${oldName}」改名為「${newName}」嗎？既有案件也會同步更新。`
            )
          }
          onSave={async (name) => {
            const formData = new FormData();
            formData.set("name", name);
            return renameComplaintCategoryAction(editingCategory.id, formData);
          }}
        />
      )}

      {editingIssue && (
        <EditNameDialog
          key={editingIssue.id}
          title="編輯客訴問題"
          label="客訴問題名稱"
          initialName={editingIssue.name}
          open
          onClose={() => setEditingIssue(null)}
          confirmRename={(oldName, newName) =>
            confirm(
              `確定要將客訴問題「${oldName}」改名為「${newName}」嗎？既有案件也會同步更新。`
            )
          }
          onSave={async (name) => {
            const formData = new FormData();
            formData.set("name", name);
            return renameComplaintIssueAction(editingIssue.id, formData);
          }}
        />
      )}
    </div>
  );
}
