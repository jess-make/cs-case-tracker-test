import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { normalizeUser } from "@/lib/data/normalize";
import { isDepartmentInScope } from "@/lib/department-scope";
import type { User } from "@/types";

async function supabase() {
  assertSupabaseEnv();
  return createClient();
}

/** 取得所有啟用中的使用者（供通知規則篩選） */
export async function fetchActiveUsers(): Promise<User[]> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("[fetchActiveUsers]", error.message);
    return [];
  }

  return ((data as Record<string, unknown>[]) ?? []).map(normalizeUser);
}

/** 依 user id 查詢使用者（結案通知建立者） */
export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[fetchUserById]", error.message);
    return null;
  }

  return normalizeUser(data as Record<string, unknown>);
}

/** 篩選具 LINE 推播資格的使用者 */
export function withLineUserId(users: User[]): User[] {
  return users.filter((u) => Boolean(u.line_user_id?.trim()));
}

/** 依部門篩選使用者（精確比對 department 文字） */
export function filterByDepartment(users: User[], department: string): User[] {
  const dept = department.trim();
  return users.filter((u) => u.department?.trim() === dept);
}

export function filterByDepartmentAudience(
  users: User[],
  department: string
): User[] {
  const dept = department.trim();

  return users.filter((user) => {
    const userDept = user.department?.trim();
    if (!userDept) return false;
    if (userDept === dept) return true;
    return (
      user.role === "department_head" &&
      isDepartmentInScope(dept, userDept)
    );
  });
}

/** 去除重複 line_user_id，保留第一筆對應使用者 */
export function uniqueLineUserIds(users: User[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const user of users) {
    const lineId = user.line_user_id?.trim();
    if (!lineId || seen.has(lineId)) continue;
    seen.add(lineId);
    ids.push(lineId);
  }

  return ids;
}
