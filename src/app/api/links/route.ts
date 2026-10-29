import { NextResponse, type NextRequest } from "next/server";
import { asString, isUniqueViolation, readJsonBody, serverError } from "@/lib/http";
import { getDb } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  MAX_CODE_LEN,
  MAX_URL_LEN,
  isValidShortCode,
  normalizeTarget,
  randomShortCode,
} from "@/lib/shortlink";

/** 每人最多保留多少条短链 */
const MAX_LINKS_PER_USER = 200;
/** 每天最多新建多少条 */
const CREATE_PER_DAY = 20;
/** 随机短码撞车时的重试次数 */
const CODE_RETRY = 6;

/** GET /api/links —— 当前用户的短链列表（不含别人的） */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const db = await getDb();
    const links = await db.listShortLinks(user.id);
    const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
    return NextResponse.json({
      links,
      total: links.length,
      totalClicks,
      quota: MAX_LINKS_PER_USER,
    });
  } catch (err) {
    return serverError("links.list", err);
  }
}

/** POST /api/links —— 新建短链，body: { url, code? } */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });

  const target = normalizeTarget(asString(body.url, MAX_URL_LEN));
  if (!target) {
    return NextResponse.json(
      { error: "请填写合法的链接（只支持 http / https，最长 2000 字符）" },
      { status: 400 }
    );
  }

  const custom = asString(body.code, MAX_CODE_LEN);
  if (custom && !isValidShortCode(custom)) {
    return NextResponse.json(
      { error: "短码只能包含字母、数字、下划线和短横线，长度 4–32 位" },
      { status: 400 }
    );
  }

  try {
    const rl = await checkRateLimit(`link:create:${user.id}`, CREATE_PER_DAY, 24 * 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `今天创建的短链太多了（每天 ${CREATE_PER_DAY} 条），明天再来吧` },
        { status: 429 }
      );
    }

    const db = await getDb();
    const count = await db.countShortLinks(user.id);
    if (count >= MAX_LINKS_PER_USER) {
      return NextResponse.json(
        { error: `每人最多保留 ${MAX_LINKS_PER_USER} 条短链，请先删除一些` },
        { status: 400 }
      );
    }

    let code = custom;
    if (code) {
      const taken = await db.getShortLink(code);
      if (taken) {
        return NextResponse.json({ error: "这个短码已经被占用了，换一个试试" }, { status: 409 });
      }
    } else {
      for (let i = 0; i < CODE_RETRY; i++) {
        const candidate = randomShortCode();
        if (!(await db.getShortLink(candidate))) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return NextResponse.json({ error: "短码生成失败，请稍后重试" }, { status: 503 });
      }
    }

    const link = {
      code,
      url: target,
      created_by: user.id,
      created_at: new Date().toISOString(),
      clicks: 0,
    };
    try {
      await db.createShortLink(link);
    } catch (err) {
      // 自定义短码在「查」与「写」之间可能被别人抢走：主键冲突映射成 409，而不是 500
      if (isUniqueViolation(err)) {
        return NextResponse.json({ error: "这个短码已经被占用了，换一个试试" }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    return serverError("links.create", err);
  }
}
