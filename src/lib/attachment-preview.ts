export type AttachmentPreviewKind = "image" | "pdf" | "document";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function getAttachmentPreviewKind(file: File): AttachmentPreviewKind {
  const ext = fileExtension(file.name);
  if (
    IMAGE_EXTENSIONS.has(ext) ||
    (file.type.startsWith("image/") && file.type !== "image/svg+xml")
  ) {
    return "image";
  }
  if (ext === "pdf" || file.type === "application/pdf") return "pdf";
  return "document";
}

export function formatAttachmentFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isExcelFile(file: File): boolean {
  const ext = fileExtension(file.name);
  if (ext === "xls" || ext === "xlsx") return true;
  return (
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export function isExcelAttachment(att: {
  file_name: string;
  file_type?: string | null;
}): boolean {
  const ext = fileExtension(att.file_name);
  if (ext === "xls" || ext === "xlsx") return true;
  const ft = att.file_type ?? "";
  return (
    ft === "application/vnd.ms-excel" ||
    ft === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export function getStoredAttachmentTypeLabel(att: {
  file_name: string;
  file_type?: string | null;
}): string {
  if (isExcelAttachment(att)) return "Excel";
  const ext = fileExtension(att.file_name);
  const byExt: Record<string, string> = {
    jpg: "JPEG 圖片",
    jpeg: "JPEG 圖片",
    png: "PNG 圖片",
    gif: "GIF 圖片",
    webp: "WebP 圖片",
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
  };
  if (byExt[ext]) return byExt[ext];
  return att.file_type ?? (ext ? ext.toUpperCase() : "附件");
}

export function getAttachmentTypeLabel(file: File): string {
  if (isExcelFile(file)) return "Excel";
  const ext = fileExtension(file.name);
  const byExt: Record<string, string> = {
    jpg: "JPEG 圖片",
    jpeg: "JPEG 圖片",
    png: "PNG 圖片",
    gif: "GIF 圖片",
    webp: "WebP 圖片",
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
  };
  if (byExt[ext]) return byExt[ext];
  if (file.type) return file.type;
  return ext ? ext.toUpperCase() : "附件";
}

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  kind: AttachmentPreviewKind;
}

export function createPendingAttachment(file: File): PendingAttachment {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    kind: getAttachmentPreviewKind(file),
  };
}

export function revokePendingAttachment(item: PendingAttachment): void {
  URL.revokeObjectURL(item.previewUrl);
}

export function revokeAllPendingAttachments(items: PendingAttachment[]): void {
  items.forEach(revokePendingAttachment);
}

export function appendAttachmentsToFormData(
  formData: FormData,
  files: File[]
): void {
  for (const file of files) {
    formData.append("attachments", file);
  }
}

export const ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const ATTACHMENT_HINT =
  "支援圖片、PDF、Word、Excel，可多選。選擇後可預覽，送出表單後才會上傳。";
