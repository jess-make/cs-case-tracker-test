import { FileText } from "lucide-react";
import type { CaseAttachment } from "@/types";

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CaseAttachmentsSection({
  attachments,
}: {
  attachments: CaseAttachment[];
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium text-slate-700">附件</p>
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">尚無附件</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li key={att.id}>
              {att.download_url ? (
                <a
                  href={att.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 break-all">
                    <span className="font-medium text-slate-800">
                      {att.file_name}
                    </span>
                    {att.file_size != null && att.file_size > 0 && (
                      <span className="ml-2 text-xs text-slate-500">
                        {formatFileSize(att.file_size)}
                      </span>
                    )}
                  </span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 text-slate-400" />
                  {att.file_name}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
