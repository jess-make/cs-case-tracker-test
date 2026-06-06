import type { UserRole } from "@/types";
export {
  canCreateCase,
  canViewCase,
  canUpdateCase,
  hasUnrestrictedCaseAccess,
  getCaseVisibilityFilter,
  NO_ACCESS_CASE_ID,
} from "@/lib/auth/case-access";

/** 使用者管理（僅 admin） */
export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

/** 系統設定（僅 admin） */
export function canAccessSystemSettings(role: UserRole): boolean {
  return role === "admin";
}
