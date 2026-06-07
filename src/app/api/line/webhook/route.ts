import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchLineUserProfile } from "@/lib/line/profile";

/** 避免 trailing slash 造成 308 redirect（與 next.config trailingSlash: false 一致） */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface LineWebhookEvent {
  type: string;
  source?: {
    userId?: string;
    type?: string;
  };
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

/**
 * POST /api/line/webhook
 *
 * LINE Messaging API Webhook（除錯：log userId 供手動填入 users.line_user_id）
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
  }

  return NextResponse.json({ ok: true });
}

/** LINE Verify / 健康檢查 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
