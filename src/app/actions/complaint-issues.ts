"use server";

import { revalidatePath } from "next/cache";
import { requireManageUsersPermission } from "@/lib/auth/actor";
import {
  createComplaintIssue,
  deleteComplaintIssue,
  renameComplaintIssue,
  reorderComplaintIssues,
  setComplaintIssueActive,
} from "@/lib/data/complaint-issues";

function revalidate() {
  revalidatePath("/complaint-categories");
  revalidatePath("/cases");
  revalidatePath("/cases/new");
}

export async function createComplaintIssueAction(
  categoryId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫客訴問題名稱" };
    if (!categoryId?.trim()) return { error: "無效的客訴類別" };

    await createComplaintIssue(categoryId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "新增客訴問題失敗，請稍後再試";
    return { error: message };
  }
}

export async function setComplaintIssueActiveAction(
  issueId: string,
  isActive: boolean
) {
  try {
    await requireManageUsersPermission();
    if (!issueId?.trim()) return { error: "無效的客訴問題" };
    await setComplaintIssueActive(issueId, isActive);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新客訴問題狀態失敗，請稍後再試";
    return { error: message };
  }
}

export async function renameComplaintIssueAction(
  issueId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫客訴問題名稱" };
    if (!issueId?.trim()) return { error: "無效的客訴問題" };

    await renameComplaintIssue(issueId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "修改客訴問題失敗，請稍後再試";
    return { error: message };
  }
}

export async function deleteComplaintIssueAction(issueId: string) {
  try {
    await requireManageUsersPermission();
    if (!issueId?.trim()) return { error: "無效的客訴問題" };
    await deleteComplaintIssue(issueId);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "刪除客訴問題失敗，請稍後再試";
    return { error: message };
  }
}

export async function reorderComplaintIssuesAction(
  categoryId: string,
  orderedIds: string[]
) {
  try {
    await requireManageUsersPermission();
    if (!categoryId?.trim()) return { error: "無效的客訴類別" };
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { error: "無效的排序資料" };
    }
    await reorderComplaintIssues(categoryId, orderedIds);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新客訴問題排序失敗，請稍後再試";
    return { error: message };
  }
}
