const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export async function sendLineReply(
  replyToken: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!token) {
    console.warn("[LINE] Channel access token not configured, skipping reply");
    return { ok: false, error: "LINE not configured" };
  }

  if (!replyToken?.trim()) {
    return { ok: false, error: "Missing reply token" };
  }

  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE] Reply failed:", res.status, body);
      return { ok: false, error: body };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[LINE] Reply error:", msg);
    return { ok: false, error: msg };
  }
}
