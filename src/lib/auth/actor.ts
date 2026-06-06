import { requireUser } from "@/lib/auth/session";
import { canCreateCase, canManageUsers } from "@/lib/auth/permissions";
import { canViewCase } from "@/lib/auth/case-access";
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

export async function requireCaseUpdatePermission(
  caseId: string
): Promise<{ user: SessionUser; caseData: Case }> {
  return requireCaseViewPermission(caseId);
}

export async function requireManageUsersPermission(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canManageUsers(user.role)) {
    throw new Error("無權限管理使用者");
  }
  return user;
}

export { canViewCase };