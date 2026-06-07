import Image from "next/image";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileFlags } from "@/lib/data/users";

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const flags = await getUserProfileFlags(user.id);
  if (flags?.is_active === false) {
    redirect("/login?reason=deactivated");
  }
  if (!flags?.must_change_password) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/grevia-logo-full.png"
            alt="Grevia Solution"
            width={280}
            height={72}
            className="h-auto w-full max-w-[280px] object-contain"
            priority
          />
          <h1 className="mt-6 text-lg font-semibold text-grevia-green sm:text-xl">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{APP_SUBTITLE}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">設定新密碼</h2>
          <p className="mb-6 text-sm text-slate-600">
            首次登入須先修改密碼。密碼至少 8 碼，需包含英文與數字。
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
