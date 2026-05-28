import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User, UserRole } from "@/types";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string | null;
  line_user_id: string | null;
}

function mapProfile(row: User): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    department: row.department,
    line_user_id: row.line_user_id,
  };
}

/** 取得目前登入使用者（含 users 表 profile） */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("[getCurrentUser] profile:", profileError?.message);
    return null;
  }

  const row = profile as User & { is_active?: boolean };
  if (row.is_active === false) return null;

  return mapProfile(row as User);
}

/** 未登入則導向登入頁 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
