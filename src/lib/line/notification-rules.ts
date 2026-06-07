import { CS_DEPARTMENT } from "@/lib/constants";
import { hasAssignedDepartment } from "@/lib/case-department";
import {
  filterByDepartment,
  withLineUserId,
  uniqueLineUserIds,
} from "@/lib/line/recipients";
import type { Case, User } from "@/types";
import type { SessionUser } from "@/lib/auth/session";

export type NotificationActor = Pick<
  SessionUser,
  "id" | "name" | "role" | "department"
>;

function isCsOrAdmin(actor: NotificationActor): boolean {
  return actor.role === "admin" || actor.department?.trim() === CS_DEPARTMENT;
}

/**
 * 案件建立：有部門 → 該部門；無部門 → 業務部-客服
 */
export function resolveCaseCreatedRecipients(
  caseData: Case,
  activeUsers: User[]
): string[] {
  const pool = withLineUserId(activeUsers);

  if (hasAssignedDepartment(caseData.department)) {
    return uniqueLineUserIds(
      filterByDepartment(pool, caseData.department!.trim())
    );
  }

  return uniqueLineUserIds(filterByDepartment(pool, CS_DEPARTMENT));
}

/**
 * 指派部門：通知新指派部門的所有可推播使用者
 */
export function resolveDepartmentAssignedRecipients(
  caseData: Case,
  activeUsers: User[]
): string[] {
  if (!hasAssignedDepartment(caseData.department)) {
    return [];
  }

  return uniqueLineUserIds(
    filterByDepartment(withLineUserId(activeUsers), caseData.department!.trim())
  );
}

/**
 * 處理回覆：
 * - 非客服且非 admin → 通知客服部
 * - 客服或 admin → 通知案件目前部門（部門為空則不通知）
 */
export function resolveCaseRepliedRecipients(
  caseData: Case,
  actor: NotificationActor,
  activeUsers: User[]
): string[] {
  const pool = withLineUserId(activeUsers);

  if (!isCsOrAdmin(actor)) {
    return uniqueLineUserIds(filterByDepartment(pool, CS_DEPARTMENT));
  }

  if (!hasAssignedDepartment(caseData.department)) {
    return [];
  }

  return uniqueLineUserIds(
    filterByDepartment(pool, caseData.department!.trim())
  );
}

/**
 * 案件結案：僅通知建立者（需有 line_user_id）
 */
export function resolveCaseClosedRecipients(
  caseData: Case,
  activeUsers: User[]
): string[] {
  if (!caseData.created_by_id) {
    return [];
  }

  const creator =
    activeUsers.find((u) => u.id === caseData.created_by_id) ??
    caseData.created_by ??
    null;

  if (!creator?.line_user_id?.trim()) {
    return [];
  }

  return [creator.line_user_id.trim()];
}
