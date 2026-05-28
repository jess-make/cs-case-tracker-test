import { AppShell } from "./AppShell";
import type { SessionUser } from "@/lib/auth/session";

export function AppLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  return <AppShell user={user}>{children}</AppShell>;
}
