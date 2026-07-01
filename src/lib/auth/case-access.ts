import type { SessionUser } from "@/lib/auth/session";
import { BUSINESS_HEAD_DEPARTMENT, CS_DEPARTMENT } from "@/lib/constants";
import type { Case } from "@/types";

const NO_ACCESS_CASE_ID = "00000000-0000-0000-0000-000000000000";

/** admin 或客服部：可查看全部案件 */
export function hasUnrestrictedCaseAccess(user: SessionUser): boolean {
  return hasFullCaseControl(user) || user.role === "boss" || isBusinessHeadViewer(user);
}

/** 可建立案件：admin、業務部-客服 */
export function canCreateCase(user: SessionUser): boolean {
  return hasFullCaseControl(user);
}

export function isBusinessHeadViewer(user: SessionUser): boolean {
  return (
    user.role === "manager" &&
    user.department?.trim() === BUSINESS_HEAD_DEPARTMENT
  );
}

/** 是否可查看單一案件 */
export function canViewCase(user: SessionUser, caseData: Case): boolean {
  if (hasUnrestrictedCaseAccess(user)) return true;

  const caseDept = caseData.department?.trim() || null;
  const userDept = user.department?.trim() || null;

  if (user.role === "manager") {
    return Boolean(userDept && caseDept && caseDept === userDept);
  }

  if (user.role === "user") {
    if (caseData.assignee_id === user.id) return true;
    if (userDept && caseDept && caseDept === userDept) return true;
  }

  return false;
}

/** 可更新／處理案件：與可查看範圍相同 */
export function canUpdateCase(user: SessionUser, caseData: Case): boolean {
  return canViewCase(user, caseData);
}

export type CaseVisibilityFilter =
  | { type: "all" }
  | { type: "none" }
  | { type: "department"; department: string }
  | { type: "assignee"; userId: string }
  | { type: "assignee_or_department"; userId: string; department: string };

/** 將使用者可見範圍轉為查詢條件 */
export function getCaseVisibilityFilter(user: SessionUser): CaseVisibilityFilter {
  if (hasUnrestrictedCaseAccess(user)) return { type: "all" };

  const userDept = user.department?.trim();

  if (user.role === "manager") {
    if (!userDept) return { type: "none" };
    return { type: "department", department: userDept };
  }

  if (user.role === "user") {
    if (userDept) {
      return { type: "assignee_or_department", userId: user.id, department: userDept };
    }
    return { type: "assignee", userId: user.id };
  }

  return { type: "none" };
}

export { NO_ACCESS_CASE_ID };

export interface CasePermissions {
  canEditCase: boolean;
  canReplyCase: boolean;
  canManageAttachments: boolean;
  canDeleteAttachment: boolean;
  canAdvanceWorkflow: boolean;
}

/** admin 或客服部：完整案件操作權限 */
export function hasFullCaseControl(user: SessionUser): boolean {
  return (
    user.role === "admin" ||
    user.department?.trim() === CS_DEPARTMENT
  );
}

export function getCasePermissions(
  user: SessionUser,
  caseData: Case
): CasePermissions {
  if (!canViewCase(user, caseData)) {
    return {
      canEditCase: false,
      canReplyCase: false,
      canManageAttachments: false,
      canDeleteAttachment: false,
      canAdvanceWorkflow: false,
    };
  }

  const full = hasFullCaseControl(user);
  const readOnly = user.role === "boss" || isBusinessHeadViewer(user);
  return {
    canEditCase: full,
    canReplyCase: !readOnly,
    canManageAttachments: !readOnly,
    canDeleteAttachment: full,
    canAdvanceWorkflow: full,
  };
}

export function canEditCase(user: SessionUser, caseData: Case): boolean {
  return getCasePermissions(user, caseData).canEditCase;
}

export function canReplyCase(user: SessionUser, caseData: Case): boolean {
  return getCasePermissions(user, caseData).canReplyCase;
}

export function canManageAttachments(user: SessionUser, caseData: Case): boolean {
  return getCasePermissions(user, caseData).canManageAttachments;
}

export function canDeleteAttachment(user: SessionUser, caseData: Case): boolean {
  return getCasePermissions(user, caseData).canDeleteAttachment;
}

export function canAdvanceWorkflow(user: SessionUser, caseData: Case): boolean {
  return getCasePermissions(user, caseData).canAdvanceWorkflow;
}
