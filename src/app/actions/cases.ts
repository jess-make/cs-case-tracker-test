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
  requireCaseEditPermission,
  requireCaseReplyPermission,
  requireCaseAttachmentUploadPermission,
  requireCaseWorkflowPermission,
} from "@/lib/auth/actor";
import {
  canDeleteAttachment,
} from "@/lib/auth/case-access";
import {
  notifyCaseCreated,
  notifyCaseClosed,
  notifyCaseReplied,
  notifyDepartmentAssigned,
} from "@/lib/line/case-notifications";
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

    await notifyCaseCreated(newCase);

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
    const { user: actor, caseData } = await requireCaseEditPermission(caseId);
    const actorId = actor.id;
    const input = parseCaseFormData(formData);
    const attachmentFiles = getAttachmentFilesFromFormData(formData);
    const removeAttachmentIds = formData.getAll(
      "remove_attachment_ids"
    ) as string[];

    if (
      removeAttachmentIds.length > 0 &&
      !canDeleteAttachment(actor, caseData)
    ) {
      return { error: "無權限刪除附件" };
    }

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

    if (result.departmentAssigned && result.case) {
      await notifyDepartmentAssigned(result.case);
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

export async function uploadCaseAttachmentsAction(
  caseId: string,
  formData: FormData
) {
  try {
    const { user: actor } = await requireCaseAttachmentUploadPermission(caseId);
    const actorId = actor.id;
    const attachmentFiles = getAttachmentFilesFromFormData(formData);

    if (attachmentFiles.length === 0) {
      return { error: "請選擇要上傳的附件" };
    }

    const uploaded = await uploadAndRecordCaseAttachments(
      caseId,
      attachmentFiles,
      actorId
    );
    const uploadedNames = uploaded.map((a) => a.file_name);
    if (uploadedNames.length > 0) {
      await logAttachmentsAdded(caseId, actorId, uploadedNames);
    }

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/");
    revalidatePath("/cases");
    return { success: true };
  } catch (err) {
    if (err instanceof AttachmentError) {
      return { error: err.message };
    }
    console.error("[uploadCaseAttachmentsAction]", err);
    return {
      error:
        err instanceof Error ? err.message : "上傳附件失敗，請稍後再試",
    };
  }
}

export async function advanceCaseStatusAction(caseId: string) {
  const { getCaseById } = await import("@/lib/data/cases");
  const { user: actor } = await requireCaseWorkflowPermission(caseId);
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
  const { user: actor } = await requireCaseWorkflowPermission(caseId);
  const actorId = actor.id;
  const closedCase = await updateCaseStatus(caseId, "closed", actorId);
  if (closedCase) {
    await notifyCaseClosed(closedCase);
  }
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  revalidatePath("/cases");
  return { success: true };
}

export async function addReplyAction(caseId: string, formData: FormData) {
  const content = (formData.get("content") as string)?.trim() ?? "";
  if (!content) return { error: "請輸入處理說明後再送出。" };

  try {
    const { user: actor } = await requireCaseReplyPermission(caseId);
    const actorId = actor.id;
    const attachmentFiles = getAttachmentFilesFromFormData(formData);

    if (attachmentFiles.length > 0) {
      await requireCaseAttachmentUploadPermission(caseId);
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

    const result = await addCaseReply(caseId, actorId, content);

    if (!result.ok) {
      return { error: "更新案件狀態失敗，請稍後再試" };
    }

    const { getCaseById } = await import("@/lib/data/cases");
    const caseData = await getCaseById(caseId, actor);
    if (caseData) {
      await notifyCaseReplied(caseData, actor, content);
    }

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/");
    revalidatePath("/cases");
    return {
      success: true,
      warning: result.logSaved
        ? undefined
        : "回覆已儲存至案件，但處理紀錄寫入失敗",
    };
  } catch (err) {
    if (err instanceof AttachmentError) {
      return { error: err.message };
    }
    console.error("[addReplyAction]", err);
    return {
      error:
        err instanceof Error ? err.message : "送出回覆失敗，請稍後再試",
    };
  }
}

export async function confirmCaseAction(caseId: string) {
  const { user: actor } = await requireCaseWorkflowPermission(caseId);
  const actorId = actor.id;
  await updateCaseStatus(caseId, "cs_confirming", actorId);
  revalidatePath(`/cases/${caseId}`);
  return { success: true };
}
