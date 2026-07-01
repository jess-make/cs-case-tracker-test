import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FolderOpen,
  Loader,
  UserMinus,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CaseTable } from "@/components/cases/CaseTable";
import { getCases } from "@/lib/data/cases";
import { requireUser } from "@/lib/auth/session";
import {
  buildDashboardStats,
  getDashboardCases,
  parseDashboardCaseFilter,
  type DashboardCaseFilter,
} from "@/lib/dashboard-cases";

interface PageProps {
  searchParams: Promise<{
    dashboard?: string;
  }>;
}

const DASHBOARD_FILTER_LABELS: Record<DashboardCaseFilter, string> = {
  month: "本月案件",
  unassigned: "未指派",
  in_progress: "處理中",
  pending_close: "待結案",
  closed: "已結案",
};

function dashboardHref(filter: DashboardCaseFilter, active: boolean): string {
  return active ? "/" : `/?dashboard=${filter}`;
}

function formatMonthDelta(delta: number): string {
  if (delta > 0) return `本月新增 ${delta} 件`;
  if (delta < 0) return `本月減少 ${Math.abs(delta)} 件`;
  return "本月持平";
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const allCases = await getCases(user);
  const stats = buildDashboardStats(allCases);

  const activeFilter = parseDashboardCaseFilter(params.dashboard);
  const displayedCases = activeFilter
    ? getDashboardCases(allCases, activeFilter)
    : allCases.slice(0, 5);
  const sectionTitle = activeFilter
    ? DASHBOARD_FILTER_LABELS[activeFilter]
    : "最近案件";

  const cards: Array<{
    filter: DashboardCaseFilter;
    title: string;
    value: number;
    icon: typeof FolderOpen;
    color: "green" | "slate" | "amber" | "cyan" | "emerald";
    detail?: string;
  }> = [
    {
      filter: "month",
      title: "本月案件",
      value: stats.currentMonth,
      icon: FolderOpen,
      color: "green",
      detail: `上個月 ${stats.previousMonth} 件，\n${formatMonthDelta(stats.monthDelta)}`,
    },
    {
      filter: "unassigned",
      title: "未指派",
      value: stats.unassigned,
      icon: UserMinus,
      color: "slate",
    },
    {
      filter: "in_progress",
      title: "處理中",
      value: stats.inProgress,
      icon: Loader,
      color: "amber",
    },
    {
      filter: "pending_close",
      title: "待結案",
      value: stats.pendingClose,
      icon: Clock,
      color: "cyan",
    },
    {
      filter: "closed",
      title: "已結案",
      value: stats.closed,
      icon: CheckCircle2,
      color: "emerald",
    },
  ];

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">案件總覽</h1>
        <p className="mt-1 text-sm text-slate-500">客訴案件總覽</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-8 lg:grid-cols-5 lg:gap-3">
        {cards.map((card) => {
          const active = activeFilter === card.filter;
          return (
            <Link
              key={card.filter}
              href={dashboardHref(card.filter, active)}
              className="block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <StatCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                detail={card.detail}
                active={active}
              />
            </Link>
          );
        })}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {sectionTitle}
          </h2>
          <Link
            href="/cases"
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-brand-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <CaseTable cases={displayedCases} />
      </section>
    </div>
  );
}
