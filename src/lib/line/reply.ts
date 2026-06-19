const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export async function sendLineReply(
  replyToken: string,
  message: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const hasReplyToken = Boolean(replyToken?.trim());

  console.log("[LINE webhook] bind sendLineReply before:", {
    hasReplyToken,
    hasAccessToken: Boolean(accessToken),
    messageLength: message.length,
  });

  if (!accessToken) {
    console.warn("[LINE] Channel access token not configured, skipping reply");
    return { ok: false, error: "LINE not configured" };
  }

  if (!hasReplyToken) {
    console.error("[LINE webhook] bind sendLineReply: missing replyToken");
    return { ok: false, error: "Missing reply token" };
  }

  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: message }],
      }),
    });

    const body = await res.text();

    if (!res.ok) {
      console.error("[LINE webhook] bind sendLineReply failed:", {
        status: res.status,
        body,
      });
      return { ok: false, status: res.status, error: body };
    }

    console.log("[LINE webhook] bind sendLineReply success:", {
      status: res.status,
      body: body || "(empty)",
    });
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[LINE webhook] bind sendLineReply exception:", err);
    return { ok: false, error: msg };
  }
}
