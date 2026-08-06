import { redirect } from "next/navigation";
import { ComplaintSourceManagementPanel } from "@/components/complaint-sources/ComplaintSourceManagementPanel";
import { getSourceChannelTaxonomy } from "@/lib/data/complaint-taxonomy-form";
import { requireUser } from "@/lib/auth/session";
import { canManageCaseTaxonomy } from "@/lib/auth/permissions";

export default async function ComplaintSourcesPage() {
  const currentUser = await requireUser();
  if (!canManageCaseTaxonomy(currentUser)) {
    redirect("/");
  }

  const { sources, channelsBySourceId } = await getSourceChannelTaxonomy({
    useAdmin: true,
  });

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          案件來源管理
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {sources.length} 個來源 · 僅系統管理員與曾郁茹可編輯 · 停用後不會出現在新案件選單，既有案件仍保留原名稱
        </p>
      </div>

      <ComplaintSourceManagementPanel
        sources={sources}
        channelsBySourceId={channelsBySourceId}
      />
    </div>
  );
}
