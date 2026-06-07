/**
 * LINE Messaging API 推播底層
 *
 * 環境變數：
 * - LINE_CHANNEL_ACCESS_TOKEN
 * - LINE_CHANNEL_SECRET（webhook 用）
 * - LINE_NOTIFY_INTERNAL_SECRET（/api/line/notify 用）
 */

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function isLineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim());
}

export function isLineNotifyApiAuthorized(authHeader: string | null): boolean {
  const secret = process.env.LINE_NOTIFY_INTERNAL_SECRET?.trim();
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function sendLinePush(
  lineUserId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

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

/** 推播至多個 line_user_id（已去重）；個別失敗不 throw */
export async function sendLinePushToMany(
  lineUserIds: string[],
  message: string
): Promise<void> {
  for (const lineUserId of lineUserIds) {
    await sendLinePush(lineUserId, message);
  }
}
