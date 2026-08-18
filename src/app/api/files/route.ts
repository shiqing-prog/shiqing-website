import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/data";
import { getFileBase } from "@/lib/fileticket";

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const db = await getDb();
  const base = await getFileBase();
  const { files, total } = await db.listFiles({ page, pageSize: 20 });
  const items = files.map((f) => ({
    ...f,
    url: `${base}/download/${f.id}`,
  }));
  return NextResponse.json({ files: items, total });
}
