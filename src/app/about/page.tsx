import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于本站",
  description: "关于本站的介绍、技术栈与联系方式。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="border-l-4 border-blue-600 pl-3 text-3xl font-bold">关于本站</h1>

      <div className="kratos-card mt-6 p-6 leading-relaxed text-gray-700 dark:text-gray-300">
        <p>
          欢迎来到 <strong>ShiQing 时倾</strong> —— 一个无人知晓的小站点。
        </p>
        <p className="mt-3">
          这里最初是一个个人网站，现在已经演化成一个社区论坛：注册账号、发帖交流、
          分享文件，也保留了工具、更新日志等板块。
        </p>
      </div>

      <h2 className="mt-10 border-l-4 border-blue-600 pl-3 text-xl font-bold">站点信息</h2>
      <div className="kratos-card mt-4 p-6 text-sm text-gray-600 dark:text-gray-300">
        <ul className="space-y-2">
          <li>🚀 技术栈：Next.js 16 (App Router) + TypeScript + Tailwind CSS</li>
          <li>☁️ 部署：Cloudflare Workers + D1 数据库</li>
          <li>📁 文件库：本机存储（F:\filelib），经 Cloudflare Tunnel 提供服务</li>
          <li>🎨 风格：仿 xingye.me（Kratos 主题）</li>
          <li>📦 版本：持续迭代，详见<a href="/changelog" className="text-blue-600 hover:underline dark:text-blue-400"> 更新日志</a></li>
        </ul>
      </div>

      <h2 className="mt-10 border-l-4 border-blue-600 pl-3 text-xl font-bold">联系我</h2>
      <div className="kratos-card mt-4 p-6 text-sm text-gray-700 dark:text-gray-300">
        <p>
          📧 邮箱：{" "}
          <a href="mailto:you@example.com" className="text-blue-600 hover:underline dark:text-blue-400">
            you@example.com
          </a>
        </p>
        <p className="mt-2">
          🐙 GitHub：{" "}
          <a href="https://github.com/yourname" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
            github.com/yourname
          </a>
        </p>
      </div>
    </div>
  );
}
