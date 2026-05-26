import { NextRequest, NextResponse } from "next/server";
import { getCases, getHandlers } from "@/lib/data/cases";
import { notifyCaseOverdue, isLineConfigured } from "@/lib/line/notify";
import { formatDate } from "@/lib/utils";

/**
 * POST /api/cron/overdue
 *
 * 逾期案件掃描與 LINE 通知（預留，可由 Vercel Cron 或外部排程觸發）
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const cases = await getCases();
  const handlers = await getHandlers();
  const overdue = cases.filter((c) => c.is_overdue && c.status !== "closed");

  const notifications: { caseId: string; sent: boolean }[] = [];

  if (isLineConfigured()) {
    for (const c of overdue) {
      const assignee = handlers.find((h) => h.id === c.assignee_id);
      if (assignee?.line_user_id && c.due_date) {
        const result = await notifyCaseOverdue({
          caseNumber: c.case_number,
          recipientLineUserId: assignee.line_user_id,
          assigneeName: assignee.name,
          dueDate: formatDate(c.due_date),
        });
        notifications.push({ caseId: c.id, sent: result.ok });
      } else {
        notifications.push({ caseId: c.id, sent: false });
      }
    }
  }

  return NextResponse.json({
    scanned: cases.length,
    overdue: overdue.length,
    lineConfigured: isLineConfigured(),
    notifications,
  });
}
