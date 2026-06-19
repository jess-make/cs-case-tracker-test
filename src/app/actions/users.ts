"use server";

import { revalidatePath } from "next/cache";
import { requireManageUsersPermission } from "@/lib/auth/actor";
import { isUserRole } from "@/lib/auth/roles";
import { generateTemporaryPassword } from "@/lib/auth/password";
import {
  createAuthUser,
  deleteAuthUser,
  resetAuthUserPassword,
  updateUserAsAdmin,
  waitForUserProfile,
} from "@/lib/data/users-admin";
import { getUsersForManagement, updateUser } from "@/lib/data/users";
import type { UserRole } from "@/types";

function parseUserFormData(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const role = formData.get("role") as string;
  const departmentRaw = (formData.get("department") as string)?.trim();
  const lineUserIdRaw = (formData.get("line_user_id") as string)?.trim();
  const isActive = formData.get("is_active") === "true";

  return {
    name,
    role,
    department: departmentRaw || null,
    line_user_id: lineUserIdRaw || null,
    is_active: isActive,
  };
}

function parseCreateUserFormData(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = formData.get("role") as string;
  const departmentRaw = (formData.get("department") as string)?.trim();

  return {
    name,
    email,
    role,
    department: departmentRaw || null,
  };
}

export async function createUserAction(formData: FormData) {
  try {
    await requireManageUsersPermission();

    const parsed = parseCreateUserFormData(formData);
    if (!parsed.name) {
      return { error: "請填寫姓名" };
    }
    if (!parsed.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) {
      return { error: "請填寫有效的 Email" };
    }
    if (!isUserRole(parsed.role)) {
      return { error: "無效的角色" };
    }

    const temporaryPassword = generateTemporaryPassword();
    let userId: string | null = null;

    const authResult = await createAuthUser({
      email: parsed.email,
      password: temporaryPassword,
      name: parsed.name,
      role: parsed.role as UserRole,
      department: parsed.department,
    });

    if (!authResult.ok) {
      return { error: authResult.message };
    }

    userId = authResult.userId;

    try {
      const profileReady = await waitForUserProfile(userId);
      if (!profileReady) {
        try {
          await deleteAuthUser(userId);
        } catch {
          /* best effort rollback */
        }
        return {
          error:
            "Auth 使用者已建立，但 public.users profile 未產生（可能是 database trigger 失敗）。已回滾 Auth 使用者，請確認 Supabase migrations 已完整執行。",
        };
      }

      await updateUserAsAdmin(userId, {
        name: parsed.name,
        role: parsed.role as UserRole,
        department: parsed.department,
        line_user_id: null,
        is_active: true,
        must_change_password: true,
        must_bind_line: true,
      });
    } catch (inner) {
      if (userId) {
        try {
          await deleteAuthUser(userId);
        } catch {
          /* best effort rollback */
        }
      }
      throw inner;
    }

    revalidatePath("/users");
    return {
      success: true as const,
      email: parsed.email,
      temporaryPassword,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "建立使用者失敗，請稍後再試";
    console.error("[createUserAction]", message);
    return { error: message };
  }
}

export async function resetUserPasswordAction(userId: string) {
  try {
    const admin = await requireManageUsersPermission();

    if (admin.id === userId) {
      return { error: "無法重設自己的密碼" };
    }

    const users = await getUsersForManagement();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { error: "找不到使用者" };
    }

    const temporaryPassword = generateTemporaryPassword();
    await resetAuthUserPassword(userId, temporaryPassword);
    await updateUserAsAdmin(userId, {
      name: target.name,
      role: target.role,
      department: target.department,
      line_user_id: target.line_user_id,
      is_active: target.is_active !== false,
      must_change_password: true,
    });

    revalidatePath("/users");
    return {
      success: true as const,
      email: target.email,
      temporaryPassword,
    };
  } catch (err) {
    console.error("[resetUserPasswordAction]", err instanceof Error ? err.message : err);
    return { error: "重設密碼失敗，請稍後再試" };
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  try {
    const admin = await requireManageUsersPermission();

    const parsed = parseUserFormData(formData);
    if (!parsed.name) {
      return { error: "請填寫姓名" };
    }
    if (!isUserRole(parsed.role)) {
      return { error: "無效的角色" };
    }
    if (admin.id === userId && !parsed.is_active) {
      return { error: "無法停用自己的帳號" };
    }

    await updateUser(userId, {
      name: parsed.name,
      role: parsed.role as UserRole,
      department: parsed.department,
      line_user_id: parsed.line_user_id,
      is_active: parsed.is_active,
    });

    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    console.error("[updateUserAction]", err);
    return {
      error:
        err instanceof Error ? err.message : "更新使用者失敗，請稍後再試",
    };
  }
}
