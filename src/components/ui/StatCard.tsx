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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={cn("rounded-lg p-3", colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
