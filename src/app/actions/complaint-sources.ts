"use server";

import { revalidatePath } from "next/cache";
import { requireManageUsersPermission } from "@/lib/auth/actor";
import {
  createComplaintChannel,
  createComplaintSource,
  deleteComplaintChannel,
  deleteComplaintSource,
  renameComplaintChannel,
  renameComplaintSource,
  reorderComplaintChannels,
  reorderComplaintSources,
  setComplaintChannelActive,
  setComplaintSourceActive,
} from "@/lib/data/complaint-sources";

function revalidate() {
  revalidatePath("/complaint-sources");
  revalidatePath("/cases");
  revalidatePath("/cases/new");
}

export async function createComplaintSourceAction(formData: FormData) {
  try {
    await requireManageUsersPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫客訴來源名稱" };
    await createComplaintSource(name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "新增客訴來源失敗，請稍後再試",
    };
  }
}

export async function setComplaintSourceActiveAction(
  sourceId: string,
  isActive: boolean
) {
  try {
    await requireManageUsersPermission();
    if (!sourceId?.trim()) return { error: "無效的客訴來源" };
    await setComplaintSourceActive(sourceId, isActive);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "更新客訴來源狀態失敗，請稍後再試",
    };
  }
}

export async function renameComplaintSourceAction(
  sourceId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫客訴來源名稱" };
    if (!sourceId?.trim()) return { error: "無效的客訴來源" };
    await renameComplaintSource(sourceId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "修改客訴來源失敗，請稍後再試",
    };
  }
}

export async function deleteComplaintSourceAction(sourceId: string) {
  try {
    await requireManageUsersPermission();
    if (!sourceId?.trim()) return { error: "無效的客訴來源" };
    await deleteComplaintSource(sourceId);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "刪除客訴來源失敗，請稍後再試",
    };
  }
}

export async function createComplaintChannelAction(
  sourceId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫客訴管道名稱" };
    if (!sourceId?.trim()) return { error: "無效的客訴來源" };
    await createComplaintChannel(sourceId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "新增客訴管道失敗，請稍後再試",
    };
  }
}

export async function setComplaintChannelActiveAction(
  channelId: string,
  isActive: boolean
) {
  try {
    await requireManageUsersPermission();
    if (!channelId?.trim()) return { error: "無效的客訴管道" };
    await setComplaintChannelActive(channelId, isActive);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "更新客訴管道狀態失敗，請稍後再試",
    };
  }
}

export async function renameComplaintChannelAction(
  channelId: string,
  formData: FormData
) {
  try {
    await requireManageUsersPermission();
    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "請填寫客訴管道名稱" };
    if (!channelId?.trim()) return { error: "無效的客訴管道" };
    await renameComplaintChannel(channelId, name);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "修改客訴管道失敗，請稍後再試",
    };
  }
}

export async function deleteComplaintChannelAction(channelId: string) {
  try {
    await requireManageUsersPermission();
    if (!channelId?.trim()) return { error: "無效的客訴管道" };
    await deleteComplaintChannel(channelId);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "刪除客訴管道失敗，請稍後再試",
    };
  }
}

export async function reorderComplaintSourcesAction(orderedIds: string[]) {
  try {
    await requireManageUsersPermission();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { error: "無效的排序資料" };
    }
    await reorderComplaintSources(orderedIds);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "更新客訴來源排序失敗，請稍後再試",
    };
  }
}

export async function reorderComplaintChannelsAction(
  sourceId: string,
  orderedIds: string[]
) {
  try {
    await requireManageUsersPermission();
    if (!sourceId?.trim()) return { error: "無效的客訴來源" };
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { error: "無效的排序資料" };
    }
    await reorderComplaintChannels(sourceId, orderedIds);
    revalidate();
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "更新客訴管道排序失敗，請稍後再試",
    };
  }
}
