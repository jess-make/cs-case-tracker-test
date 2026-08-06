import { isAutoAssignDepartmentValue } from "@/lib/case-department";

/** 指派部門：未選擇時回傳 null */
export function parseOptionalDepartment(
  value: FormDataEntryValue | null
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (isAutoAssignDepartmentValue(trimmed)) return null;
  return trimmed || null;
}
