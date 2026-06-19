import type { User } from "@/types";

export type LineBindStatus = "bound" | "required" | "unbound";

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
