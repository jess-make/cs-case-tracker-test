"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LocalAttachmentPicker } from "@/components/cases/LocalAttachmentPicker";
import {
  type PendingAttachment,
  appendAttachmentsToFormData,
} from "@/lib/attachment-preview";
import { uploadCaseAttachmentsAction } from "@/app/actions/cases";

interface CaseAttachmentUploadPanelProps {
  caseId: string;
}

export function CaseAttachmentUploadPanel({ caseId }: CaseAttachmentUploadPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendingFiles.length === 0) return;

    setError(null);
    const formData = new FormData();
    appendAttachmentsToFormData(
      formData,
      pendingFiles.map((item) => item.file)
    );

    startTransition(async () => {
      const result = await uploadCaseAttachmentsAction(caseId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPendingFiles([]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-100 pt-4">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <LocalAttachmentPicker
        label="新增附件"
        labelClass="mb-1 block text-sm font-medium text-slate-700"
        hint="支援圖片、PDF、Word、Excel，可多選。選擇後可預覽，上傳後才會儲存。"
        files={pendingFiles}
        onFilesChange={setPendingFiles}
        inputId={`upload-attachments-${caseId}`}
      />
      <button
        type="submit"
        disabled={pending || pendingFiles.length === 0}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        上傳附件
      </button>
    </form>
  );
}
