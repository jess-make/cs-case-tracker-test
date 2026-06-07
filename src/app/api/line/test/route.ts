import { NextResponse } from "next/server";
import { sendLinePush } from "@/lib/line/notify";

export async function GET() {
  const userId = process.env.LINE_USER_ID?.trim();

  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error: "LINE_USER_ID not configured",
      },
      { status: 500 }
    );
  }

  const result = await sendLinePush(
    userId,
    "🎉 Grevia 客服系統 LINE 通知測試成功！"
  );

  return NextResponse.json(result);
}