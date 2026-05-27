import { NextRequest, NextResponse } from "next/server";
import {
  dispatchLineNotification,
  isLineConfigured,
  notifyCaseCreated,
  notifyCaseCompleted,
} from "@/lib/line/notify";
import type { LineNotifyType } from "@/lib/line/notify";

/**
 * POST /api/line/notify
 *
 * 預留 LINE 通知 API：
 * - case_created: 建立案件通知負責人
 * - case_completed: 處理完成通知客服
 */
export async function POST(request: NextRequest) {
  if (!isLineConfigured()) {
    return NextResponse.json(
      { ok: false, message: "LINE Messaging API 尚未設定" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { type } = body as { type: LineNotifyType };

    let result;

    switch (type) {
      case "case_created":
        result = await notifyCaseCreated(body);
        break;
      case "case_completed":
        result = await notifyCaseCompleted(body);
        break;
      default:
        result = await dispatchLineNotification(body);
    }

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isLineConfigured(),
    endpoints: {
      notify: "POST /api/line/notify",
      webhook: "POST /api/line/webhook",
    },
    types: ["case_created", "case_completed"],
  });
}
