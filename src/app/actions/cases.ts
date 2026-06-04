"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCase,
  updateCase,
  updateCaseStatus,
  addCaseReply,
} from "@/lib/data/cases";
import {
  uploadAndRecordCaseAttachments,
  deleteCaseAttachments,
} from "@/lib/data/attachments";
import {
  requireActor,
  requireCreatePermission,
  requireUpdatePermission,
} from "@/lib/auth/actor";
import {
  notifyCaseCompleted,
  isLineConfigured,
} from "@/lib/line/notify";
import { getNextStatus } from "@/lib/case-status";
import type { CreateCaseInput, UrgencyLevel } from "@/types";
import { parseOptionalDepartment } from "@/lib/parse-form";

function parseCaseFormData(formData: FormData) {
  return {
    customer_name: (formData.get("customer_name") as string)?.trim(),
    customer_contact: (formData.get("customer_contact") as string)?.trim(),
    customer_gender: formData.get("customer_gender") as string,
    source: formData.get("source") as string,
    source_detail: formData.get("source_detail") as string,
    complaint_type: formData.get("complaint_type") as string,
    complaint_subtype: formData.get("complaint_subtype") as string,
    description: (formData.get("description") as string)?.trim(),
    urgency: formData.get("urgency") as UrgencyLevel,
    department: parseOptionalDepartment(formData.get("department")),
    ecommerce_order_no:
      (formData.get("ecommerce_order_no") as string)?.trim() || null,
  };
}

export async function createCaseAction(formData: FormData) {
  const actor = await requireCreatePermission();
  const attachmentFiles = formData.getAll("attachments") as File[];
  const actorId = actor.id;

  const input: CreateCaseInput = {
    ...parseCaseFormData(formData),
  };

  const newCase = await createCase(input, actorId);

  const filesToUpload = attachmentFiles.filter((f) => f.size > 0);
  if (filesToUpload.length > 0) {
    await uploadAndRecordCaseAttachments(newCase.id, filesToUpload, actorId);
  }

  revalidatePath("/");
  revalidatePath("/cases");
  redirect(`/cases/${newCase.id}`);
}

export async function updateCaseAction(caseId: string, formData: FormData) {
  const actor = await requireUpdatePermission();
  const actorId = actor.id;
  const input = parseCaseFormData(formData);
  const attachmentFiles = formData.getAll("attachments") as File[];
  const removeAttachmentIds = formData.getAll("remove_attachment_ids") as string[];

  const result = await updateCase(caseId, input, actorId);
  if (result.error) return { error: result.error };

  if (removeAttachmentIds.length > 0) {
    await deleteCaseAttachments(caseId, removeAttachmentIds);
  }

  const filesToUpload = attachmentFiles.filter((f) => f.size > 0);
  if (filesToUpload.length > 0) {
    await uploadAndRecordCaseAttachments(caseId, filesToUpload, actorId);
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/cases");
  return { success: true, unchanged: result.unchanged };
}

export async function advanceCaseStatusAction(caseId: string) {
  const { getCaseById } = await import("@/lib/data/cases");
  const actor = await requireActor();
  const actorId = actor.id;
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
  const actor = await requireActor();
  const actorId = actor.id;
  await updateCaseStatus(caseId, "closed", actorId);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/cases");
  return { success: true };
}

export async function addReplyAction(caseId: string, content: string) {
  if (!content.trim()) return { error: "請輸入回覆內容" };

  const actor = await requireActor();
  const actorId = actor.id;
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
  const actor = await requireActor();
  const actorId = actor.id;
  await updateCaseStatus(caseId, "cs_confirming", actorId);
  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}
