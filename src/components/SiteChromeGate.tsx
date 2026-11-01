"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 站点公共外壳（顶栏 / 页脚 / 悬浮件）的开关。
 * 文档站（/docs）有自己的布局，不需要主站导航 —— 否则从 docs.shiqing.site
 * 点「工具」「文件库」会跳到本域名的同名路径上 404。
 */
export default function SiteChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/docs" || pathname.startsWith("/docs/")) return null;
  return <>{children}</>;
}
