"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { BrandHeader } from "./BrandLogo";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
          aria-label="開啟選單"
        >
          <Menu className="h-6 w-6" />
        </button>
        <BrandHeader logoSize="md" showSubtitle className="min-w-0 flex-1" />
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="關閉選單"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:ml-64 lg:min-h-screen lg:p-8">
        {children}
      </main>
    </div>
  );
}
