import type { Metadata } from "next";
import { getProjects } from "@/lib/store";
import { ProjectGrid } from "@/components/ProjectCard";

// 项目数据为运行时读取（线上 D1 site_content），跳过构建期预渲染
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "项目",
  description: "我做过的一些项目。",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">项目</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">
        共 {projects.length} 个项目，点击 GitHub 可以查看源码。
      </p>
      <div className="mt-8">
        {projects.length > 0 ? (
          <ProjectGrid projects={projects} />
        ) : (
          <p className="text-gray-500">还没有项目，去后台添加一个吧。</p>
        )}
      </div>
    </div>
  );
}
