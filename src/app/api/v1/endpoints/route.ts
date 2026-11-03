import { apiJson, corsHeaders, preflight } from "@/lib/api";
import { UPSTREAM_CATEGORIES, UPSTREAM_EXACT, UPSTREAM_PREFIX, tierOf } from "@/lib/upstream";
import { TOOL_GROUPS, toolCatalog } from "@/lib/tools";

export const dynamic = "force-static";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/endpoints
 *
 * 公开的接口目录：分类、路径、方法、积分档位。不需要凭证，
 * 文档站与 SDK 生成器可以直接读它。
 */
export function GET() {
  const items = UPSTREAM_CATEGORIES.flatMap((group) =>
    group.paths.map((path) => {
      const route = UPSTREAM_EXACT[path] ?? UPSTREAM_PREFIX[path];
      return {
        category: group.tag,
        path: "/api/v1/" + path,
        methods: route ? route.m.split(",") : [],
        credits: route?.c ?? 0,
        tier: route ? tierOf(route.c).name : "free",
        summary: route?.s ?? "",
      };
    })
  );

  return apiJson(
    {
      data: items,
      meta: {
        total: items.length,
        categories: UPSTREAM_CATEGORIES.map((g) => g.tag),
        tools: toolCatalog().map((tool) => ({
          path: tool.path,
          group: tool.group,
          methods: tool.methods,
          summary: tool.summary,
          params: tool.params.map((p) => p.name),
        })),
        toolGroups: TOOL_GROUPS,
        media: [
          {
            path: "/api/v1/music/search",
            methods: ["GET"],
            summary: "网易云 / QQ 音乐 / 酷狗 搜歌",
            params: ["platform", "q", "limit"],
          },
          {
            path: "/api/v1/music/url",
            methods: ["GET"],
            summary: "取单曲播放直链",
            params: ["platform", "id", "quality"],
          },
          {
            path: "/api/v1/video/parse",
            methods: ["GET"],
            summary: "视频链接解析（哔哩哔哩直链 / 其它站元信息）",
            params: ["url"],
          },
        ],
      },
    },
    200,
    { ...corsHeaders(), "cache-control": "public, max-age=300" }
  );
}
