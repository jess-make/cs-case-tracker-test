import Link from "next/link";
import {
  FolderOpen,
  Loader,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CaseTable } from "@/components/cases/CaseTable";
import { getDashboardStats, getCases } from "@/lib/data/cases";
import { isOverdue } from "@/lib/utils";

export default async function DashboardPage() {
  const [stats, allCases] = await Promise.all([
    getDashboardStats(),
    getCases(),
  ]);

  const overdueCases = allCases.filter(
    (c) =>
      c.status !== "closed" &&
      (c.is_overdue || (c.due_date && isOverdue(c.due_date, c.status)))
  );
  const recentCases = allCases.slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">客訴案件總覽</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="全部案件" value={stats.total} icon={FolderOpen} color="blue" />
        <StatCard title="處理中" value={stats.inProgress} icon={Loader} color="amber" />
        <StatCard title="待確認" value={stats.pendingConfirm} icon={Clock} color="cyan" />
        <StatCard title="已結案" value={stats.closed} icon={CheckCircle2} color="emerald" />
        <StatCard title="逾期案件" value={stats.overdue} icon={AlertTriangle} color="red" />
      </div>

      {overdueCases.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-red-700">逾期案件</h2>
          </div>
          <CaseTable cases={overdueCases} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">最近案件</h2>
          <Link
            href="/cases"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <CaseTable cases={recentCases} />
      </section>
    </div>
  );
}
