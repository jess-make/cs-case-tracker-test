"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases/new", label: "建立案件", icon: PlusCircle },
  { href: "/cases", label: "案件列表", icon: List },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900">CS Case Tracker</h1>
          <p className="text-xs text-slate-500">客訴案件管理系統</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium text-slate-700">王小美</p>
          <p className="text-xs text-slate-500">客服 · 客服部</p>
        </div>
      </div>
    </aside>
  );
}
