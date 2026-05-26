import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "客服案件追蹤平台 | 客訴立案・處理・結案管理",
  description: "客訴立案・處理・結案管理",
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
