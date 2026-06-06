import Image from "next/image";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  DEACTIVATED_ACCOUNT_MESSAGE,
  DEACTIVATED_LOGIN_REASON,
} from "@/lib/auth/messages";

interface LoginPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const deactivatedMessage =
    params.reason === DEACTIVATED_LOGIN_REASON ? DEACTIVATED_ACCOUNT_MESSAGE : undefined;

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
          <LoginForm initialError={deactivatedMessage} />
        </div>
      </div>
    </div>
  );
}
