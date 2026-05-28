import { AppLayout } from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <AppLayout user={user}>{children}</AppLayout>;
}
