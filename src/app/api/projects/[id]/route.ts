import { NextResponse } from "next/server";
import { updateProject, deleteProject } from "@/lib/store";
import type { ProjectInput } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/projects/[id]">
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ProjectInput;
    const project = await updateProject(id, body);
    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/projects/[id]">
) {
  try {
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
