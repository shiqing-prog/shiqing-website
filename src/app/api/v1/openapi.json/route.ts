import { apiJson, preflight, API_VERSION } from "@/lib/api";
import { buildOpenApiSpec } from "@/lib/openapi";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/openapi.json —— OpenAPI 3.1 描述（公开，供 SDK / 文档工具导入）
 * 规范本体在 src/lib/openapi.ts，状态页会拿它的路径数做自检。
 */
export function GET() {
  return apiJson({ ...buildOpenApiSpec(), "x-api-version": API_VERSION });
}
