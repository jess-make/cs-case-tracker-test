"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ComplaintChannel, ComplaintSource } from "@/types";
import {
  createComplaintChannelAction,
  createComplaintSourceAction,
  deleteComplaintChannelAction,
  deleteComplaintSourceAction,
  renameComplaintChannelAction,
  renameComplaintSourceAction,
  setComplaintChannelActiveAction,
  setComplaintSourceActiveAction,
} from "@/app/actions/complaint-sources";
import { cn } from "@/lib/utils";

interface ComplaintSourceManagementPanelProps {
  sources: ComplaintSource[];
  channelsBySourceId: Record<string, ComplaintChannel[]>;
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

export function ComplaintSourceManagementPanel({
  sources,
  channelsBySourceId,
}: ComplaintSourceManagementPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id ?? "");
  const [editingSource, setEditingSource] = useState<ComplaintSource | null>(null);
  const [editingChannel, setEditingChannel] = useState<ComplaintChannel | null>(null);

  const selectedSource = sources.find((s) => s.id === selectedSourceId);
  const selectedChannels = useMemo(
    () => channelsBySourceId[selectedSourceId] ?? [],
    [channelsBySourceId, selectedSourceId]
  );

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  function handleCreateSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createComplaintSourceAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSourceName("");
      router.refresh();
    });
  }

  function handleCreateChannel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSourceId) return;
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createComplaintChannelAction(selectedSourceId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setChannelName("");
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
            onSubmit={handleCreateSource}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-slate-900">新增客訴來源</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor="complaint-source-name">
                  客訴來源名稱
                </label>
                <input
                  id="complaint-source-name"
                  name="name"
                  type="text"
                  required
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className={inputClass}
                  placeholder="例如：綠途"
                  disabled={pending}
                />
              </div>
              <button
                type="submit"
                disabled={pending || !sourceName.trim()}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                新增來源
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">客訴來源</h2>
            </div>
            {sources.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">目前沒有客訴來源</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sources.map((source) => {
                  const isSelected = source.id === selectedSourceId;
                  const channelCount = channelsBySourceId[source.id]?.length ?? 0;
                  return (
                    <li
                      key={source.id}
                      className={cn("px-4 py-3", isSelected && "bg-brand-50/60")}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSourceId(source.id)}
                        className="mb-2 w-full text-left"
                      >
                        <p className="text-sm font-medium text-slate-900">{source.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <ActiveBadge active={source.is_active} />
                          <span className="text-xs text-slate-500">{channelCount} 個管道</span>
                        </div>
                      </button>
                      <RowActions
                        isActive={source.is_active}
                        pending={pending}
                        isBusy={pending && actionPendingId === source.id}
                        onEdit={() => setEditingSource(source)}
                        onToggle={() =>
                          runAction(source.id, () =>
                            setComplaintSourceActiveAction(source.id, !source.is_active)
                          )
                        }
                        onDelete={() => {
                          if (
                            !confirm(
                              `確定要刪除客訴來源「${source.name}」嗎？此操作無法復原。`
                            )
                          ) {
                            return;
                          }
                          runAction(source.id, () =>
                            deleteComplaintSourceAction(source.id)
                          );
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={handleCreateChannel}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              新增客訴管道
              {selectedSource ? `（${selectedSource.name}）` : ""}
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor="complaint-channel-name">
                  客訴管道名稱
                </label>
                <input
                  id="complaint-channel-name"
                  name="name"
                  type="text"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className={inputClass}
                  placeholder="例如：MO+"
                  disabled={pending || !selectedSourceId}
                />
              </div>
              <button
                type="submit"
                disabled={pending || !channelName.trim() || !selectedSourceId}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" />
                新增管道
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                客訴管道
                {selectedSource ? ` · ${selectedSource.name}` : ""}
              </h2>
            </div>
            {!selectedSourceId ? (
              <p className="p-6 text-center text-sm text-slate-500">請先選擇客訴來源</p>
            ) : selectedChannels.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">此來源尚無客訴管道</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {selectedChannels.map((channel) => (
                  <li key={channel.id} className="px-4 py-3">
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-900">{channel.name}</p>
                      <div className="mt-1">
                        <ActiveBadge active={channel.is_active} />
                      </div>
                    </div>
                    <RowActions
                      isActive={channel.is_active}
                      pending={pending}
                      isBusy={pending && actionPendingId === channel.id}
                      onEdit={() => setEditingChannel(channel)}
                      onToggle={() =>
                        runAction(channel.id, () =>
                          setComplaintChannelActiveAction(channel.id, !channel.is_active)
                        )
                      }
                      onDelete={() => {
                        if (
                          !confirm(`確定要刪除客訴管道「${channel.name}」嗎？此操作無法復原。`)
                        ) {
                          return;
                        }
                        runAction(channel.id, () => deleteComplaintChannelAction(channel.id));
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {editingSource && (
        <EditNameDialog
          key={editingSource.id}
          title="編輯客訴來源"
          label="客訴來源名稱"
          initialName={editingSource.name}
          open
          onClose={() => setEditingSource(null)}
          confirmRename={(oldName, newName) =>
            confirm(
              `確定要將客訴來源「${oldName}」改名為「${newName}」嗎？既有案件也會同步更新。`
            )
          }
          onSave={async (name) => {
            const formData = new FormData();
            formData.set("name", name);
            return renameComplaintSourceAction(editingSource.id, formData);
          }}
        />
      )}

      {editingChannel && (
        <EditNameDialog
          key={editingChannel.id}
          title="編輯客訴管道"
          label="客訴管道名稱"
          initialName={editingChannel.name}
          open
          onClose={() => setEditingChannel(null)}
          confirmRename={(oldName, newName) =>
            confirm(
              `確定要將客訴管道「${oldName}」改名為「${newName}」嗎？既有案件也會同步更新。`
            )
          }
          onSave={async (name) => {
            const formData = new FormData();
            formData.set("name", name);
            return renameComplaintChannelAction(editingChannel.id, formData);
          }}
        />
      )}
    </div>
  );
}
