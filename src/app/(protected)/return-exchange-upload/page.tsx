import { redirect } from "next/navigation";
import { ReturnExchangeUploadPanel } from "@/components/return-exchange/ReturnExchangeUploadPanel";
import { requireUser } from "@/lib/auth/session";
import { canUploadReturnExchangeCases } from "@/lib/auth/permissions";

export default async function ReturnExchangeUploadPage() {
  const currentUser = await requireUser();
  if (!canUploadReturnExchangeCases(currentUser)) {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          退換貨案件上傳
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          上傳退換貨報表並確認資料內容
        </p>
      </div>

      <ReturnExchangeUploadPanel />
    </div>
  );
}
