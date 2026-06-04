"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import type { CaseAttachment } from "@/types";

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isLegacyAttachment(id: string): boolean {
  return id.startsWith("legacy-");
}

export function CaseAttachmentEditFields({
  attachments,
  labelClass,
}: {
  attachments: CaseAttachment[];
  labelClass: string;
}) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const visible = attachments.filter((a) => !removedIds.has(a.id));
  const deletable = visible.filter((a) => !isLegacyAttachment(a.id));
  const legacyOnly =
    visible.length > 0 &&
    deletable.length === 0 &&
    visible.every((a) => isLegacyAttachment(a.id));

  function markRemoved(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
  }

  return (
    <div>
      <p className={labelClass}>附件</p>

      {visible.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">尚無附件</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {visible.map((att) => (
            <li
              key={att.id}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                {att.download_url ? (
                  <a
                    href={att.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {att.file_name}
                  </a>
                ) : (
                  <span className="break-all text-sm font-medium text-slate-800">
                    {att.file_name}
                  </span>
                )}
                {att.file_size != null && att.file_size > 0 && (
                  <span className="ml-2 text-xs text-slate-500">
                    {formatFileSize(att.file_size)}
                  </span>
                )}
              </div>
              {!isLegacyAttachment(att.id) && (
                <button
                  type="button"
                  onClick={() => markRemoved(att.id)}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  aria-label={`移除 ${att.file_name}`}
                >
                  <X className="h-4 w-4" />
                  移除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {legacyOnly && (
        <p className="mb-3 text-xs text-amber-700">
          舊版附件僅能預覽，無法由此處刪除。
        </p>
      )}

      {Array.from(removedIds).map((id) => (
        <input key={id} type="hidden" name="remove_attachment_ids" value={id} />
      ))}

      <label className="mb-1 block text-sm font-medium text-slate-700">
        新增附件
      </label>
      <input
        type="file"
        name="attachments"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        className="block w-full min-h-11 text-sm text-slate-600 file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
      />
      <p className="mt-1 text-xs text-slate-500">
        支援圖片、PDF、Word，可多選。儲存後才會上傳或刪除。
      </p>
    </div>
  );
}
