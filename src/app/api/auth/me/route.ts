import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  return NextResponse.json({ user });
}
