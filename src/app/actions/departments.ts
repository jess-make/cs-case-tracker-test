"use server";

import { revalidatePath } from "next/cache";
import { requireManageUsersPermission } from "@/lib/auth/actor";
import {
  createDepartment,
  deleteDepartment,
  renameDepartment,
  setDepartmentActive,
} from "@/lib/data/departments";

function revalidateDepartmentPaths() {
  revalidatePath("/departments");
  revalidatePath("/users");
  revalidatePath("/cases");
  revalidatePath("/cases/new");
}

export async function createDepartmentAction(formData: FormData) {
  try {
    await requireManageUsersPermission();

    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      return { error: "請填寫部門名稱" };
    }

    await createDepartment(name);

    revalidateDepartmentPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "新增部門失敗，請稍後再試";
    console.error("[createDepartmentAction]", message);
    return { error: message };
  }
}

export async function setDepartmentActiveAction(
  departmentId: string,
  isActive: boolean
) {
  try {
    await requireManageUsersPermission();

    if (!departmentId?.trim()) {
      return { error: "無效的部門" };
    }

    await setDepartmentActive(departmentId, isActive);

    revalidateDepartmentPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新部門狀態失敗，請稍後再試";
    console.error("[setDepartmentActiveAction]", message);
    return { error: message };
  }
}

export async function renameDepartmentAction(
  departmentId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();

    if (!departmentId?.trim()) {
      return { error: "無效的部門" };
    }

    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      return { error: "請填寫部門名稱" };
    }

    await renameDepartment(departmentId, name);

    revalidateDepartmentPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "修改部門名稱失敗，請稍後再試";
    console.error("[renameDepartmentAction]", message);
    return { error: message };
  }
}

export async function deleteDepartmentAction(departmentId: string) {
  try {
    await requireManageUsersPermission();

    if (!departmentId?.trim()) {
      return { error: "無效的部門" };
    }

    await deleteDepartment(departmentId);

    revalidateDepartmentPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "刪除部門失敗，請稍後再試";
    console.error("[deleteDepartmentAction]", message);
    return { error: message };
  }
}
