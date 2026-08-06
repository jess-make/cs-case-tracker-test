"use server";

import { revalidatePath } from "next/cache";
import { requireManageCaseTaxonomyPermission } from "@/lib/auth/actor";
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
    await requireManageCaseTaxonomyPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫子分類名稱" };
    if (!categoryId?.trim()) return { error: "無效的案件類別" };

    await createComplaintIssue(categoryId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "新增子分類失敗，請稍後再試";
    return { error: message };
  }
}

export async function setComplaintIssueActiveAction(
  issueId: string,
  isActive: boolean
) {
  try {
    await requireManageCaseTaxonomyPermission();
    if (!issueId?.trim()) return { error: "無效的子分類" };
    await setComplaintIssueActive(issueId, isActive);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新子分類狀態失敗，請稍後再試";
    return { error: message };
  }
}

export async function renameComplaintIssueAction(
  issueId: string,
  formData: FormData
) {
  try {
    await requireManageCaseTaxonomyPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫子分類名稱" };
    if (!issueId?.trim()) return { error: "無效的子分類" };

    await renameComplaintIssue(issueId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "修改子分類失敗，請稍後再試";
    return { error: message };
  }
}

export async function deleteComplaintIssueAction(issueId: string) {
  try {
    await requireManageCaseTaxonomyPermission();
    if (!issueId?.trim()) return { error: "無效的子分類" };
    await deleteComplaintIssue(issueId);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "刪除子分類失敗，請稍後再試";
    return { error: message };
  }
}

export async function reorderComplaintIssuesAction(
  categoryId: string,
  orderedIds: string[]
) {
  try {
    await requireManageCaseTaxonomyPermission();
    if (!categoryId?.trim()) return { error: "無效的案件類別" };
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { error: "無效的排序資料" };
    }
    await reorderComplaintIssues(categoryId, orderedIds);
    revalidate();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新子分類排序失敗，請稍後再試";
    return { error: message };
  }
}
