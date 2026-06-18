export type AttachmentPreviewKind = "image" | "pdf" | "video" | "document";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov"]);

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/quicktime",
]);

export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "mp4",
  "mov",
]);

export function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isVideoFile(file: File): boolean {
  const ext = fileExtension(file.name);
  if (VIDEO_EXTENSIONS.has(ext)) return true;
  return file.type === "video/mp4" || file.type === "video/quicktime";
}

export function isVideoAttachment(att: {
  file_name: string;
  file_type?: string | null;
}): boolean {
  const ext = fileExtension(att.file_name);
  if (VIDEO_EXTENSIONS.has(ext)) return true;
  const ft = att.file_type ?? "";
  return ft === "video/mp4" || ft === "video/quicktime";
}

export function getMaxAttachmentSizeBytes(file: File): number {
  return isVideoFile(file)
    ? MAX_VIDEO_ATTACHMENT_SIZE_BYTES
    : MAX_ATTACHMENT_SIZE_BYTES;
}

export function isAllowedAttachmentFormat(file: File): boolean {
  if (file.type && ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) return true;
  return ALLOWED_ATTACHMENT_EXTENSIONS.has(fileExtension(file.name));
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size <= 0) {
    return `「${file.name}」檔案大小為 0，無法上傳。`;
  }

  if (!isAllowedAttachmentFormat(file)) {
    return `「${file.name}」格式不支援。僅支援圖片、PDF、Office 文件及 MP4/MOV 影片。`;
  }

  const maxSize = getMaxAttachmentSizeBytes(file);
  if (file.size > maxSize) {
    const limitLabel = isVideoFile(file) ? "50MB" : "10MB";
    return `「${file.name}」超過大小限制（${limitLabel}），目前為 ${formatAttachmentFileSize(file.size)}。`;
  }

  return null;
}

export function partitionAttachmentFiles(files: File[]): {
  accepted: File[];
  errors: string[];
} {
  const accepted: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const error = validateAttachmentFile(file);
    if (error) errors.push(error);
    else accepted.push(file);
  }

  return { accepted, errors };
}

export function isAllowedAttachmentFile(file: File): boolean {
  return validateAttachmentFile(file) === null;
}

export function getAttachmentContentType(file: File): string {
  if (file.type && ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) return file.type;
  const ext = fileExtension(file.name);
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return byExt[ext] ?? "application/octet-stream";
}

export function getAttachmentPreviewKind(file: File): AttachmentPreviewKind {
  if (isVideoFile(file)) return "video";
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
  if (isVideoAttachment(att)) return "影片";
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
  if (isVideoFile(file)) return "影片";
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
  "image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,video/mp4,video/quicktime,.mp4,.mov";

export const ATTACHMENT_HINT =
  "支援圖片、PDF、Office 文件及 MP4/MOV 影片，可多選上傳；圖片／文件單檔上限 10MB，影片單檔上限 50MB";
