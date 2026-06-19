/** 是否已選擇指派部門（非「暫不指派」） */
export function hasAssignedDepartment(
  department: string | null | undefined
): boolean {
  return Boolean(department?.trim());
}

/** 案件列表篩選：暫未指派部門的 query 值 */
export const DEPARTMENT_FILTER_UNASSIGNED = "__unassigned__";

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
