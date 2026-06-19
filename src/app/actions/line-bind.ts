"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveLineBindTokenForUser,
  getOrCreateLineBindToken,
  regenerateLineBindToken,
} from "@/lib/data/line-bind-tokens";
import { getUserProfileFlags, isOnboardingIncomplete } from "@/lib/data/users";

async function requireAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("請先登入");
  return user.id;
}

export async function getLineBindStatusAction() {
  try {
    const userId = await requireAuthenticatedUserId();
    const flags = await getUserProfileFlags(userId);
    if (!flags) return { error: "找不到使用者資料" as const };

    const bound = Boolean(flags.line_user_id?.trim());
    const activeToken =
      !bound && flags.must_bind_line
        ? await getActiveLineBindTokenForUser(userId)
        : null;

    return {
      bound,
      lineUserId: flags.line_user_id,
      mustBindLine: flags.must_bind_line,
      mustChangePassword: flags.must_change_password,
      onboardingComplete: !isOnboardingIncomplete(flags),
      activeToken,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "取得 LINE 綁定狀態失敗",
    };
  }
}

export async function generateLineBindTokenAction() {
  try {
    const userId = await requireAuthenticatedUserId();
    const flags = await getUserProfileFlags(userId);
    if (!flags) return { error: "找不到使用者資料" };
    if (!flags.must_bind_line || flags.line_user_id?.trim()) {
      return { error: "目前不需要 LINE 綁定" };
    }

    const active = await getOrCreateLineBindToken(userId);
    revalidatePath("/change-password");
    return { success: true as const, token: active };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "產生綁定碼失敗，請稍後再試",
    };
  }
}

export async function regenerateLineBindTokenAction() {
  try {
    const userId = await requireAuthenticatedUserId();
    const flags = await getUserProfileFlags(userId);
    if (!flags) return { error: "找不到使用者資料" };
    if (!flags.must_bind_line || flags.line_user_id?.trim()) {
      return { error: "目前不需要 LINE 綁定" };
    }

    const active = await regenerateLineBindToken(userId);
    revalidatePath("/change-password");
    return { success: true as const, token: active };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "重新產生綁定碼失敗，請稍後再試",
    };
  }
}
