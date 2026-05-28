import type { Case } from "@/types";

/** 案件列表／詳情：負責人顯示名稱（依 assignee_id 對應 users.name） */
export function getAssigneeDisplayName(caseData: Case): string {
  const name = caseData.assignee?.name?.trim();
  return name || "—";
}
