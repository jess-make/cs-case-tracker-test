/** 是否已選擇指派部門（非「暫不指派」） */
export function hasAssignedDepartment(
  department: string | null | undefined
): boolean {
  return Boolean(department?.trim());
}
