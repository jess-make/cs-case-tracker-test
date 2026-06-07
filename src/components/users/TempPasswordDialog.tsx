"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TempPasswordDialogProps {
  open: boolean;
  email: string;
  temporaryPassword: string;
  title: string;
  description: string;
  onClose: () => void;
}

export function TempPasswordDialog({
  open,
  email,
  temporaryPassword,
  title,
  description,
  onClose,
}: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="temp-password-title"
    >
      <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 id="temp-password-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          <p className="text-sm text-slate-600">{description}</p>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            臨時密碼僅顯示一次，請立即複製並安全地提供給使用者。關閉後無法再次查看。
          </div>

          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs font-medium text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">臨時密碼</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm tracking-wide text-slate-900">
                  {temporaryPassword}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50",
                    copied && "border-emerald-300 bg-emerald-50 text-emerald-700"
                  )}
                  aria-label="複製臨時密碼"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            我已複製，關閉
          </button>
        </div>
      </div>
    </div>
  );
}
