import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { getCaseStatusLabel } from "@/lib/case-status";
import type { CaseStatus } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

/** 寫入案件處理紀錄 */
export async function createCaseLog(
  caseId: string,
  userId: string | null,
  action: string,
  content: string
): Promise<boolean> {
  const trimmed = content.trim();
  if (!trimmed) {
    console.error("[createCaseLog] content 不可為空", { caseId, action });
    return false;
  }

  const { error } = await (await supabase()).from("case_logs").insert({
    case_id: caseId,
    user_id: userId,
    action,
    content: trimmed,
  });

  if (error) {
    console.error("[createCaseLog]", action, error.message);
    return false;
  }
  return true;
}

export function formatFileNameList(
  prefix: string,
  fileNames: string[]
): string {
  const names = fileNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return prefix;
  return `${prefix}\n${names.map((n) => `- ${n}`).join("\n")}`;
}

export function buildCaseCreatedContent(attachmentFileNames: string[] = []): string {
  let content = "客服建立新案件";
  if (attachmentFileNames.length > 0) {
    content += `\n並上傳附件：\n${attachmentFileNames.map((n) => `- ${n}`).join("\n")}`;
  }
  return content;
}

export function buildStatusChangeContent(status: CaseStatus | string): string {
  return `狀態變更為：${getCaseStatusLabel(String(status))}`;
}

export async function logAttachmentsAdded(
  caseId: string,
  userId: string | null,
  fileNames: string[]
): Promise<boolean> {
  if (fileNames.length === 0) return true;
  return createCaseLog(
    caseId,
    userId,
    "附件新增",
    formatFileNameList("新增附件：", fileNames)
  );
}

export async function logAttachmentsDeleted(
  caseId: string,
  userId: string | null,
  fileNames: string[]
): Promise<boolean> {
  if (fileNames.length === 0) return true;
  return createCaseLog(
    caseId,
    userId,
    "附件刪除",
    formatFileNameList("刪除附件：", fileNames)
  );
}

export async function logCaseCreated(
  caseId: string,
  userId: string | null,
  attachmentFileNames: string[] = []
): Promise<boolean> {
  return createCaseLog(
    caseId,
    userId,
    "建立案件",
    buildCaseCreatedContent(attachmentFileNames)
  );
}

export async function logCaseEdited(
  caseId: string,
  userId: string | null,
  summary: string
): Promise<boolean> {
  return createCaseLog(caseId, userId, "編輯案件", summary);
}

export async function logStatusChange(
  caseId: string,
  userId: string | null,
  status: CaseStatus | string
): Promise<boolean> {
  return createCaseLog(
    caseId,
    userId,
    "狀態更新",
    buildStatusChangeContent(status)
  );
}

export async function logCaseReply(
  caseId: string,
  userId: string | null,
  replyContent: string
): Promise<boolean> {
  return createCaseLog(caseId, userId, "處理回覆", replyContent.trim());
}

/** @deprecated 請改用 createCaseLog */
export const addCaseLog = createCaseLog;
