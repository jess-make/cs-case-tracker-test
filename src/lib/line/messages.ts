import { CASE_STATUS_LABELS, URGENCY_LABELS } from "@/lib/constants";
import type { Case, CaseStatus } from "@/types";

export function getCaseUrl(caseId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/cases/${caseId}`;
}

function statusLabel(status: CaseStatus): string {
  return CASE_STATUS_LABELS[status] ?? status;
}

function truncate(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function buildMessage(params: {
  eventLabel: string;
  caseData: Case;
  summary: string;
}): string {
  const { eventLabel, caseData, summary } = params;
  const lines = [
    `【${eventLabel}】`,
    `案件編號：${caseData.case_number}`,
    `客戶姓名：${caseData.customer_name}`,
    `狀態：${statusLabel(caseData.status)}`,
    `摘要：${summary}`,
    `連結：${getCaseUrl(caseData.id)}`,
  ];
  return lines.join("\n");
}

export function buildCaseCreatedMessage(caseData: Case): string {
  const dept = caseData.department?.trim();
  const summary = dept
    ? `新案件已建立，指派部門：${dept}，緊急程度：${URGENCY_LABELS[caseData.urgency]}`
    : `新案件已建立，尚未指派部門，緊急程度：${URGENCY_LABELS[caseData.urgency]}`;

  return buildMessage({
    eventLabel: "新案件建立",
    caseData,
    summary,
  });
}

export function buildDepartmentAssignedMessage(caseData: Case): string {
  return buildMessage({
    eventLabel: "案件指派部門",
    caseData,
    summary: `案件已指派至 ${caseData.department?.trim() ?? "—"}`,
  });
}

export function buildCaseRepliedMessage(
  caseData: Case,
  actorName: string,
  replyContent: string
): string {
  return buildMessage({
    eventLabel: "處理回覆",
    caseData,
    summary: `${actorName} 回覆：${truncate(replyContent)}`,
  });
}

export function buildCaseClosedMessage(caseData: Case): string {
  return buildMessage({
    eventLabel: "案件結案",
    caseData,
    summary: "案件已結案",
  });
}
