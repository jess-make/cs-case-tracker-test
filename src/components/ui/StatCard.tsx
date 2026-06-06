import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: "green" | "slate" | "amber" | "cyan" | "emerald" | "red";
}

const colorMap = {
  green: "bg-brand-50 text-brand-600",
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-50 text-amber-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export function StatCard({ title, value, icon: Icon, color = "green" }: StatCardProps) {
  return (
    <div className="flex h-full min-h-[112px] flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:min-h-[120px] lg:min-h-[120px] lg:p-3.5 xl:p-4">
      <div className="flex flex-1 items-start justify-between gap-1.5 lg:gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate whitespace-nowrap text-xs font-semibold text-slate-700 sm:text-sm">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">{value}</p>
        </div>
        <div className={cn("shrink-0 rounded-lg p-1.5 sm:p-2 lg:p-2", colorMap[color])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
