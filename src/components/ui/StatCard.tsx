import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: "blue" | "amber" | "cyan" | "emerald" | "red";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export function StatCard({ title, value, icon: Icon, color = "blue" }: StatCardProps) {
  return (
    <div className="flex h-full min-h-[112px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[120px] sm:p-6">
      <div className="flex flex-1 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">{value}</p>
        </div>
        <div className={cn("shrink-0 rounded-lg p-2 sm:p-3", colorMap[color])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
