import { redirect } from "next/navigation";
import { CaseAssignmentRulesPanel } from "@/components/case-assignment-rules/CaseAssignmentRulesPanel";
import { canManageCaseAssignmentRules } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getCaseAssignmentRulesForManagement } from "@/lib/data/case-assignment-rules";
import { getCategoryIssueTaxonomy } from "@/lib/data/complaint-taxonomy-form";
import { getCaseAssignableDepartmentNames } from "@/lib/data/departments";

export default async function CaseAssignmentRulesPage() {
  const currentUser = await requireUser();
  if (!canManageCaseAssignmentRules(currentUser)) {
    redirect("/");
  }

  const [assignmentRules, categoryIssueTaxonomy, departmentOptions] =
    await Promise.all([
      getCaseAssignmentRulesForManagement(),
      getCategoryIssueTaxonomy({ useAdmin: true }).catch(() => ({
        categories: [],
        issuesByCategoryId: {},
        issuesByCategoryName: {},
      })),
      getCaseAssignableDepartmentNames().catch(() => [] as string[]),
    ]);

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          案件指派規則
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {assignmentRules.rules.length} 條規則 · 僅系統管理員可編輯
        </p>
      </div>

      <CaseAssignmentRulesPanel
        rules={assignmentRules.rules}
        categories={categoryIssueTaxonomy.categories}
        issuesByCategoryName={categoryIssueTaxonomy.issuesByCategoryName}
        departmentOptions={departmentOptions}
        schemaReady={assignmentRules.schemaReady}
        usingFallback={assignmentRules.usingFallback}
      />
    </div>
  );
}

