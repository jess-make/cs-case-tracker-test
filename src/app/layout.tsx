import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/AppLayout";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | ${APP_SUBTITLE}`,
  description: APP_SUBTITLE,
  applicationName: APP_NAME,
  icons: {
    icon: [{ url: "/grevia-logo.png", type: "image/png" }],
    apple: [{ url: "/grevia-logo.png", type: "image/png" }],
  },
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
