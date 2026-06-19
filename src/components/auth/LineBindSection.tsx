"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import {
  generateLineBindTokenAction,
  getLineBindStatusAction,
  regenerateLineBindTokenAction,
} from "@/app/actions/line-bind";
import { APP_NAME } from "@/lib/constants";
import type { ActiveLineBindToken } from "@/lib/data/line-bind-tokens";

interface LineBindSectionProps {
  mustBindLine: boolean;
  initiallyBound: boolean;
  initialToken: ActiveLineBindToken | null;
}

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

export function LineBindSection({
  mustBindLine,
  initiallyBound,
  initialToken,
}: LineBindSectionProps) {
  const router = useRouter();
  const [bound, setBound] = useState(initiallyBound);
  const [token, setToken] = useState<ActiveLineBindToken | null>(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!mustBindLine || bound) return;

    const timer = setInterval(async () => {
      const status = await getLineBindStatusAction();
      if ("error" in status && status.error) return;
      if (status.bound) {
        setBound(true);
        router.refresh();
        if (status.onboardingComplete) {
          router.push("/");
        }
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [mustBindLine, bound, router]);

  function handleGenerate(regenerate = false) {
    setError(null);
    startTransition(async () => {
      const result = regenerate
        ? await regenerateLineBindTokenAction()
        : await generateLineBindTokenAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.success && result.token) {
        setToken(result.token);
      }
    });
  }

  if (!mustBindLine || initiallyBound) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-emerald-900">LINE 通知綁定</h3>
        <p className="mt-2 text-sm text-emerald-800">狀態：已綁定</p>
        <p className="mt-1 text-sm text-emerald-700">
          完成綁定後，案件通知會透過 LINE 傳送。
        </p>
      </section>
    );
  }

  const botName = APP_NAME.replace(/平台$/, "").trim();

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">LINE 通知綁定</h3>
      <p className="mt-1 text-sm text-slate-600">
        狀態：{bound ? "已綁定" : "尚未綁定"}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        完成綁定後，案件通知會透過 LINE 傳送給您。
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!bound && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-700">
            請加入 <span className="font-medium">{botName}</span>，並傳送：
          </p>

          {token ? (
            <div className="rounded-lg border border-brand-200 bg-white px-4 py-3">
              <p className="text-center font-mono text-lg font-semibold tracking-widest text-brand-700">
                綁定 {token.token}
              </p>
              <p className="mt-2 text-center text-xs text-slate-500">
                有效至 {formatExpiry(token.expiresAt)}（10 分鐘內有效）
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">請先產生綁定碼。</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleGenerate(Boolean(token))}
              disabled={pending}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-grevia-green px-4 py-2 text-sm font-medium text-white hover:bg-grevia-green-dark disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {token ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  重新產生綁定碼
                </>
              ) : (
                "產生綁定碼"
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            傳送綁定訊息後，此頁面會自動更新狀態；您也可以手動重新整理。
          </p>
        </div>
      )}
    </section>
  );
}
