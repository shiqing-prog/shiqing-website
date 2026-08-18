import { NextResponse } from "next/server";
import { getDb } from "@/lib/data";

export async function GET() {
  const db = await getDb();
  const boards = await db.listBoards();
  return NextResponse.json(boards);
}
