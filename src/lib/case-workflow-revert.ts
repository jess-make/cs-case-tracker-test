import { getAutoAssignmentPlan } from "@/lib/case-auto-assignment";
import {
  getCaseStatusLabel,
  getPreviousStatus,
  normalizeCaseStatus,
} from "@/lib/case-status";
import { CS_DEPARTMENT } from "@/lib/constants";
import type { CaseStatus } from "@/types";

type RevertableCase = {
  status: CaseStatus | string;
  department: string | null;
  complaint_type: string;
  complaint_subtype: string | null;
};

export type CaseWorkflowRevertTarget = {
  status: CaseStatus;
  department: string | null;
  statusChanged: boolean;
  departmentChanged: boolean;
};

function normalizeDepartment(value: string | null | undefined): string | null {
  const department = value?.trim();
  return department || null;
}

function makeTarget(
  caseData: RevertableCase,
  status: CaseStatus,
  department: string | null
): CaseWorkflowRevertTarget {
  const currentStatus = normalizeCaseStatus(String(caseData.status));
  const currentDepartment = normalizeDepartment(caseData.department);
  const nextDepartment = normalizeDepartment(department);

  return {
    status,
    department: nextDepartment,
    statusChanged: currentStatus !== status,
    departmentChanged: currentDepartment !== nextDepartment,
  };
}

export function getCaseWorkflowRevertTarget(
  caseData: RevertableCase
): CaseWorkflowRevertTarget | null {
  const status = normalizeCaseStatus(String(caseData.status));
  const department = normalizeDepartment(caseData.department);
  const assignmentPlan = getAutoAssignmentPlan(
    caseData.complaint_type,
    caseData.complaint_subtype
  );

  if (
    status === "replied" &&
    department === CS_DEPARTMENT &&
    assignmentPlan.length > 0
  ) {
    return makeTarget(
      caseData,
      "in_progress",
      assignmentPlan[assignmentPlan.length - 1] ?? null
    );
  }

  if (status === "in_progress" && department) {
    const departmentIndex = assignmentPlan.indexOf(department);
    if (departmentIndex > 0) {
      return makeTarget(caseData, "in_progress", assignmentPlan[departmentIndex - 1]);
    }
    if (departmentIndex === 0) {
      return makeTarget(caseData, "new", null);
    }
  }

  const previousStatus = getPreviousStatus(status);
  if (!previousStatus) return null;

  return makeTarget(caseData, previousStatus, department);
}

export function getCaseWorkflowRevertTargetLabel(
  target: CaseWorkflowRevertTarget
): string {
  const statusLabel = getCaseStatusLabel(target.status);
  if (!target.departmentChanged) return statusLabel;
  return `${statusLabel}／${target.department ?? "不需指派"}`;
}
