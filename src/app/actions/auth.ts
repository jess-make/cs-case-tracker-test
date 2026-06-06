"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEACTIVATED_ACCOUNT_MESSAGE } from "@/lib/auth/messages";
import { fetchUserIsActive } from "@/lib/auth/inactive-account";

export async function signInAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "請輸入 Email 與密碼" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "登入失敗，請確認帳號與密碼" };
  }

  if (data.user) {
    const isActive = await fetchUserIsActive(data.user.id);
    if (isActive === false) {
      await supabase.auth.signOut();
      return { error: DEACTIVATED_ACCOUNT_MESSAGE };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
