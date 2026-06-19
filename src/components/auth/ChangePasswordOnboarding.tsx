"use client";

import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { LineBindSection } from "@/components/auth/LineBindSection";
import type { ActiveLineBindToken } from "@/lib/data/line-bind-tokens";

interface ChangePasswordOnboardingProps {
  mustChangePassword: boolean;
  mustBindLine: boolean;
  lineBound: boolean;
  initialToken: ActiveLineBindToken | null;
}

export function ChangePasswordOnboarding({
  mustChangePassword,
  mustBindLine,
  lineBound,
  initialToken,
}: ChangePasswordOnboardingProps) {
  return (
    <div className="space-y-6">
      {mustChangePassword ? (
        <section>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">設定新密碼</h2>
          <p className="mb-4 text-sm text-slate-600">
            首次登入須先修改密碼。密碼至少 8 碼，需包含英文與數字。
          </p>
          <ChangePasswordForm />
        </section>
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-900">密碼已更新</h2>
          <p className="mt-1 text-sm text-emerald-800">請繼續完成 LINE 綁定後即可進入系統。</p>
        </section>
      )}

      <LineBindSection
        mustBindLine={mustBindLine}
        initiallyBound={lineBound}
        initialToken={initialToken}
      />
    </div>
  );
}
