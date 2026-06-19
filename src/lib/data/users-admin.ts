import { mapSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UpdateUserInput, UserRole } from "@/types";

export type CreateAuthUserResult =
  | { ok: true; userId: string }
  | { ok: false; message: string; code?: string };

function isPermissionDenied(message: string): boolean {
  return message.toLowerCase().includes("permission denied");
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  department: string | null;
}): Promise<CreateAuthUserResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      role: input.role,
      department: input.department ?? "",
    },
  });

  if (error) {
    console.error("[createAuthUser] createUser error.message:", error.message);
    console.error("[createAuthUser] createUser error.code:", error.code ?? "(none)");
    return {
      ok: false,
      message: mapSupabaseAuthError(error),
      code: error.code,
    };
  }

  if (!data.user?.id) {
    console.error("[createAuthUser] createUser 回應成功但缺少 user.id");
    return { ok: false, message: "建立 Auth 使用者失敗：未取得使用者 ID" };
  }

  console.log("[createAuthUser] createUser success, userId:", data.user.id);
  return { ok: true, userId: data.user.id };
}

export async function deleteAuthUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[deleteAuthUser] error.message:", error.message);
    console.error("[deleteAuthUser] error.code:", error.code ?? "(none)");
    throw new Error(mapSupabaseAuthError(error));
  }
}

export async function resetAuthUserPassword(
  userId: string,
  password: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
  });
  if (error) {
    throw new Error(mapSupabaseAuthError(error));
  }
}

/** 等待 trigger 建立 public.users profile（Service Role，繞過 RLS） */
export async function waitForUserProfile(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await admin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        `[waitForUserProfile] query error (attempt ${attempt + 1}):`,
        error.message
      );
      if (isPermissionDenied(error.message)) {
        throw new Error(
          "Service Role 無 public.users 查詢權限，請在 Supabase 執行 migration 018_grant_users_service_role.sql"
        );
      }
    }

    if (data?.id) {
      console.log("[waitForUserProfile] profile ready, userId:", userId);
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.error("[waitForUserProfile] profile not found after retries, userId:", userId);
  return false;
}

/** 以 Service Role 更新 public.users（管理員建立/重設密碼等 server 流程） */
export async function updateUserAsAdmin(
  id: string,
  input: UpdateUserInput
): Promise<void> {
  const admin = createAdminClient();
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
  if (input.must_bind_line !== undefined) {
    payload.must_bind_line = input.must_bind_line;
  }
  if (input.line_user_id?.trim()) {
    payload.must_bind_line = false;
  }

  const { error } = await admin.from("users").update(payload).eq("id", id);

  if (error) {
    console.error("[updateUserAsAdmin] error.message:", error.message);
    if (isPermissionDenied(error.message)) {
      throw new Error(
        "Service Role 無 public.users 更新權限，請在 Supabase 執行 migration 018_grant_users_service_role.sql"
      );
    }
    throw new Error(error.message);
  }
}
