import { json, preflight } from "@/lib/cardServer";
import { nowSec } from "@/lib/card";

export function OPTIONS() {
  return preflight();
}

/** GET /api/card/ping —— 健康检查（无需鉴权） */
export function GET() {
  return json({ code: 0, msg: "pong", data: { time: nowSec() }, time: nowSec() });
}
