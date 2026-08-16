import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我",
  description: "关于我的介绍、技能与联系方式。",
};

const skills = [
  "TypeScript",
  "React / Next.js",
  "Vue 3",
  "Node.js",
  "Tailwind CSS",
  "Git",
  "Docker",
  "PostgreSQL",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">关于我</h1>
      <div className="mt-6 space-y-5 leading-relaxed text-gray-700 dark:text-gray-300">
        <p>
          你好！我是 <strong>你的名字</strong>，一名前端开发者，目前专注于 Web
          应用的开发与性能优化。喜欢把复杂的问题拆解成简单优雅的方案。
        </p>
        <p>
          工作之余，我会维护一些开源项目，写博客记录学习心得。这个网站就是我自己
          用 Next.js 从零搭建的，既是作品集，也是实验场。
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold">技能</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {skills.map((s) => (
          <span
            key={s}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {s}
          </span>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-bold">联系我</h2>
      <div className="mt-5 space-y-2 text-gray-700 dark:text-gray-300">
        <p>
          📧 邮箱：{" "}
          <a
            href="mailto:you@example.com"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            you@example.com
          </a>
        </p>
        <p>
          🐙 GitHub：{" "}
          <a
            href="https://github.com/yourname"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            github.com/yourname
          </a>
        </p>
      </div>
    </div>
  );
}
