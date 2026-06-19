"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEACTIVATED_ACCOUNT_MESSAGE } from "@/lib/auth/messages";
import { fetchUserIsActive } from "@/lib/auth/inactive-account";
import { validatePassword } from "@/lib/auth/password";
import {
  clearMustChangePassword,
  getUserProfileFlags,
  isOnboardingIncomplete,
} from "@/lib/data/users";

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

    const flags = await getUserProfileFlags(data.user.id);
    revalidatePath("/", "layout");
    if (flags && isOnboardingIncomplete(flags)) {
      redirect("/change-password");
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

export async function changePasswordAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; passwordUpdated?: boolean } | null> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!password || !confirmPassword) {
    return { error: "請填寫新密碼與確認密碼" };
  }
  if (password !== confirmPassword) {
    return { error: "兩次輸入的密碼不一致" };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "請先登入" };
  }

  const flags = await getUserProfileFlags(user.id);
  if (!flags) {
    return { error: "找不到使用者資料" };
  }
  if (!flags.must_change_password) {
    if (isOnboardingIncomplete(flags)) {
      return { passwordUpdated: true };
    }
    redirect("/");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "密碼更新失敗，請稍後再試" };
  }

  await clearMustChangePassword(user.id);
  revalidatePath("/", "layout");

  const updatedFlags = await getUserProfileFlags(user.id);
  if (updatedFlags && isOnboardingIncomplete(updatedFlags)) {
    return { passwordUpdated: true };
  }

  redirect("/");
}
