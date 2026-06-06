import Link from "next/link";
import { FolderOpen, FilePlus, Loader, CheckCircle2, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CaseTable } from "@/components/cases/CaseTable";
import { getDashboardStats, getCases } from "@/lib/data/cases";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, allCases] = await Promise.all([
    getDashboardStats(user),
    getCases(user),
  ]);

  const recentCases = allCases.slice(0, 5);

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">案件總覽</h1>
        <p className="mt-1 text-sm text-slate-500">客訴案件總覽</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-8 lg:grid-cols-5 lg:gap-3">
        <StatCard title="全部案件" value={stats.total} icon={FolderOpen} color="green" />
        <StatCard title="新案件" value={stats.newCases} icon={FilePlus} color="slate" />
        <StatCard title="處理中" value={stats.inProgress} icon={Loader} color="amber" />
        <StatCard title="待確認" value={stats.pendingConfirm} icon={Clock} color="cyan" />
        <StatCard title="已結案" value={stats.closed} icon={CheckCircle2} color="emerald" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">最近案件</h2>
          <Link
            href="/cases"
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-brand-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <CaseTable cases={recentCases} />
      </section>
    </div>
  );
}
