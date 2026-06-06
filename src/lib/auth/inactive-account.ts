import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEACTIVATED_ACCOUNT_MESSAGE, DEACTIVATED_LOGIN_REASON } from "@/lib/auth/messages";
/** 查詢 users.is_active（null 視為啟用，相容舊資料） */
export async function fetchUserIsActive(userId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[fetchUserIsActive]", error.message);
    return null;
  }

  if (!data) return null;
  return data.is_active !== false;
}

/** 清除 session 並導向登入頁（停用帳號） */
export async function signOutDeactivatedUser(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?reason=${DEACTIVATED_LOGIN_REASON}`);
}
export { DEACTIVATED_ACCOUNT_MESSAGE, DEACTIVATED_LOGIN_REASON };
