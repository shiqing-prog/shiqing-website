import { apiJson, corsHeaders } from "@/lib/api";
import { TOOLS, TOOL_GROUPS, toolCatalog } from "@/lib/tools";

export const dynamic = "force-static";

/**
 * GET /api/v1/tools
 *
 * 工具目录，不需要凭证，方便前端与文档直接读取。
 */
export function GET() {
  return apiJson(
    {
      data: toolCatalog(),
      meta: {
        total: TOOLS.length,
        groups: TOOL_GROUPS,
        usage: "/api/v1/tools/<group>/<tool>",
      },
    },
    200,
    { "cache-control": "public, max-age=300", ...corsHeaders() }
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
