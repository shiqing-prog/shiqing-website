import { NextRequest } from "next/server";
import { apiError, apiJson, authenticate, enforceQuota, preflight } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { TOOL_MAP } from "@/lib/tools";
import { ToolError } from "@/lib/tools/types";

export const dynamic = "force-dynamic";

/** 工具接口每小时最多调用次数 */
const TOOL_HOURLY_LIMIT = 600;

export function OPTIONS() {
  return preflight();
}

type RouteContext = { params: Promise<{ tool: string[] }> };

async function handle(request: NextRequest, method: "GET" | "POST", context: RouteContext) {
  const { tool } = await context.params;
  const name = (tool ?? []).join("/");
  const definition = TOOL_MAP[name];
  if (!definition) {
    return apiError(404, "tool_not_found", "没有这个工具：" + name + "，可以请求 /api/v1/tools 查看全部");
  }
  if (!definition.methods.includes(method)) {
    return apiError(405, "method_not_allowed", "这个工具只支持 " + definition.methods.join(" / "), {
      allow: definition.methods.join(", "),
    });
  }

  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const quota = await enforceQuota(auth.auth);
  if (quota) return quota;

  const limitCheck = await checkRateLimit("api:tools:" + auth.auth.cardKey, TOOL_HOURLY_LIMIT, 3600 * 1000);
  if (!limitCheck.ok) {
    return apiError(429, "tool_hourly_limit", "工具接口每小时最多 " + TOOL_HOURLY_LIMIT + " 次", {
      "retry-after": String(Math.ceil((limitCheck.retryAfterMs ?? 3_600_000) / 1000)),
    });
  }

  let body: Record<string, unknown> | null = null;
  if (method === "POST") {
    const text = await request.text();
    if (text.trim() !== "") {
      try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return apiError(400, "invalid_body", "请求体必须是 JSON 对象");
        }
        body = parsed as Record<string, unknown>;
      } catch {
        return apiError(400, "invalid_json", "请求体不是合法 JSON");
      }
    }
  }

  const started = Date.now();
  try {
    const result = await definition.run({ request, params: request.nextUrl.searchParams, body });
    return apiJson({
      data: result,
      meta: {
        tool: definition.name,
        group: definition.group,
        duration_ms: Date.now() - started,
      },
    });
  } catch (error) {
    if (error instanceof ToolError) {
      return apiError(error.status, error.code, error.message);
    }
    console.error("[tools] " + definition.name + " failed", error);
    return apiError(500, "tool_failed", "工具执行失败，请稍后重试");
  }
}

/** GET /api/v1/tools/<group>/<tool>?参数… */
export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, "GET", context);
}

/** POST /api/v1/tools/<group>/<tool>，参数可放在 JSON 请求体里 */
export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, "POST", context);
}
