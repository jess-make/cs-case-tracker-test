import { hasAssignedDepartment } from "@/lib/case-department";
import { normalizeCaseStatus } from "@/lib/case-status";
import { getPresetRange, toCreatedAtBounds } from "@/lib/date-range";
import type { Case, DashboardStats } from "@/types";

export const DASHBOARD_CASE_FILTERS = [
  "month",
  "unassigned",
  "in_progress",
  "pending_close",
  "closed",
] as const;

export type DashboardCaseFilter = (typeof DASHBOARD_CASE_FILTERS)[number];

function isDashboardCaseFilter(value: string): value is DashboardCaseFilter {
  return DASHBOARD_CASE_FILTERS.includes(value as DashboardCaseFilter);
}

export function parseDashboardCaseFilter(
  value: string | undefined
): DashboardCaseFilter | null {
  return value && isDashboardCaseFilter(value) ? value : null;
}

function isCreatedWithin(c: Case, from: Date, to: Date): boolean {
  const createdAt = new Date(c.created_at).getTime();
  if (!Number.isFinite(createdAt)) return false;

  const bounds = toCreatedAtBounds(from, to);
  return (
    createdAt >= new Date(bounds.from).getTime() &&
    createdAt <= new Date(bounds.to).getTime()
  );
}

export function getCurrentMonthCases(cases: Case[]): Case[] {
  const { from, to } = getPresetRange("month");
  return cases.filter((c) => isCreatedWithin(c, from, to));
}

export function getPreviousMonthCases(cases: Case[]): Case[] {
  const { from, to } = getPresetRange("last_month");
  return cases.filter((c) => isCreatedWithin(c, from, to));
}

export function getDashboardCases(
  cases: Case[],
  filter: DashboardCaseFilter
): Case[] {
  switch (filter) {
    case "month":
      return getCurrentMonthCases(cases);
    case "unassigned":
      return cases.filter((c) => !hasAssignedDepartment(c.department));
    case "in_progress":
      return cases.filter((c) =>
        ["in_progress", "replied"].includes(normalizeCaseStatus(c.status))
      );
    case "pending_close":
      return cases.filter((c) => normalizeCaseStatus(c.status) === "cs_confirming");
    case "closed":
      return cases.filter((c) => normalizeCaseStatus(c.status) === "closed");
  }
}

export function buildDashboardStats(cases: Case[]): DashboardStats {
  const currentMonth = getCurrentMonthCases(cases).length;
  const previousMonth = getPreviousMonthCases(cases).length;

  return {
    currentMonth,
    previousMonth,
    monthDelta: currentMonth - previousMonth,
    unassigned: getDashboardCases(cases, "unassigned").length,
    inProgress: getDashboardCases(cases, "in_progress").length,
    pendingClose: getDashboardCases(cases, "pending_close").length,
    closed: getDashboardCases(cases, "closed").length,
  };
}
