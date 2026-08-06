import type { UserRole } from "@/types";

type CaseTaxonomyPermissionUser = {
  role: UserRole;
  name?: string | null;
};

const CASE_TAXONOMY_MANAGER_NAMES = new Set(["曾郁茹"]);

function normalizePermissionName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s+/g, "");
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
    CASE_TAXONOMY_MANAGER_NAMES.has(normalizePermissionName(user.name))
  );
}

/** 系統設定（僅 admin） */
export function canAccessSystemSettings(role: UserRole): boolean {
  return role === "admin";
}
