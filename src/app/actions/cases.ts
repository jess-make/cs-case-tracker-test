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
  getAttachmentFilesFromFormData,
  AttachmentError,
} from "@/lib/data/attachments";
import {
  logCaseCreated,
  logAttachmentsAdded,
  logAttachmentsDeleted,
} from "@/lib/data/case-logs";
import {
  requireCreatePermission,
  requireCaseUpdatePermission,
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

export async function createCaseAction(
  formData: FormData
): Promise<{ error?: string } | void> {
  try {
    const actor = await requireCreatePermission();
    const actorId = actor.id;
    const attachmentFiles = getAttachmentFilesFromFormData(formData);

    const input: CreateCaseInput = {
      ...parseCaseFormData(formData),
    };

    const newCase = await createCase(input, actorId);

    let uploadedNames: string[] = [];
    if (attachmentFiles.length > 0) {
      const uploaded = await uploadAndRecordCaseAttachments(
        newCase.id,
        attachmentFiles,
        actorId
      );
      uploadedNames = uploaded.map((a) => a.file_name);
    }

    await logCaseCreated(newCase.id, actorId, uploadedNames);
    if (uploadedNames.length > 0) {
      await logAttachmentsAdded(newCase.id, actorId, uploadedNames);
    }

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath(`/cases/${newCase.id}`);
    redirect(`/cases/${newCase.id}`);
  } catch (err) {
    if (err instanceof AttachmentError) {
      return { error: err.message };
    }
    if (err && typeof err === "object" && "digest" in err) {
      const digest = String((err as { digest?: string }).digest ?? "");
      if (digest.startsWith("NEXT_REDIRECT")) throw err;
    }
    console.error("[createCaseAction]", err);
    return {
      error:
        err instanceof Error ? err.message : "建立案件失敗，請稍後再試",
    };
  }
}

export async function updateCaseAction(caseId: string, formData: FormData) {
  try {
    const { user: actor } = await requireCaseUpdatePermission(caseId);
    const actorId = actor.id;
    const input = parseCaseFormData(formData);
    const attachmentFiles = getAttachmentFilesFromFormData(formData);
    const removeAttachmentIds = formData.getAll(
      "remove_attachment_ids"
    ) as string[];

    const result = await updateCase(caseId, input, actorId);
    if (result.error) return { error: result.error };

    if (removeAttachmentIds.length > 0) {
      const deletedNames = await deleteCaseAttachments(
        caseId,
        removeAttachmentIds
      );
      if (deletedNames.length > 0) {
        await logAttachmentsDeleted(caseId, actorId, deletedNames);
      }
    }

    if (attachmentFiles.length > 0) {
      const uploaded = await uploadAndRecordCaseAttachments(
        caseId,
        attachmentFiles,
        actorId
      );
      const uploadedNames = uploaded.map((a) => a.file_name);
      if (uploadedNames.length > 0) {
        await logAttachmentsAdded(caseId, actorId, uploadedNames);
      }
    }

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/");
    revalidatePath("/cases");
    return { success: true, unchanged: result.unchanged };
  } catch (err) {
    if (err instanceof AttachmentError) {
      return { error: err.message };
    }
    console.error("[updateCaseAction]", err);
    return {
      error:
        err instanceof Error ? err.message : "更新案件失敗，請稍後再試",
    };
  }
}

export async function advanceCaseStatusAction(caseId: string) {
  const { getCaseById } = await import("@/lib/data/cases");
  const { user: actor } = await requireCaseUpdatePermission(caseId);
  const actorId = actor.id;
  const current = await getCaseById(caseId, actor);
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
  const { user: actor } = await requireCaseUpdatePermission(caseId);
  const actorId = actor.id;
  await updateCaseStatus(caseId, "closed", actorId);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/cases");
  return { success: true };
}

export async function addReplyAction(caseId: string, content: string) {
  if (!content.trim()) return { error: "請輸入回覆內容" };

  const { user: actor } = await requireCaseUpdatePermission(caseId);
  const actorId = actor.id;
  const result = await addCaseReply(caseId, actorId, content);

  if (!result.ok) {
    return { error: "更新案件狀態失敗，請稍後再試" };
  }

  if (isLineConfigured()) {
    const { getCaseById, getUsers } = await import("@/lib/data/cases");
    const caseData = await getCaseById(caseId, actor);
    const users = await getUsers();
    const notifyUser =
      users.find((u) => u.role === "user" && u.line_user_id) ??
      users.find((u) => u.line_user_id);
    const actorUser = users.find((u) => u.id === actorId);

    if (caseData && notifyUser?.line_user_id) {
      await notifyCaseCompleted({
        caseNumber: caseData.case_number,
        csLineUserId: notifyUser.line_user_id,
        handlerName: actorUser?.name ?? actor.name ?? "處理人",
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
  const { user: actor } = await requireCaseUpdatePermission(caseId);
  const actorId = actor.id;
  await updateCaseStatus(caseId, "cs_confirming", actorId);
  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}
