"use server";

import { revalidatePath } from "next/cache";
import { requireManageUsersPermission } from "@/lib/auth/actor";
import {
  createComplaintCategory,
  deleteComplaintCategory,
  renameComplaintCategory,
  setComplaintCategoryActive,
} from "@/lib/data/complaint-categories";

function revalidateComplaintCategoryPaths() {
  revalidatePath("/complaint-categories");
  revalidatePath("/cases");
  revalidatePath("/cases/new");
}

export async function createComplaintCategoryAction(formData: FormData) {
  try {
    await requireManageUsersPermission();

    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      return { error: "請填寫客訴類別名稱" };
    }

    await createComplaintCategory(name);

    revalidateComplaintCategoryPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "新增客訴類別失敗，請稍後再試";
    console.error("[createComplaintCategoryAction]", message);
    return { error: message };
  }
}

export async function setComplaintCategoryActiveAction(
  categoryId: string,
  isActive: boolean
) {
  try {
    await requireManageUsersPermission();

    if (!categoryId?.trim()) {
      return { error: "無效的客訴類別" };
    }

    await setComplaintCategoryActive(categoryId, isActive);

    revalidateComplaintCategoryPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新客訴類別狀態失敗，請稍後再試";
    console.error("[setComplaintCategoryActiveAction]", message);
    return { error: message };
  }
}

export async function renameComplaintCategoryAction(
  categoryId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();

    if (!categoryId?.trim()) {
      return { error: "無效的客訴類別" };
    }

    const name = (formData.get("name") as string)?.trim();
    if (!name) {
      return { error: "請填寫客訴類別名稱" };
    }

    await renameComplaintCategory(categoryId, name);

    revalidateComplaintCategoryPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "修改客訴類別名稱失敗，請稍後再試";
    console.error("[renameComplaintCategoryAction]", message);
    return { error: message };
  }
}

export async function deleteComplaintCategoryAction(categoryId: string) {
  try {
    await requireManageUsersPermission();

    if (!categoryId?.trim()) {
      return { error: "無效的客訴類別" };
    }

    await deleteComplaintCategory(categoryId);

    revalidateComplaintCategoryPaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "刪除客訴類別失敗，請稍後再試";
    console.error("[deleteComplaintCategoryAction]", message);
    return { error: message };
  }
}
