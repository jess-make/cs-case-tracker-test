import { NextRequest, NextResponse } from "next/server";
import {
  dispatchLineNotification,
  isLineConfigured,
  notifyCaseCreated,
  notifyCaseCompleted,
  notifyCaseOverdue,
} from "@/lib/line/notify";
import type { LineNotifyType } from "@/lib/line/notify";

/**
 * POST /api/line/notify
 *
 * 預留 LINE 通知 API，支援三種通知類型：
 * - case_created: 建立案件通知負責人
 * - case_completed: 處理完成通知客服
 * - case_overdue: 逾期通知
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
      case "case_overdue":
        result = await notifyCaseOverdue(body);
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
      cron_overdue: "POST /api/cron/overdue",
    },
    types: ["case_created", "case_completed", "case_overdue"],
  });
}
