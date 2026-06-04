/** 是否已選擇指派部門（非「暫不指派」） */
export function hasAssignedDepartment(
  department: string | null | undefined
): boolean {
  return Boolean(department?.trim());
}

export const LOG_DEPARTMENT_ASSIGNED_ON_CREATE =
  "案件已指派部門，狀態進入處理中";

export const LOG_DEPARTMENT_ASSIGNED_ON_EDIT =
  "指派部門已更新，狀態進入處理中";
