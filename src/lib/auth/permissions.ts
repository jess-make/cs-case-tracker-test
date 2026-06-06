import type { UserRole } from "@/types";

/** 可建立案件：admin、manager、user */
export function canCreateCase(role: UserRole): boolean {
  return role === "admin" || role === "manager" || role === "user";
}

/** 可更新／管理案件：admin、manager、user */
export function canUpdateCase(role: UserRole): boolean {
  return role === "admin" || role === "manager" || role === "user";
}

/** 可檢視全部案件（admin / manager / user 皆可） */
export function canViewAllCases(): boolean {
  return true;
}

/** 系統設定（預留，manager 暫不開放） */
export function canAccessSystemSettings(role: UserRole): boolean {
  return role === "admin";
}
