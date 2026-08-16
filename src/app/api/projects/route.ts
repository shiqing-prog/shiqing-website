import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/store";
import type { ProjectInput } from "@/lib/types";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProjectInput;
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
