"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import type { CaseAttachment } from "@/types";
import { LocalAttachmentPicker } from "@/components/cases/LocalAttachmentPicker";
import {
  type PendingAttachment,
  appendAttachmentsToFormData,
  formatAttachmentFileSize,
} from "@/lib/attachment-preview";

function isLegacyAttachment(id: string): boolean {
  return id.startsWith("legacy-");
}

export function CaseAttachmentEditFields({
  attachments,
  labelClass,
  pendingFiles,
  onPendingFilesChange,
}: {
  attachments: CaseAttachment[];
  labelClass: string;
  pendingFiles: PendingAttachment[];
  onPendingFilesChange: (files: PendingAttachment[]) => void;
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
                    {formatAttachmentFileSize(att.file_size)}
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

      <LocalAttachmentPicker
        label="新增附件"
        labelClass="mb-1 block text-sm font-medium text-slate-700"
        hint="支援圖片、PDF、Word、Excel，可多選。選擇後可預覽，儲存後才會上傳。"
        files={pendingFiles}
        onFilesChange={onPendingFilesChange}
        inputId="edit-attachments"
      />
    </div>
  );
}

/** 編輯表單 submit 時附加待上傳檔案 */
export function appendEditPendingAttachments(
  formData: FormData,
  pendingFiles: PendingAttachment[]
): void {
  appendAttachmentsToFormData(
    formData,
    pendingFiles.map((item) => item.file)
  );
}
