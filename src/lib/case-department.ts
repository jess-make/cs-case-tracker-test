/** 是否已選擇指派部門（非「暫不指派」） */
export function hasAssignedDepartment(
  department: string | null | undefined
): boolean {
  return Boolean(department?.trim());
}

import { CS_DEPARTMENT } from "@/lib/constants";

/** 案件列表篩選：暫未指派部門的 query 值 */
export const DEPARTMENT_FILTER_UNASSIGNED = "__unassigned__";

/** 系統保護部門（對應 CS_DEPARTMENT，不可改名/刪除） */
export function isProtectedSystemDepartment(name: string): boolean {
  return name.trim() === CS_DEPARTMENT;
}

/** 選單選項：啟用部門 + 保留目前值（停用部門仍顯示於編輯畫面） */
export function buildDepartmentOptions(
  activeDepartments: string[],
  currentValue?: string | null
): string[] {
  const options = [...activeDepartments];
  const current = currentValue?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  return options;
}
