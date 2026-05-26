import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "CS Case Tracker | 客訴案件管理系統",
  description: "客訴案件追蹤與管理系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
