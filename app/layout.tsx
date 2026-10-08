import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "蹭饭地图 · 我的大学食堂足迹",
  description: "记录去过的大学，点亮中国的城市和省份。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
