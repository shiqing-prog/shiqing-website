import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, uid } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { getScale } from "@/lib/psych/scales";
import { checkRateLimit } from "@/lib/ratelimit";
import type { PsychResultRecord } from "@/lib/types";

/**
 * GET /api/psych/results —— 我的测评记录（含重新评分后的解读）
 * POST /api/psych/results —— 提交答案：服务端重新评分后入库（不信任前端分数）
 */

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const db = await getDb();
  const records = await db.listPsychResults(user.id, 100);
  return NextResponse.json({
    results: records.map((r) => {
      const scale = getScale(r.scale_slug);
      let result = null;
      if (scale) {
        try {
          result = scale.score(JSON.parse(r.answers) as number[]);
        } catch {
          result = null;
        }
      }
      return {
        id: r.id,
        scale_slug: r.scale_slug,
        scale_name: scale?.name ?? r.scale_slug,
        created_at: r.created_at,
        total: r.total,
        max: r.max,
        level: r.level,
        level_key: r.level_key,
        result,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 每人 10 分钟最多提交 30 次
  const limit = checkRateLimit(`psych:${user.id}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "提交过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { slug?: string; answers?: unknown };
    const scale = getScale(String(body.slug ?? ""));
    if (!scale) return NextResponse.json({ error: "量表不存在" }, { status: 400 });

    const answers = body.answers;
    if (!Array.isArray(answers) || answers.length !== scale.questions.length) {
      return NextResponse.json(
        { error: `答案数量不匹配（应为 ${scale.questions.length} 题）` },
        { status: 400 }
      );
    }
    const allowed = new Set(scale.options.map((o) => o.value));
    if (answers.some((a) => typeof a !== "number" || !allowed.has(a))) {
      return NextResponse.json({ error: "答案取值非法" }, { status: 400 });
    }

    const result = scale.score(answers as number[]);
    const record: PsychResultRecord = {
      id: uid(),
      user_id: user.id,
      scale_slug: scale.slug,
      total: result.total,
      max: result.max,
      level: result.level,
      level_key: result.levelKey,
      type_code: result.typeCode ?? null,
      answers: JSON.stringify(answers),
      created_at: new Date().toISOString(),
    };
    const db = await getDb();
    await db.createPsychResult(record);
    return NextResponse.json({ ok: true, id: record.id, result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
