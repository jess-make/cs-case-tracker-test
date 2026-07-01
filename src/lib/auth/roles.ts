import type { UserRole } from "@/types";

const VALID_ROLES = new Set<UserRole>(["admin", "boss", "manager", "user"]);

/** 將 DB 角色正規化（相容舊 cs / handler） */
export function normalizeUserRole(role: string | null | undefined): UserRole {
  if (role === "admin" || role === "boss" || role === "manager" || role === "user") {
    return role;
  }
  if (role === "cs" || role === "handler") return "user";
  return "user";
}

export function isUserRole(role: string | null | undefined): role is UserRole {
  return VALID_ROLES.has(role as UserRole);
}
