"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCase,
  updateCaseStatus,
  addCaseReply,
  uploadAttachment,
  getDefaultActorUserId,
} from "@/lib/data/cases";
import {
  notifyCaseCompleted,
  isLineConfigured,
} from "@/lib/line/notify";
import { getNextStatus } from "@/lib/constants";
import type { CreateCaseInput, UrgencyLevel } from "@/types";

export async function createCaseAction(formData: FormData) {
  const attachmentFiles = formData.getAll("attachments") as File[];
  const actorId = await getDefaultActorUserId();

  const attachmentUrls: string[] = [];
  for (const file of attachmentFiles) {
    if (file.size > 0) {
      try {
        const url = await uploadAttachment(file);
        attachmentUrls.push(url);
      } catch (err) {
        console.error("附件上傳失敗:", err);
      }
    }
  }

  const input: CreateCaseInput = {
    customer_name: (formData.get("customer_name") as string)?.trim(),
    customer_contact: (formData.get("customer_contact") as string)?.trim(),
    customer_gender: formData.get("customer_gender") as string,
    source: formData.get("source") as string,
    complaint_type: formData.get("complaint_type") as string,
    complaint_subtype: formData.get("complaint_subtype") as string,
    description: (formData.get("description") as string)?.trim(),
    urgency: formData.get("urgency") as UrgencyLevel,
    department: formData.get("department") as string,
    attachment_urls: attachmentUrls,
  };

  const newCase = await createCase(input, actorId);

  revalidatePath("/");
  revalidatePath("/cases");
  redirect(`/cases/${newCase.id}`);
}

export async function advanceCaseStatusAction(caseId: string) {
  const { getCaseById } = await import("@/lib/data/cases");
  const actorId = await getDefaultActorUserId();
  const current = await getCaseById(caseId);
  if (!current) return { error: "案件不存在" };

  const next = getNextStatus(current.status);
  if (!next) return { error: "無法推進狀態" };

  await updateCaseStatus(caseId, next, actorId);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/cases");
  return { success: true };
}

export async function closeCaseAction(caseId: string) {
  const actorId = await getDefaultActorUserId();
  await updateCaseStatus(caseId, "closed", actorId);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/cases");
  return { success: true };
}

export async function addReplyAction(caseId: string, content: string) {
  if (!content.trim()) return { error: "請輸入回覆內容" };

  const actorId = await getDefaultActorUserId();
  const result = await addCaseReply(caseId, actorId, content);

  if (!result.ok) {
    return { error: "更新案件狀態失敗，請稍後再試" };
  }

  if (isLineConfigured()) {
    const { getCaseById, getUsers } = await import("@/lib/data/cases");
    const caseData = await getCaseById(caseId);
    const users = await getUsers();
    const csUser = users.find((u) => u.role === "cs" && u.line_user_id);
    const handler = actorId ? users.find((u) => u.id === actorId) : null;

    if (caseData && csUser?.line_user_id) {
      await notifyCaseCompleted({
        caseNumber: caseData.case_number,
        csLineUserId: csUser.line_user_id,
        handlerName: handler?.name ?? "處理人",
      });
    }
  }

  revalidatePath(`/cases/${caseId}`);
  return {
    success: true,
    warning: result.logSaved ? undefined : "回覆已儲存至案件，但處理紀錄寫入失敗",
  };
}

export async function confirmCaseAction(caseId: string) {
  const actorId = await getDefaultActorUserId();
  await updateCaseStatus(caseId, "cs_confirming", actorId);
  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}
