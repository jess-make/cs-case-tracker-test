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
  const { data, error } = await (await supabase())
    .from("users")
    .update({
      name: input.name,
      role: input.role,
      department: input.department,
      line_user_id: input.line_user_id,
      is_active: input.is_active,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeUser(data as Record<string, unknown>);
}
