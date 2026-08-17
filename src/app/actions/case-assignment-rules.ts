"use server";

import { revalidatePath } from "next/cache";
import { requireManageCaseAssignmentRulesPermission } from "@/lib/auth/actor";
import {
  deleteCaseAssignmentRule,
  saveCaseAssignmentRule,
  setCaseAssignmentRuleActive,
} from "@/lib/data/case-assignment-rules";

function revalidateCaseAssignmentRulePaths() {
  revalidatePath("/case-assignment-rules");
  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath("/cases/new");
  revalidatePath("/return-exchange-upload");
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return String(value ?? "").trim() === "true";
}

export async function saveCaseAssignmentRuleAction(formData: FormData) {
  try {
    await requireManageCaseAssignmentRulesPermission();

    const id = ((formData.get("id") as string | null) ?? "").trim() || null;
    const complaintType =
      ((formData.get("complaint_type") as string | null) ?? "").trim();
    const appliesToAllSubtypes = parseBoolean(
      formData.get("applies_to_all_subtypes")
    );
    const complaintSubtype = appliesToAllSubtypes
      ? null
      : ((formData.get("complaint_subtype") as string | null) ?? "").trim();
    const departments = formData
      .getAll("departments")
      .map((value) => String(value).trim())
      .filter(Boolean);

    await saveCaseAssignmentRule({
      id,
      complaint_type: complaintType,
      complaint_subtype: complaintSubtype,
      applies_to_all_subtypes: appliesToAllSubtypes,
      is_active: parseBoolean(formData.get("is_active")),
      note: ((formData.get("note") as string | null) ?? "").trim() || null,
      departments,
    });

    revalidateCaseAssignmentRulePaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "儲存案件指派規則失敗，請稍後再試";
    console.error("[saveCaseAssignmentRuleAction]", message);
    return { error: message };
  }
}

export async function setCaseAssignmentRuleActiveAction(
  ruleId: string,
  isActive: boolean
) {
  try {
    await requireManageCaseAssignmentRulesPermission();
    if (!ruleId?.trim()) return { error: "無效的指派規則" };

    await setCaseAssignmentRuleActive(ruleId, isActive);

    revalidateCaseAssignmentRulePaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "更新指派規則狀態失敗，請稍後再試";
    console.error("[setCaseAssignmentRuleActiveAction]", message);
    return { error: message };
  }
}

export async function deleteCaseAssignmentRuleAction(ruleId: string) {
  try {
    await requireManageCaseAssignmentRulesPermission();
    if (!ruleId?.trim()) return { error: "無效的指派規則" };

    await deleteCaseAssignmentRule(ruleId);

    revalidateCaseAssignmentRulePaths();
    return { success: true as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "刪除指派規則失敗，請稍後再試";
    console.error("[deleteCaseAssignmentRuleAction]", message);
    return { error: message };
  }
}

