import type { CaseStatus } from "@/types";
import {
  CASE_FLOW_STEPS,
  getCaseStatusLabel,
  normalizeCaseStatus,
} from "@/lib/case-status";

type DisplayCase = {
  status: CaseStatus | string;
  department: string | null;
};

export type CaseFlowDisplayStep = {
  key: string;
  status: CaseStatus;
  label: string;
  active: boolean;
};

function normalizeDepartment(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeAssignmentPlan(assignmentPlan?: readonly string[]): string[] {
  const departments: string[] = [];
  for (const rawDepartment of assignmentPlan ?? []) {
    const department = normalizeDepartment(rawDepartment);
    if (department && !departments.includes(department)) {
      departments.push(department);
    }
  }
  return departments;
}

export function hasMultiDepartmentAssignment(
  assignmentPlan?: readonly string[]
): boolean {
  return normalizeAssignmentPlan(assignmentPlan).length > 1;
}

export function getCaseStatusDisplayLabel(
  caseData: DisplayCase,
  assignmentPlan?: readonly string[]
): string {
  const status = normalizeCaseStatus(String(caseData.status));
  const department = normalizeDepartment(caseData.department);

  if (
    status === "in_progress" &&
    department &&
    hasMultiDepartmentAssignment(assignmentPlan)
  ) {
    return `${getCaseStatusLabel(status)}：${department}`;
  }

  return getCaseStatusLabel(status);
}

export function getCaseFlowDisplaySteps(
  caseData: DisplayCase,
  assignmentPlan?: readonly string[]
): CaseFlowDisplayStep[] {
  const status = normalizeCaseStatus(String(caseData.status));
  const currentDepartment = normalizeDepartment(caseData.department);
  const planDepartments = normalizeAssignmentPlan(assignmentPlan);

  if (planDepartments.length <= 1) {
    return CASE_FLOW_STEPS.map((step) => ({
      key: step,
      status: step,
      label: getCaseStatusLabel(step),
      active: status === step,
    }));
  }

  const inProgressDepartments =
    status === "in_progress" &&
    currentDepartment &&
    !planDepartments.includes(currentDepartment)
      ? [...planDepartments, currentDepartment]
      : planDepartments;

  return [
    {
      key: "new",
      status: "new",
      label: getCaseStatusLabel("new"),
      active: status === "new",
    },
    ...inProgressDepartments.map((department, index) => ({
      key: `in_progress-${index}-${department}`,
      status: "in_progress" as const,
      label: `${getCaseStatusLabel("in_progress")}：${department}`,
      active: status === "in_progress" && currentDepartment === department,
    })),
    {
      key: "replied",
      status: "replied",
      label: getCaseStatusLabel("replied"),
      active: status === "replied",
    },
    {
      key: "cs_confirming",
      status: "cs_confirming",
      label: getCaseStatusLabel("cs_confirming"),
      active: status === "cs_confirming",
    },
    {
      key: "closed",
      status: "closed",
      label: getCaseStatusLabel("closed"),
      active: status === "closed",
    },
  ];
}

