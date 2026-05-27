import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "GREVIA 客服案件追蹤平台 | 客訴立案・處理・結案管理",
  description: "客訴立案・處理・結案管理",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
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
