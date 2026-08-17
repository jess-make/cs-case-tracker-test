import type { UserRole } from "@/types";
import { CS_DEPARTMENT } from "@/lib/constants";

type CaseTaxonomyPermissionUser = {
  role: UserRole;
  email?: string | null;
};

const CASE_TAXONOMY_MANAGER_EMAILS = new Set(["yuju.tseng@grevia.com.tw"]);

function normalizePermissionEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}
export {
  canCreateCase,
  canViewCase,
  canUpdateCase,
  hasUnrestrictedCaseAccess,
  hasFullCaseControl,
  getCaseVisibilityFilter,
  getCasePermissions,
  canEditCase,
  canReplyCase,
  canManageAttachments,
  canDeleteAttachment,
  canAdvanceWorkflow,
  canRevertWorkflow,
  canApproveCompensation,
  NO_ACCESS_CASE_ID,
} from "@/lib/auth/case-access";

export type { CasePermissions } from "@/lib/auth/case-access";

/** 使用者管理（僅 admin） */
export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

/** 案件來源／類別管理：admin 或指定管理者 */
export function canManageCaseTaxonomy(user: CaseTaxonomyPermissionUser): boolean {
  return (
    canManageUsers(user.role) ||
    CASE_TAXONOMY_MANAGER_EMAILS.has(normalizePermissionEmail(user.email))
  );
}

export function canUploadReturnExchangeCases(user: {
  role: UserRole;
  department?: string | null;
}): boolean {
  return (
    canManageUsers(user.role) ||
    user.department?.trim() === CS_DEPARTMENT
  );
}

/** 系統設定（僅 admin） */
export function canAccessSystemSettings(role: UserRole): boolean {
  return role === "admin";
}
