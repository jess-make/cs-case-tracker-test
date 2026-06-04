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

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\u4e00-\u9fff ]+/g, "_").slice(0, 200);
}

function isAllowedFile(file: File): boolean {
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) return false;
  if (ALLOWED_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"].includes(
    ext ?? ""
  );
}

function contentTypeForUpload(file: File): string | undefined {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
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
  return ext ? byExt[ext] : undefined;
}

function normalizeAttachmentRow(raw: Record<string, unknown>): CaseAttachment {
  return {
    id: String(raw.id ?? ""),
    case_id: String(raw.case_id ?? ""),
    file_name: String(raw.file_name ?? "附件"),
    file_path: String(raw.file_path ?? ""),
    file_type: (raw.file_type as string | null) ?? null,
    file_size:
      raw.file_size != null ? Number(raw.file_size) : null,
    uploaded_by_id: (raw.uploaded_by_id as string | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

export async function uploadAndRecordCaseAttachments(
  caseId: string,
  files: File[],
  uploadedById: string | null
): Promise<CaseAttachment[]> {
  const validFiles = files.filter(isAllowedFile);
  if (validFiles.length === 0) return [];

  const client = await supabase();
  const saved: CaseAttachment[] = [];

  for (const file of validFiles) {
    const attachmentId = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const filePath = `${caseId}/${attachmentId}.${ext}`;

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: contentTypeForUpload(file),
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadCaseAttachment]", uploadError.message);
      continue;
    }

    const { data, error: insertError } = await client
      .from("case_attachments")
      .insert({
        id: attachmentId,
        case_id: caseId,
        file_name: sanitizeFileName(file.name),
        file_path: filePath,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by_id: uploadedById,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[case_attachments insert]", insertError.message);
      await client.storage.from(BUCKET).remove([filePath]);
      continue;
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
    return;
  }

  if (!rows?.length) return;

  const paths = rows.map((r) => r.file_path as string).filter(Boolean);

  if (paths.length > 0) {
    const { error: storageError } = await client.storage
      .from(BUCKET)
      .remove(paths);
    if (storageError) {
      console.error("[deleteCaseAttachments storage]", storageError.message);
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
  }
}

async function attachSignedUrls(
  attachments: CaseAttachment[]
): Promise<CaseAttachment[]> {
  if (attachments.length === 0) return [];

  const client = await supabase();

  return Promise.all(
    attachments.map(async (att) => {
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(att.file_path, SIGNED_URL_EXPIRES_SEC);

      if (error) {
        console.error("[createSignedUrl]", error.message);
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
