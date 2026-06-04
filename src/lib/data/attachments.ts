import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import type { CaseAttachment } from "@/types";

const BUCKET = "case-attachments";
const SIGNED_URL_EXPIRES_SEC = 3600;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
]);

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\u4e00-\u9fff ]+/g, "_").slice(0, 200);
}

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedAttachmentFile(file: File): boolean {
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) return false;
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return true;
  return ALLOWED_EXTENSIONS.has(fileExtension(file.name));
}

function contentTypeForUpload(file: File): string {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
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
  };
  return byExt[ext] ?? "application/octet-stream";
}

/** 從 FormData 取出有效 File（Server Action 環境） */
export function getAttachmentFilesFromFormData(formData: FormData): File[] {
  return formData
    .getAll("attachments")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function normalizeAttachmentRow(raw: Record<string, unknown>): CaseAttachment {
  return {
    id: String(raw.id ?? ""),
    case_id: String(raw.case_id ?? ""),
    file_name: String(raw.file_name ?? "附件"),
    file_path: String(raw.file_path ?? ""),
    file_type: (raw.file_type as string | null) ?? null,
    file_size: raw.file_size != null ? Number(raw.file_size) : null,
    uploaded_by_id: (raw.uploaded_by_id as string | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

export async function uploadAndRecordCaseAttachments(
  caseId: string,
  files: File[],
  uploadedById: string | null
): Promise<CaseAttachment[]> {
  if (files.length === 0) return [];

  const validFiles = files.filter(isAllowedAttachmentFile);
  if (validFiles.length === 0) {
    throw new AttachmentError(
      "附件格式或大小不符合（支援圖片、PDF、Word，單檔最大 10MB）"
    );
  }

  if (validFiles.length < files.length) {
    console.error(
      "[uploadAndRecordCaseAttachments] 部分檔案被略過：格式或大小不符"
    );
  }

  const client = await supabase();
  const saved: CaseAttachment[] = [];

  for (const file of validFiles) {
    const attachmentId = crypto.randomUUID();
    const ext = fileExtension(file.name) || "bin";
    const filePath = `${caseId}/${attachmentId}.${ext}`;

    let body: Buffer;
    try {
      body = await fileToBuffer(file);
    } catch (err) {
      console.error("[uploadCaseAttachment] read file", err);
      throw new AttachmentError(`讀取檔案「${file.name}」失敗`);
    }

    const contentType = contentTypeForUpload(file);

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(filePath, body, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadCaseAttachment]", file.name, uploadError.message);
      throw new AttachmentError(
        `上傳「${file.name}」至 Storage 失敗：${uploadError.message}`
      );
    }

    const { data, error: insertError } = await client
      .from("case_attachments")
      .insert({
        id: attachmentId,
        case_id: caseId,
        file_name: sanitizeFileName(file.name),
        file_path: filePath,
        file_type: contentType,
        file_size: file.size,
        uploaded_by_id: uploadedById,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[case_attachments insert]", file.name, insertError.message);
      await client.storage.from(BUCKET).remove([filePath]);
      throw new AttachmentError(
        `寫入附件紀錄「${file.name}」失敗：${insertError.message}`
      );
    }

    saved.push(normalizeAttachmentRow(data as Record<string, unknown>));
  }

  return saved;
}

/** 刪除案件附件（Storage 物件 + DB 紀錄） */
export async function deleteCaseAttachments(
  caseId: string,
  attachmentIds: string[]
): Promise<void> {
  const ids = attachmentIds.filter(
    (id) => id?.trim() && !id.startsWith("legacy-")
  );
  if (ids.length === 0) return;

  const client = await supabase();

  const { data: rows, error: selectError } = await client
    .from("case_attachments")
    .select("id, file_path")
    .eq("case_id", caseId)
    .in("id", ids);

  if (selectError) {
    console.error("[deleteCaseAttachments select]", selectError.message);
    throw new AttachmentError(`讀取附件紀錄失敗：${selectError.message}`);
  }

  if (!rows?.length) return;

  const paths = rows.map((r) => r.file_path as string).filter(Boolean);

  if (paths.length > 0) {
    const { error: storageError } = await client.storage
      .from(BUCKET)
      .remove(paths);
    if (storageError) {
      console.error("[deleteCaseAttachments storage]", storageError.message);
      throw new AttachmentError(
        `刪除 Storage 檔案失敗：${storageError.message}`
      );
    }
  }

  const { error: deleteError } = await client
    .from("case_attachments")
    .delete()
    .eq("case_id", caseId)
    .in(
      "id",
      rows.map((r) => r.id as string)
    );

  if (deleteError) {
    console.error("[deleteCaseAttachments]", deleteError.message);
    throw new AttachmentError(`刪除附件紀錄失敗：${deleteError.message}`);
  }
}

async function attachSignedUrls(
  attachments: CaseAttachment[]
): Promise<CaseAttachment[]> {
  if (attachments.length === 0) return [];

  const client = await supabase();

  return Promise.all(
    attachments.map(async (att) => {
      if (att.id.startsWith("legacy-")) {
        return { ...att, download_url: att.file_path };
      }

      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(att.file_path, SIGNED_URL_EXPIRES_SEC);

      if (error) {
        console.error("[createSignedUrl]", att.file_path, error.message);
        return { ...att, download_url: null };
      }

      return { ...att, download_url: data.signedUrl };
    })
  );
}

/** 取得案件附件（含 signed URL） */
export async function getCaseAttachments(
  caseId: string
): Promise<CaseAttachment[]> {
  try {
    const { data, error } = await (await supabase())
      .from("case_attachments")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getCaseAttachments]", error.message);
      return [];
    }

    const rows = (data ?? []).map((row) =>
      normalizeAttachmentRow(row as Record<string, unknown>)
    );
    return attachSignedUrls(rows);
  } catch (err) {
    console.error("[getCaseAttachments]", err);
    return [];
  }
}

/** 舊版 cases.attachment_urls 轉為可顯示項目（相容） */
export function legacyAttachmentsFromUrls(
  caseId: string,
  urls: string[]
): CaseAttachment[] {
  return urls
    .filter((url) => url?.trim())
    .map((url, index) => {
      const segment = url.split("/").pop() ?? `附件 ${index + 1}`;
      return {
        id: `legacy-${index}`,
        case_id: caseId,
        file_name: decodeURIComponent(segment.split("?")[0]),
        file_path: url,
        file_type: null,
        file_size: null,
        uploaded_by_id: null,
        created_at: "",
        download_url: url,
      };
    });
}
