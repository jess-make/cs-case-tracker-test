import { redirect } from "next/navigation";
import { CreateCaseForm } from "@/components/cases/CreateCaseForm";
import { requireUser } from "@/lib/auth/session";
import { canCreateCase } from "@/lib/auth/permissions";

export default async function NewCasePage() {
  const user = await requireUser();
  if (!canCreateCase(user.role)) {
    redirect("/cases");
  }
  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">建立案件</h1>
        <p className="mt-1 text-sm text-slate-500">填寫客訴資訊並建立案件</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CreateCaseForm />
      </div>
    </div>
  );
}
