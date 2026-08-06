import type { UserRole } from "@/types";

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

/** 系統設定（僅 admin） */
export function canAccessSystemSettings(role: UserRole): boolean {
  return role === "admin";
}
