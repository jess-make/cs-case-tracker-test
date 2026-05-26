import { CreateCaseForm } from "@/components/cases/CreateCaseForm";
import { getHandlers } from "@/lib/data/cases";

export default async function NewCasePage() {
  const handlers = await getHandlers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">建立案件</h1>
        <p className="mt-1 text-sm text-slate-500">填寫客訴資訊並指派處理人員</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CreateCaseForm handlers={handlers} />
      </div>
    </div>
  );
}
