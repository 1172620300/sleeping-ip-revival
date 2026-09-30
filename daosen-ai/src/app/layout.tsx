import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "道森 AI｜Phase 1 演示", template: "%s｜道森 AI" },
  description: "道森 AI 平台 Phase 1：仅用于演示的账号、登录与角色权限基础。",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    {/* Phase 1 Operate surface: preserve the established mineral-gray / ink-blue
        workbench. Prioritize account tasks, explicit states and readable forms;
        no live AI, business workflow or production-data claims. */}
    <AppShell>{children}</AppShell>
  </body></html>;
}
