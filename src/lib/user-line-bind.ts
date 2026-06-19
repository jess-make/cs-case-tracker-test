import type { User } from "@/types";

export type LineBindStatus = "bound" | "required" | "unbound";

export const LINE_BIND_INSTRUCTION_TEXT =
  "請登入客服系統，依照首次登入畫面完成密碼修改與 LINE 綁定。系統會產生 6 碼綁定碼，請到 Grevia LINE Bot 傳送「綁定 XXXXXX」。";

export const LINE_BIND_STATUS_LABELS: Record<LineBindStatus, string> = {
  bound: "已綁定",
  required: "需綁定",
  unbound: "未綁定",
};

export function getLineBindStatus(
  user: Pick<User, "line_user_id" | "must_bind_line">
): LineBindStatus {
  if (user.line_user_id?.trim()) return "bound";
  if (user.must_bind_line) return "required";
  return "unbound";
}
