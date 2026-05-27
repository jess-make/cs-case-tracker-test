/**
 * LINE Messaging API 通知模組（預留）
 *
 * 使用前請設定環境變數：
 * - LINE_CHANNEL_ACCESS_TOKEN
 * - LINE_CHANNEL_SECRET
 */

export type LineNotifyType = "case_created" | "case_completed";

export interface LineNotifyPayload {
  type: LineNotifyType;
  caseId: string;
  caseNumber: string;
  recipientLineUserId: string;
  message: string;
  metadata?: Record<string, string>;
}

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function isLineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
}

export async function sendLinePush(
  lineUserId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.warn("[LINE] Channel access token not configured, skipping push");
    return { ok: false, error: "LINE not configured" };
  }

  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE] Push failed:", res.status, body);
      return { ok: false, error: body };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[LINE] Push error:", msg);
    return { ok: false, error: msg };
  }
}

/** 建立案件 → 通知負責人 */
export async function notifyCaseCreated(params: {
  caseNumber: string;
  assigneeLineUserId: string;
  customerName: string;
  urgency: string;
}): Promise<{ ok: boolean; error?: string }> {
  const message =
    `【新客訴案件】\n` +
    `案件編號：${params.caseNumber}\n` +
    `客戶：${params.customerName}\n` +
    `緊急程度：${params.urgency}\n` +
    `請盡速處理。`;

  return sendLinePush(params.assigneeLineUserId, message);
}

/** 處理完成 → 通知客服 */
export async function notifyCaseCompleted(params: {
  caseNumber: string;
  csLineUserId: string;
  handlerName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const message =
    `【案件處理完成】\n` +
    `案件編號：${params.caseNumber}\n` +
    `處理人：${params.handlerName}\n` +
    `已回覆改善結果，請客服確認。`;

  return sendLinePush(params.csLineUserId, message);
}

export async function dispatchLineNotification(
  payload: LineNotifyPayload
): Promise<{ ok: boolean; error?: string }> {
  switch (payload.type) {
    case "case_created":
    case "case_completed":
      return sendLinePush(payload.recipientLineUserId, payload.message);
    default:
      return { ok: false, error: "Unknown notification type" };
  }
}
