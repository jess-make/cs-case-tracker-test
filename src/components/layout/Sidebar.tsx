"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, List, Users, Building2, Tags, Radio, X, LogOut } from "lucide-react";
import { BrandHeader } from "./BrandLogo";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import { canCreateCase, canManageUsers } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";

const baseNavItems = [
  { href: "/", label: "案件總覽", icon: LayoutDashboard },
  { href: "/cases/new", label: "建立案件", icon: PlusCircle, requiresCreate: true },
  { href: "/cases", label: "案件列表", icon: List },
  { href: "/complaint-sources", label: "客訴來源管理", icon: Radio, requiresAdmin: true },
  { href: "/complaint-categories", label: "客訴類別管理", icon: Tags, requiresAdmin: true },
  { href: "/departments", label: "部門管理", icon: Building2, requiresAdmin: true },
  { href: "/users", label: "使用者管理", icon: Users, requiresAdmin: true },
] as const;

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  user: SessionUser;
}

export function Sidebar({ open = false, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const navItems = baseNavItems.filter((item) => {
    if ("requiresCreate" in item && item.requiresCreate) {
      return canCreateCase(user);
    }
    if ("requiresAdmin" in item && item.requiresAdmin) {
      return canManageUsers(user.role);
    }
    return true;
  });

  function handleNavClick() {
    onClose?.();
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 lg:px-5 lg:py-5">
        <BrandHeader logoSize="lg" className="flex-1" priority />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-brand-50 hover:text-grevia-green lg:hidden"
          aria-label="關閉選單"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-grevia-green bg-brand-50 text-grevia-green"
                  : "border-transparent text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-grevia-green"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-grevia-green" : "text-slate-500 group-hover:text-grevia-green"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-sm font-medium text-slate-800">{user.name}</p>
          {user.department && (
            <p className="mt-0.5 text-xs text-slate-500">{user.department}</p>
          )}
        </div>
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:text-grevia-green"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            登出
          </button>
        </form>
      </div>
    </aside>
  );
}
