import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleLineBindMessage } from "@/lib/data/line-bind-tokens";
import { fetchLineUserProfile } from "@/lib/line/profile";
import {
  sendLineReplyMessages,
  type LineReplyMessage,
} from "@/lib/line/reply";

/** 避免 trailing slash 造成 308 redirect（與 next.config trailingSlash: false 一致） */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: {
    userId?: string;
    type?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
}

const BIND_MESSAGE_PATTERN = /^綁定\s+([A-Za-z0-9]{6})$/i;
const DEFAULT_REPLY_TEXT =
  "感謝尼的訊息！\n\n很抱歉，我知道尼很想跟我聊天\n但目前我還無法個別回覆訊息。\n有問題請洽客服部喔！";

function buildDefaultReplyMessages(): LineReplyMessage[] {
  const text = (
    process.env.LINE_DEFAULT_REPLY_TEXT?.trim() || DEFAULT_REPLY_TEXT
  ).replace(/\\n/g, "\n");
  const stickerPackageId = process.env.LINE_DEFAULT_REPLY_STICKER_PACKAGE_ID?.trim();
  const stickerId = process.env.LINE_DEFAULT_REPLY_STICKER_ID?.trim();

  const messages: LineReplyMessage[] = [{ type: "text", text }];
  if (stickerPackageId && stickerId) {
    messages.push({
      type: "sticker",
      packageId: stickerPackageId,
      stickerId,
    });
  }
  return messages;
}

async function sendDefaultReply(replyToken: string | undefined): Promise<void> {
  const token = replyToken?.trim();
  if (!token) {
    console.log("[LINE webhook] default reply skip: missing replyToken");
    return;
  }

  const result = await sendLineReplyMessages(
    token,
    buildDefaultReplyMessages(),
    "LINE webhook default"
  );
  console.log("[LINE webhook] default reply result:", result);
}

async function logWebhookEvent(event: LineWebhookEvent): Promise<void> {
  console.log("[LINE webhook] type:", event.type);
  console.log("[LINE webhook] userId:", event.source?.userId);
  console.log("[LINE webhook] event:", JSON.stringify(event));

  const userId = event.source?.userId?.trim();
  if (event.type === "follow" && userId) {
    const profile = await fetchLineUserProfile(userId);
    if (profile?.displayName) {
      console.log("[LINE webhook] displayName:", profile.displayName);
    }
  }
}

async function handleMessageEvent(event: LineWebhookEvent): Promise<void> {
  const messageText = event.message?.text ?? "";
  const sourceUserId = event.source?.userId;
  const replyToken = event.replyToken;

  console.log("[LINE webhook] bind message event:", {
    messageType: event.message?.type ?? null,
    messageText,
    hasSourceUserId: Boolean(sourceUserId?.trim()),
    sourceUserId: sourceUserId ?? null,
    hasReplyToken: Boolean(replyToken?.trim()),
  });

  if (event.message?.type !== "text") {
    console.log("[LINE webhook] default reply: message is not text type");
    await sendDefaultReply(replyToken);
    return;
  }

  const trimmedText = messageText.trim();
  const match = trimmedText.match(BIND_MESSAGE_PATTERN);

  console.log("[LINE webhook] bind parse:", {
    trimmedText,
    pattern: BIND_MESSAGE_PATTERN.toString(),
    matched: Boolean(match),
    parsedToken: match?.[1] ? match[1].toUpperCase() : null,
  });

  if (!match) {
    console.log("[LINE webhook] default reply: text does not match bind format");
    await sendDefaultReply(replyToken);
    return;
  }

  const parsedToken = match[1].toUpperCase();
  console.log("[LINE webhook] bind attempt start:", {
    parsedToken,
    sourceUserId: sourceUserId ?? null,
    hasReplyToken: Boolean(replyToken?.trim()),
  });

  try {
    await handleLineBindMessage(parsedToken, sourceUserId, replyToken);
    console.log("[LINE webhook] bind attempt finished:", { parsedToken });
  } catch (err) {
    console.error("[LINE webhook] bind attempt error:", err);
    throw err;
  }
}

/**
 * POST /api/line/webhook
 *
 * LINE Messaging API Webhook（除錯 log + 綁定碼處理）
 */
export async function POST(request: NextRequest) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) {
      return NextResponse.json(
        { message: "LINE webhook not configured" },
        { status: 503 }
      );
    }

    const signature = request.headers.get("x-line-signature");
    const body = await request.text();

    if (signature) {
      const hash = crypto
        .createHmac("SHA256", channelSecret)
        .update(body)
        .digest("base64");

      if (hash !== signature) {
        return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
      }
    }

    const events: LineWebhookEvent[] = JSON.parse(body).events ?? [];
    console.log("[LINE webhook] received events count:", events.length);

    for (const event of events) {
      try {
        await logWebhookEvent(event);
        if (event.type === "message") {
          await handleMessageEvent(event);
        }
      } catch (err) {
        console.error("[LINE webhook] event processing error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LINE webhook] POST handler error:", err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

/** LINE Verify / 健康檢查 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
