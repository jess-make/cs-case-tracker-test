"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-grevia-green focus:outline-none focus:ring-2 focus:ring-grevia-green/20"
          placeholder="name@company.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-grevia-green focus:outline-none focus:ring-2 focus:ring-grevia-green/20"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-grevia-green px-4 py-2.5 text-sm font-medium text-white hover:bg-grevia-green-dark disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        登入
      </button>
    </form>
  );
}
