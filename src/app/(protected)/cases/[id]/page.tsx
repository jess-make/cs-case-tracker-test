import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CaseDetailPanel } from "@/components/cases/CaseDetailPanel";
import { getCaseById, getCaseLogs } from "@/lib/data/cases";
import {
  getCaseAttachments,
  legacyAttachmentsFromUrls,
} from "@/lib/data/attachments";
import { requireUser } from "@/lib/auth/session";
import { getCasePermissions } from "@/lib/auth/permissions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const currentUser = await requireUser();

  const [caseData, logsResult, caseAttachments] = await Promise.all([
    getCaseById(id, currentUser),
    getCaseLogs(id).catch(() => [] as Awaited<ReturnType<typeof getCaseLogs>>),
    getCaseAttachments(id).catch(() => []),
  ]);

  const logs = logsResult ?? [];
  const attachments =
    caseAttachments.length > 0
      ? caseAttachments
      : caseData
        ? legacyAttachmentsFromUrls(id, caseData.attachment_urls ?? [])
        : [];

  if (!caseData) {
    return (
      <div>
        <Link
          href="/cases"
          className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-12">
          <p className="text-lg font-medium text-slate-800">找不到案件</p>
          <p className="mt-2 text-sm text-slate-500">
            案件可能已刪除或編號不正確。
          </p>
        </div>
      </div>
    );
  }

  const permissions = getCasePermissions(currentUser, caseData);

  return (
    <div>
      <Link
        href="/cases"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-slate-500 hover:text-slate-700 lg:mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      <CaseDetailPanel
        caseData={caseData}
        logs={logs}
        attachments={attachments}
        permissions={permissions}
      />
    </div>
  );
}
