import { requireUser } from "@/lib/auth/session";
import { canCreateCase, canUpdateCase } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

export async function requireActor(): Promise<SessionUser> {
  return requireUser();
}

export async function requireCreatePermission(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canCreateCase(user.role)) {
    throw new Error("無權限建立案件");
  }
  return user;
}

export async function requireUpdatePermission(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canUpdateCase(user.role)) {
    throw new Error("無權限更新案件");
  }
  return user;
}
