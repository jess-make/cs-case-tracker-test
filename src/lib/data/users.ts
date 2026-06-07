import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { normalizeUser } from "@/lib/data/normalize";
import type { UpdateUserInput, User } from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

/** 使用者管理：取得全部使用者（需 admin 權限 + RLS） */
export async function getUsersForManagement(): Promise<User[]> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("*")
    .order("name");
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeUser);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<User> {
  const payload: Record<string, unknown> = {
    name: input.name,
    role: input.role,
    department: input.department,
    line_user_id: input.line_user_id,
    is_active: input.is_active,
  };
  if (input.must_change_password !== undefined) {
    payload.must_change_password = input.must_change_password;
  }

  const { data, error } = await (await supabase())
    .from("users")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeUser(data as Record<string, unknown>);
}

/** 使用者完成強制改密碼後清除旗標 */
export async function clearMustChangePassword(userId: string): Promise<void> {
  const { error } = await (await supabase())
    .from("users")
    .update({ must_change_password: false })
    .eq("id", userId);

  if (error) throw error;
}

export async function getUserProfileFlags(userId: string): Promise<{
  is_active: boolean;
  must_change_password: boolean;
} | null> {
  const { data, error } = await (await supabase())
    .from("users")
    .select("is_active, must_change_password")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    is_active: data.is_active !== false,
    must_change_password: data.must_change_password === true,
  };
}
