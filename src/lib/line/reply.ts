const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export type LineReplyMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "sticker";
      packageId: string;
      stickerId: string;
    };

export async function sendLineReplyMessages(
  replyToken: string,
  messages: LineReplyMessage[],
  logLabel = "LINE webhook"
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const hasReplyToken = Boolean(replyToken?.trim());
  const replyMessages = messages.slice(0, 5);

  console.log(`[${logLabel}] sendLineReply before:`, {
    hasReplyToken,
    hasAccessToken: Boolean(accessToken),
    messageCount: replyMessages.length,
  });

  if (!accessToken) {
    console.warn("[LINE] Channel access token not configured, skipping reply");
    return { ok: false, error: "LINE not configured" };
  }

  if (!hasReplyToken) {
    console.error(`[${logLabel}] sendLineReply: missing replyToken`);
    return { ok: false, error: "Missing reply token" };
  }

  if (!replyMessages.length) {
    console.error(`[${logLabel}] sendLineReply: missing messages`);
    return { ok: false, error: "Missing messages" };
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
        messages: replyMessages,
      }),
    });

    const body = await res.text();

    if (!res.ok) {
      console.error(`[${logLabel}] sendLineReply failed:`, {
        status: res.status,
        body,
      });
      return { ok: false, status: res.status, error: body };
    }

    console.log(`[${logLabel}] sendLineReply success:`, {
      status: res.status,
      body: body || "(empty)",
    });
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${logLabel}] sendLineReply exception:`, err);
    return { ok: false, error: msg };
  }
}

export async function sendLineReply(
  replyToken: string,
  message: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  return sendLineReplyMessages(
    replyToken,
    [{ type: "text", text: message }],
    "LINE webhook bind"
  );
}
