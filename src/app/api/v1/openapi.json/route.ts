import { apiJson, preflight, API_VERSION } from "@/lib/api";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/openapi.json —— OpenAPI 3.1 描述（公开，供 SDK / 文档工具导入）
 */
export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "ShiQing API",
      version: "1.0.0",
      description:
        "时倾小站的只读开发者 API。用卡密（或卡密换来的 sk_ 令牌）作为 Bearer 凭证调用，详见 https://shiqing.site/developers",
    },
    servers: [{ url: "https://shiqing.site", description: "线上" }],
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "基础", description: "连通性与凭证信息" },
      { name: "内容", description: "帖子、板块、标签、统计、更新日志" },
      { name: "令牌", description: "用卡密换取 / 管理 sk_ 令牌" },
    ],
    components: {
      responses: {
        Unauthorized: {
          description: "缺少或无效的凭证",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "card_key | sk_token",
          description:
            "可以直接填卡密，也可以填用 POST /api/v1/tokens 换来的 sk_ 令牌",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  examples: ["missing_key", "invalid_key", "rate_limited", "daily_limit"],
                },
                message: { type: "string" },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", examples: [1] },
            pageSize: { type: "integer", examples: [20] },
            total: { type: "integer", examples: [42] },
            totalPages: { type: "integer", examples: [3] },
            hasMore: { type: "boolean", examples: [true] },
          },
        },
        Card: {
          type: "object",
          properties: {
            plan: { type: "string", examples: ["pro"] },
            days: { type: "integer", examples: [30] },
            activated: { type: "boolean" },
            expired_at: { type: "integer", description: "秒级时间戳，0 表示未激活" },
            remaining_seconds: { type: ["integer", "null"] },
            bound_qq: { type: ["string", "null"] },
            bound_user_id: { type: ["string", "null"] },
            status: { type: "string", enum: ["active", "revoked"] },
          },
        },
        PostSummary: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            excerpt: { type: "string" },
            board: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },
            author: {
              type: "object",
              properties: { id: { type: "string" }, nickname: { type: "string" } },
            },
            tags: { type: "array", items: { type: "string" } },
            sticky: { type: "boolean" },
            reply_count: { type: "integer" },
            view_count: { type: "integer" },
            likes: { type: "integer" },
            created_at: { type: "string" },
            updated_at: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/api/v1/ping": {
        get: {
          tags: ["基础"],
          summary: "连通性检查",
          security: [],
          responses: {
            200: {
              description: "服务正常",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      service: { type: "string" },
                      version: { type: "string" },
                      time: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/me": {
        get: {
          tags: ["基础"],
          summary: "当前凭证的卡密信息、今日用量与令牌列表",
          responses: {
            200: { description: "ok" },
            401: { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/v1/posts": {
        get: {
          tags: ["内容"],
          summary: "帖子列表（分页）",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
            },
            { name: "board", in: "query", description: "板块 slug，如 frontend", schema: { type: "string" } },
            { name: "q", in: "query", description: "标题/正文关键词", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            {
              name: "sort",
              in: "query",
              schema: { type: "string", enum: ["latest", "hot"], default: "latest" },
            },
          ],
          responses: {
            200: {
              description: "帖子列表",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/PostSummary" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            404: { description: "板块不存在" },
          },
        },
      },
      "/api/v1/posts/{id}": {
        get: {
          tags: ["内容"],
          summary: "帖子详情（可附带回复）",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            {
              name: "replies",
              in: "query",
              description: "传 1 时附带回复",
              schema: { type: "string", enum: ["1"] },
            },
            { name: "replyPage", in: "query", schema: { type: "integer", minimum: 1 } },
            {
              name: "replyPageSize",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            },
          ],
          responses: {
            200: { description: "帖子详情" },
            404: { description: "帖子不存在" },
          },
        },
      },
      "/api/v1/boards": {
        get: { tags: ["内容"], summary: "全部板块", responses: { 200: { description: "ok" } } },
      },
      "/api/v1/tags": {
        get: {
          tags: ["内容"],
          summary: "标签云",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 200, default: 100 },
            },
          ],
          responses: { 200: { description: "ok" } },
        },
      },
      "/api/v1/stats": {
        get: { tags: ["内容"], summary: "站点总览统计", responses: { 200: { description: "ok" } } },
      },
      "/api/v1/changelog": {
        get: {
          tags: ["内容"],
          summary: "更新日志",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: { 200: { description: "ok" } },
        },
      },
      "/api/v1/tokens": {
        get: {
          tags: ["令牌"],
          summary: "列出当前卡密下的令牌",
          responses: { 200: { description: "ok" } },
        },
        post: {
          tags: ["令牌"],
          summary: "用卡密换一个 sk_ 令牌（只能用卡密调用）",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { label: { type: "string", maxLength: 40, examples: ["我的爬虫"] } },
                },
              },
            },
          },
          responses: {
            201: { description: "创建成功，token 只在这里返回明文" },
            400: { description: "用令牌换令牌 / 请求格式错误" },
            409: { description: "令牌数量已达 10 个上限" },
            429: { description: "创建过于频繁" },
          },
        },
      },
      "/api/v1/tokens/{token}": {
        delete: {
          tags: ["令牌"],
          summary: "吊销令牌",
          parameters: [
            { name: "token", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "已吊销" },
            404: { description: "令牌不存在或已吊销" },
          },
        },
      },
    },
  };

  return apiJson({ ...spec, "x-api-version": API_VERSION });
}
