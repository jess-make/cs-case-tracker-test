import type { UserRole } from "@/types";

/** 可建立案件：admin、cs */
export function canCreateCase(role: UserRole): boolean {
  return role === "admin" || role === "cs";
}

/** 可更新案件：admin、cs（handler 之後再細分） */
export function canUpdateCase(role: UserRole): boolean {
  return role === "admin" || role === "cs";
}

/** 可檢視全部案件（第一版皆為 true） */
export function canViewAllCases(_role: UserRole): boolean {
  return true;
}
