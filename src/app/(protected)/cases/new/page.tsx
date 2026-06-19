import { redirect } from "next/navigation";
import { CreateCaseForm } from "@/components/cases/CreateCaseForm";
import { requireUser } from "@/lib/auth/session";
import { canCreateCase } from "@/lib/auth/permissions";
import { getActiveDepartmentNames } from "@/lib/data/departments";
import {
  getCategoryIssueTaxonomy,
  getSourceChannelTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";

export default async function NewCasePage() {
  const user = await requireUser();
  if (!canCreateCase(user)) {
    redirect("/cases");
  }

  const [activeDepartments, categoryIssueTaxonomy, sourceChannelTaxonomy] =
    await Promise.all([
      getActiveDepartmentNames().catch(() => [] as string[]),
      getCategoryIssueTaxonomy().catch(() => ({
        categories: [],
        issuesByCategoryId: {},
        issuesByCategoryName: {},
      })),
      getSourceChannelTaxonomy().catch(() => ({
        sources: [],
        channelsBySourceId: {},
        channelsBySourceName: {},
      })),
    ]);

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">建立案件</h1>
        <p className="mt-1 text-sm text-slate-500">填寫客訴資訊並建立案件</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CreateCaseForm
          activeDepartments={activeDepartments}
          categoryIssueTaxonomy={categoryIssueTaxonomy}
          sourceChannelTaxonomy={sourceChannelTaxonomy}
        />
      </div>
    </div>
  );
}
