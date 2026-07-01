const DEPARTMENT_CHILD_SEPARATOR = "-";

export function normalizeDepartmentName(
  department: string | null | undefined
): string {
  return department?.trim() ?? "";
}

export function isDepartmentInScope(
  targetDepartment: string | null | undefined,
  ownerDepartment: string | null | undefined
): boolean {
  const target = normalizeDepartmentName(targetDepartment);
  const owner = normalizeDepartmentName(ownerDepartment);

  if (!target || !owner) return false;
  return (
    target === owner ||
    target.startsWith(`${owner}${DEPARTMENT_CHILD_SEPARATOR}`)
  );
}

export function getDepartmentScopeLikePattern(department: string): string {
  return `${department.trim()}${DEPARTMENT_CHILD_SEPARATOR}%`;
}
