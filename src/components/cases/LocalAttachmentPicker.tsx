"use client";

import { useEffect, useRef } from "react";
import { FileText, X } from "lucide-react";
import {
  type PendingAttachment,
  createPendingAttachment,
  revokePendingAttachment,
  revokeAllPendingAttachments,
  formatAttachmentFileSize,
  getAttachmentTypeLabel,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
} from "@/lib/attachment-preview";

const fileInputClass =
  "block w-full min-h-11 text-sm text-slate-600 file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100";

interface LocalAttachmentPickerProps {
  labelClass?: string;
  label?: string;
  hint?: string;
  files: PendingAttachment[];
  onFilesChange: (files: PendingAttachment[]) => void;
  inputId?: string;
}

function ImagePreview({ item, onRemove }: { item: PendingAttachment; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="h-full w-full object-contain"
        />
        <RemoveButton onRemove={onRemove} fileName={item.file.name} />
      </div>
      <PreviewMeta item={item} />
    </div>
  );
}

function PdfPreview({ item, onRemove }: { item: PendingAttachment; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative bg-slate-100">
        <iframe
          src={item.previewUrl}
          title={item.file.name}
          className="h-48 w-full border-0 sm:h-56"
        />
        <RemoveButton onRemove={onRemove} fileName={item.file.name} className="absolute right-2 top-2" />
      </div>
      <PreviewMeta item={item} />
    </div>
  );
}

function DocumentPreview({ item, onRemove }: { item: PendingAttachment; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        <FileText className="h-5 w-5 text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-all text-sm font-medium text-slate-800">{item.file.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {getAttachmentTypeLabel(item.file)}
          <span className="mx-1.5 text-slate-300">·</span>
          {formatAttachmentFileSize(item.file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-red-600 hover:bg-red-50"
        aria-label={`移除 ${item.file.name}`}
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">移除</span>
      </button>
    </div>
  );
}

function PreviewMeta({ item }: { item: PendingAttachment }) {
  return (
    <div className="border-t border-slate-100 px-3 py-2">
      <p className="truncate text-sm font-medium text-slate-800">{item.file.name}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {getAttachmentTypeLabel(item.file)}
        <span className="mx-1.5 text-slate-300">·</span>
        {formatAttachmentFileSize(item.file.size)}
      </p>
    </div>
  );
}

function RemoveButton({
  onRemove,
  fileName,
  className = "absolute right-2 top-2",
}: {
  onRemove: () => void;
  fileName: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`${className} inline-flex min-h-9 items-center gap-1 rounded-md bg-white/95 px-2 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50`}
      aria-label={`移除 ${fileName}`}
    >
      <X className="h-4 w-4" />
      <span className="hidden sm:inline">移除</span>
    </button>
  );
}

export function LocalAttachmentPicker({
  labelClass = "mb-1 block text-sm font-medium text-slate-700",
  label = "附件上傳",
  hint = ATTACHMENT_HINT,
  files,
  onFilesChange,
  inputId = "attachment-picker",
}: LocalAttachmentPickerProps) {
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    return () => revokeAllPendingAttachments(filesRef.current);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const newItems = selected.map(createPendingAttachment);
    onFilesChange([...files, ...newItems]);
    e.target.value = "";
  }

  function handleRemove(id: string) {
    const item = files.find((f) => f.id === id);
    if (item) revokePendingAttachment(item);
    onFilesChange(files.filter((f) => f.id !== id));
  }

  return (
    <div>
      <label htmlFor={inputId} className={labelClass}>
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        onChange={handleFileSelect}
        className={fileInputClass}
      />
      <p className="mt-1 text-xs text-slate-500">{hint}</p>

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {files.map((item) => (
            <li key={item.id} className="min-w-0">
              {item.kind === "image" && (
                <ImagePreview item={item} onRemove={() => handleRemove(item.id)} />
              )}
              {item.kind === "pdf" && (
                <PdfPreview item={item} onRemove={() => handleRemove(item.id)} />
              )}
              {item.kind === "document" && (
                <DocumentPreview item={item} onRemove={() => handleRemove(item.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
