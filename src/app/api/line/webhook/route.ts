import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/line/webhook
 *
 * LINE Messaging API Webhook 接收端點（預留）
 * 用於接收使用者回覆、已讀回執等事件
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

  const events = JSON.parse(body).events ?? [];

  for (const event of events) {
    console.log("[LINE Webhook]", event.type, event);
    // 預留：處理 message、follow、postback 等事件
  }

  return NextResponse.json({ ok: true });
}
