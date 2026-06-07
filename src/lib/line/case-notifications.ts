import {
  buildCaseCreatedMessage,
  buildCaseClosedMessage,
  buildCaseRepliedMessage,
  buildDepartmentAssignedMessage,
} from "@/lib/line/messages";
import {
  resolveCaseClosedRecipients,
  resolveCaseCreatedRecipients,
  resolveCaseRepliedRecipients,
  resolveDepartmentAssignedRecipients,
  type NotificationActor,
} from "@/lib/line/notification-rules";
import { fetchActiveUsers, fetchUserById } from "@/lib/line/recipients";
import { isLineConfigured, sendLinePushToMany } from "@/lib/line/notify";
import type { Case } from "@/types";

async function dispatchToRecipients(
  event: string,
  caseNumber: string,
  lineUserIds: string[],
  message: string
): Promise<void> {
  if (lineUserIds.length === 0) {
    console.log(`[LINE ${event}] no recipients for case ${caseNumber}`);
    return;
  }

  console.log(
    `[LINE ${event}] pushing to ${lineUserIds.length} recipient(s) for case ${caseNumber}`
  );
  await sendLinePushToMany(lineUserIds, message);
}

/** 案件建立 */
export async function notifyCaseCreated(caseData: Case): Promise<void> {
  try {
    if (!isLineConfigured()) return;

    const activeUsers = await fetchActiveUsers();
    const recipients = resolveCaseCreatedRecipients(caseData, activeUsers);
    const message = buildCaseCreatedMessage(caseData);

    await dispatchToRecipients(
      "notifyCaseCreated",
      caseData.case_number,
      recipients,
      message
    );
  } catch (err) {
    console.error("[LINE notifyCaseCreated]", err);
  }
}

/** 指派部門（編輯案件時部門變更） */
export async function notifyDepartmentAssigned(caseData: Case): Promise<void> {
  try {
    if (!isLineConfigured()) return;

    const activeUsers = await fetchActiveUsers();
    const recipients = resolveDepartmentAssignedRecipients(caseData, activeUsers);
    const message = buildDepartmentAssignedMessage(caseData);

    await dispatchToRecipients(
      "notifyDepartmentAssigned",
      caseData.case_number,
      recipients,
      message
    );
  } catch (err) {
    console.error("[LINE notifyDepartmentAssigned]", err);
  }
}

/** 處理回覆 */
export async function notifyCaseReplied(
  caseData: Case,
  actor: NotificationActor,
  replyContent: string
): Promise<void> {
  try {
    if (!isLineConfigured()) return;

    const activeUsers = await fetchActiveUsers();
    const recipients = resolveCaseRepliedRecipients(caseData, actor, activeUsers);

    if (recipients.length === 0) {
      console.log(
        `[LINE notifyCaseReplied] no recipients for case ${caseData.case_number}`,
        { actorRole: actor.role, actorDept: actor.department, caseDept: caseData.department }
      );
      return;
    }

    const message = buildCaseRepliedMessage(caseData, actor.name, replyContent);
    await dispatchToRecipients(
      "notifyCaseReplied",
      caseData.case_number,
      recipients,
      message
    );
  } catch (err) {
    console.error("[LINE notifyCaseReplied]", err);
  }
}

/** 案件結案 */
export async function notifyCaseClosed(caseData: Case): Promise<void> {
  try {
    if (!isLineConfigured()) return;

    const activeUsers = await fetchActiveUsers();
    let recipients = resolveCaseClosedRecipients(caseData, activeUsers);

    if (recipients.length === 0 && caseData.created_by_id) {
      const creator = await fetchUserById(caseData.created_by_id);
      if (creator?.line_user_id?.trim()) {
        recipients = [creator.line_user_id.trim()];
      }
    }

    if (recipients.length === 0) {
      console.log(
        `[LINE notifyCaseClosed] creator has no line_user_id, skipping case ${caseData.case_number}`
      );
      return;
    }

    const message = buildCaseClosedMessage(caseData);
    await dispatchToRecipients(
      "notifyCaseClosed",
      caseData.case_number,
      recipients,
      message
    );
  } catch (err) {
    console.error("[LINE notifyCaseClosed]", err);
  }
}
