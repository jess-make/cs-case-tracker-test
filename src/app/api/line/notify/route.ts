import { NextRequest, NextResponse } from "next/server";
import { getCaseById } from "@/lib/data/cases";
import {
  notifyCaseCreated,
  notifyCaseClosed,
  notifyCaseReplied,
  notifyDepartmentAssigned,
} from "@/lib/line/case-notifications";
import { isLineConfigured, isLineNotifyApiAuthorized } from "@/lib/line/notify";

const NOTIFY_TYPES = [
  "case_created",
  "department_assigned",
  "case_replied",
  "case_closed",
] as const;

type LineNotifyApiType = (typeof NOTIFY_TYPES)[number];

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

/**
 * POST /api/line/notify
 *
 * 手動觸發 LINE 通知（測試 / 外部整合）
 * Header: Authorization: Bearer {LINE_NOTIFY_INTERNAL_SECRET}
 *
 * Body: { type, caseId, actorId?, replyContent? }
 */
export async function POST(request: NextRequest) {
  if (!isLineNotifyApiAuthorized(request.headers.get("authorization"))) {
    return unauthorized();
  }

  if (!isLineConfigured()) {
    return NextResponse.json(
      { ok: false, message: "LINE Messaging API 尚未設定" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { type, caseId, actorId, replyContent } = body as {
      type: LineNotifyApiType;
      caseId: string;
      actorId?: string;
      replyContent?: string;
    };

    if (!caseId || !type) {
      return NextResponse.json(
        { ok: false, error: "缺少 type 或 caseId" },
        { status: 400 }
      );
    }

    const caseData = await getCaseById(caseId);
    if (!caseData) {
      return NextResponse.json({ ok: false, error: "案件不存在" }, { status: 404 });
    }

    switch (type) {
      case "case_created":
        await notifyCaseCreated(caseData);
        break;
      case "department_assigned":
        await notifyDepartmentAssigned(caseData);
        break;
      case "case_replied": {
        if (!actorId) {
          return NextResponse.json(
            { ok: false, error: "case_replied 需要 actorId" },
            { status: 400 }
          );
        }
        const { fetchUserById } = await import("@/lib/line/recipients");
        const actor = await fetchUserById(actorId);
        if (!actor) {
          return NextResponse.json(
            { ok: false, error: "找不到 actor 使用者" },
            { status: 404 }
          );
        }
        await notifyCaseReplied(
          caseData,
          {
            id: actor.id,
            name: actor.name,
            role: actor.role,
            department: actor.department,
          },
          replyContent ?? "（測試回覆）"
        );
        break;
      }
      case "case_closed":
        await notifyCaseClosed(caseData);
        break;
      default:
        return NextResponse.json(
          { ok: false, error: "Unknown notification type" },
          { status: 400 }
        );
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
    notifyApiProtected: Boolean(process.env.LINE_NOTIFY_INTERNAL_SECRET?.trim()),
    endpoints: {
      notify: "POST /api/line/notify",
      webhook: "POST /api/line/webhook",
    },
    types: NOTIFY_TYPES,
  });
}
