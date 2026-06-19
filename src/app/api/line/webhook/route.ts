import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleLineBindMessage } from "@/lib/data/line-bind-tokens";
import { fetchLineUserProfile } from "@/lib/line/profile";

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
  if (event.message?.type !== "text") return;

  const text = event.message.text?.trim() ?? "";
  const match = text.match(BIND_MESSAGE_PATTERN);
  if (!match) return;

  console.log("[LINE webhook] bind attempt, token:", match[1]);
  await handleLineBindMessage(
    match[1],
    event.source?.userId,
    event.replyToken
  );
}

/**
 * POST /api/line/webhook
 *
 * LINE Messaging API Webhook（除錯 log + 綁定碼處理）
 */
export async function POST(request: NextRequest) {
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

  for (const event of events) {
    await logWebhookEvent(event);
    if (event.type === "message") {
      await handleMessageEvent(event);
    }
  }

  return NextResponse.json({ ok: true });
}

/** LINE Verify / 健康檢查 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
