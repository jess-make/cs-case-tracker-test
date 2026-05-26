import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CaseDetailPanel } from "@/components/cases/CaseDetailPanel";
import { getCaseById, getCaseLogs } from "@/lib/data/cases";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [caseData, logsResult] = await Promise.all([
    getCaseById(id),
    getCaseLogs(id).catch(() => [] as Awaited<ReturnType<typeof getCaseLogs>>),
  ]);

  const logs = logsResult ?? [];

  if (!caseData) {
    return (
      <div>
        <Link
          href="/cases"
          className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-800">找不到案件</p>
          <p className="mt-2 text-sm text-slate-500">
            案件可能已刪除或編號不正確。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/cases"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      <CaseDetailPanel caseData={caseData} logs={logs} />
    </div>
  );
}
