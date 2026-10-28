import { NextResponse, type NextRequest } from "next/server";
import { getProjects, createProject } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { serverError } from "@/lib/http";
import type { ProjectInput } from "@/lib/types";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });

  try {
    const body = (await request.json()) as ProjectInput;
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    // 不把 err.message 回给客户端：里面可能带 D1/SQLite 语句片段与表结构
    return serverError("projects.create", err, "创建项目失败");
  }
}
