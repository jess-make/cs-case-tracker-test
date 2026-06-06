import { requireUser } from "@/lib/auth/session";
import { canCreateCase, canManageUsers } from "@/lib/auth/permissions";
import {
  canViewCase,
  canEditCase,
  canReplyCase,
  canManageAttachments,
  canDeleteAttachment,
  canAdvanceWorkflow,
} from "@/lib/auth/case-access";
import { getCaseById } from "@/lib/data/cases";
import type { SessionUser } from "@/lib/auth/session";
import type { Case } from "@/types";

export async function requireActor(): Promise<SessionUser> {
  return requireUser();
}

export async function requireCreatePermission(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canCreateCase(user)) {
    throw new Error("無權限建立案件");
  }
  return user;
}

export async function requireCaseViewPermission(
  caseId: string
): Promise<{ user: SessionUser; caseData: Case }> {
  const user = await requireUser();
  const caseData = await getCaseById(caseId, user);
  if (!caseData) {
    throw new Error("無權限存取此案件");
  }
  return { user, caseData };
}

async function requireCaseCapability(
  caseId: string,
  check: (user: SessionUser, caseData: Case) => boolean,
  errorMessage: string
): Promise<{ user: SessionUser; caseData: Case }> {
  const ctx = await requireCaseViewPermission(caseId);
  if (!check(ctx.user, ctx.caseData)) {
    throw new Error(errorMessage);
  }
  return ctx;
}

export async function requireCaseEditPermission(caseId: string) {
  return requireCaseCapability(caseId, canEditCase, "無權限編輯案件");
}

export async function requireCaseReplyPermission(caseId: string) {
  return requireCaseCapability(caseId, canReplyCase, "無權限回覆案件");
}

export async function requireCaseAttachmentUploadPermission(caseId: string) {
  return requireCaseCapability(
    caseId,
    canManageAttachments,
    "無權限上傳附件"
  );
}

export async function requireCaseWorkflowPermission(caseId: string) {
  return requireCaseCapability(
    caseId,
    canAdvanceWorkflow,
    "無權限變更案件流程"
  );
}

/** @deprecated 請改用細分權限函式 */
export async function requireCaseUpdatePermission(caseId: string) {
  return requireCaseViewPermission(caseId);
}

export async function requireManageUsersPermission(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageUsers(user.role)) {
    throw new Error("無權限管理使用者");
  }
  return user;
}

export {
  canViewCase,
  canEditCase,
  canReplyCase,
  canManageAttachments,
  canDeleteAttachment,
  canAdvanceWorkflow,
};
