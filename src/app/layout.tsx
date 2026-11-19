import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "哄哄模拟器 | 把愤怒值降到 0，把她哄回来",
  description:
    "女朋友生气了怎么办？在多轮对话里选出正确的回应，把她的愤怒值降到 0。意外事件攒好感，毕业考见真章——学会的每一招，现实里都能用。",
  keywords: ["哄哄模拟器", "哄女朋友", "恋爱游戏", "网页小游戏", "女朋友生气了"],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF6F1",
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
