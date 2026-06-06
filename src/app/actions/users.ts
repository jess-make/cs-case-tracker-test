"use server";

import { revalidatePath } from "next/cache";
import { requireManageUsersPermission } from "@/lib/auth/actor";
import { isUserRole } from "@/lib/auth/roles";
import { updateUser } from "@/lib/data/users";
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
