import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "开发者 API",
  description:
    "用卡密调用时倾小站的只读 API：帖子、板块、标签、统计与更新日志。支持 sk_ 令牌与 OpenAPI 描述。",
  alternates: { canonical: "https://shiqing.site/developers" },
};

const MINT_CURL = [
  'curl -s -X POST https://shiqing.site/api/v1/tokens \\',
  '  -H "Authorization: Bearer <你的卡密>" \\',
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"label":"我的爬虫"}\'',
].join("\n");

const CALL_CURL = [
  'curl -s "https://shiqing.site/api/v1/posts?board=frontend&page=1&pageSize=5" \\',
  '  -H "Authorization: Bearer sk_xxxxxxxx"',
].join("\n");

const ME_CURL = [
  'curl -s https://shiqing.site/api/v1/me \\',
  '  -H "Authorization: Bearer <你的卡密>"',
].join("\n");

const JS_SNIPPET = [
  'const key = "sk_xxxxxxxx";',
  'const res = await fetch("https://shiqing.site/api/v1/posts?pageSize=5", {',
  '  headers: { Authorization: "Bearer " + key },',
  '});',
  'if (!res.ok) throw new Error("HTTP " + res.status);',
  'const { data, pagination } = await res.json();',
  'console.log(data.map((p) => p.title), pagination.total);',
].join("\n");

const UAPI_CURL = [
  'curl -s "https://shiqing.site/api/v1/uapi/misc/weather?city=南京" \\',
  '  -H "Authorization: Bearer sk_xxxxxxxx"',
].join("\n");

const ERRORS: { status: string; code: string; desc: string }[] = [
  { status: "401", code: "missing_key", desc: "没带 Authorization / X-API-Key" },
  { status: "401", code: "invalid_key", desc: "卡密不存在或格式不对" },
  { status: "401", code: "invalid_token", desc: "sk_ 令牌不存在或已被吊销" },
  { status: "403", code: "revoked", desc: "卡密已被管理员吊销" },
  { status: "403", code: "expired", desc: "卡密已过期" },
  { status: "404", code: "post_not_found", desc: "帖子 / 板块 / 令牌不存在" },
  { status: "409", code: "token_limit", desc: "每张卡密最多 10 个未吊销令牌" },
  { status: "429", code: "rate_limited", desc: "每分钟超过 60 次" },
  { status: "429", code: "daily_limit", desc: "当天超过 2000 次" },
];

const ENDPOINTS: { method: string; path: string; desc: string }[] = [
  { method: "GET", path: "/api/v1/ping", desc: "连通性检查，不需要凭证" },
  { method: "GET", path: "/api/v1/me", desc: "卡密信息、今日用量、令牌列表" },
  {
    method: "GET",
    path: "/api/v1/posts",
    desc: "帖子列表：page / pageSize / board / q / tag / sort",
  },
  { method: "GET", path: "/api/v1/posts/{id}", desc: "帖子详情，?replies=1 附带回复" },
  { method: "GET", path: "/api/v1/boards", desc: "全部板块" },
  { method: "GET", path: "/api/v1/tags", desc: "标签云，?limit=100" },
  { method: "GET", path: "/api/v1/stats", desc: "站点总览统计" },
  { method: "GET", path: "/api/v1/changelog", desc: "更新日志，?limit=20" },
  { method: "GET", path: "/api/v1/tokens", desc: "列出当前卡密下的令牌" },
  { method: "POST", path: "/api/v1/tokens", desc: "用卡密换取 sk_ 令牌" },
  { method: "DELETE", path: "/api/v1/tokens/{token}", desc: "吊销令牌" },
  {
    method: "GET",
    path: "/api/v1/openapi.json",
    desc: "OpenAPI 3.1 描述，可导入 SDK 生成器",
  },
  {
    method: "GET",
    path: "/api/v1/uapi/{上游路径}",
    desc: "中转 UApiPro：天气 / 热门 / 一言 / 二维码等，每卡每天 200 次",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-[2px] border border-black/10 bg-[#f3f2ef] p-3 font-mono text-[12px] leading-relaxed text-gray-800 dark:border-white/10 dark:bg-[#141416] dark:text-gray-200">
      <code>{children}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="meta">DEVELOPERS · API v1</p>
      <h1 className="section-title mt-2 text-2xl">开发者 API</h1>
      <p className="mt-3 text-[15px] leading-[1.8] text-gray-700 dark:text-gray-300">
        拿一张站点的卡密，就能以只读方式调用小站的数据：帖子、板块、标签、统计与更新日志。
        所有接口都返回 JSON，并且开放了 CORS，浏览器里也能直接调。
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="kratos-card p-4">
          <p className="meta">01 · 拿卡密</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            去{" "}
            <Link href="/cards" className="text-blue-600 hover:underline">
              卡密领取
            </Link>{" "}
            申请，或登录后在{" "}
            <Link href="/cards" className="text-blue-600 hover:underline">
              /cards
            </Link>{" "}
            兑换入账。
          </p>
        </div>
        <div className="kratos-card p-4">
          <p className="meta">02 · 换令牌</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            用卡密换一个 <code className="font-mono text-[12px]">sk_</code> 令牌，
            放在程序配置里比直接写卡密安全，泄露了可以单独吊销。
          </p>
        </div>
        <div className="kratos-card p-4">
          <p className="meta">03 · 开始调用</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            请求头带{" "}
            <code className="font-mono text-[12px]">Authorization: Bearer &lt;token&gt;</code>，
            或者用 <code className="font-mono text-[12px]">X-API-Key</code>。
          </p>
        </div>
      </div>

      <h2 className="section-title mt-9 text-lg">换取令牌</h2>
      <CodeBlock>{MINT_CURL}</CodeBlock>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
        返回 <code className="font-mono">201</code> 和{" "}
        <code className="font-mono">{'{"data":{"token":"sk_..."}}'}</code>
        。令牌明文只在创建时返回一次，请自己保存；每张卡密最多保留 10 个。
      </p>

      <h2 className="section-title mt-9 text-lg">调用示例</h2>
      <CodeBlock>{CALL_CURL}</CodeBlock>
      <CodeBlock>{ME_CURL}</CodeBlock>
      <CodeBlock>{JS_SNIPPET}</CodeBlock>

      <h2 className="section-title mt-9 text-lg">接口一览</h2>
      <div className="kratos-card mt-3 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="meta px-3 py-2">方法</th>
              <th className="meta px-3 py-2">路径</th>
              <th className="meta px-3 py-2">说明</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr
                key={e.method + e.path}
                className="border-b border-black/5 last:border-0 dark:border-white/5"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                  {e.method}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px]">{e.path}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400">
        完整定义见{" "}
        <a href="/api/v1/openapi.json" className="text-blue-600 hover:underline">
          /api/v1/openapi.json
        </a>
        （OpenAPI 3.1，可直接喂给 openapi-generator / Swagger UI）。
      </p>

      <h2 className="section-title mt-9 text-lg">UApiPro 中转</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-gray-700 dark:text-gray-300">
        站点还替你代理了一批 UApiPro 接口，你仍然只用卡密：上游 token 存在服务端，不会暴露给调用方。
        路径规则是 <code className="font-mono text-[12px]">/api/v1/uapi/&lt;上游路径&gt;</code>，查询参数原样透传。
      </p>
      <CodeBlock>{UAPI_CURL}</CodeBlock>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <li>· 每张卡密每天最多 200 次中转调用，超出返回 <code className="font-mono text-[12px]">429 uapi_daily_limit</code>。</li>
        <li>· 只开放白名单接口（天气、热门、一言、二维码、IP 信息等），不在名单里的路径一律 404。</li>
        <li>· 图片类接口把上游的二进制流原样转回，content-type 保持不变。</li>
      </ul>

      <h2 className="section-title mt-9 text-lg">配额与限制</h2>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <li>· 每个卡密每分钟最多 60 次，每天最多 2000 次（同一卡密下的所有令牌共享额度）。</li>
        <li>· 卡密被吊销或过期后，所有令牌立即失效。</li>
        <li>· v1 是只读 API：不提供发帖、回帖等写操作，避免被脚本灌水。</li>
        <li>
          · 响应统一 <code className="font-mono text-[12px]">{'{"data":...}'}</code>，出错是{" "}
          <code className="font-mono text-[12px]">{'{"error":{"code":"...","message":"..."}}'}</code>
          。
        </li>
      </ul>

      <h2 className="section-title mt-9 text-lg">错误码</h2>
      <div className="kratos-card mt-3 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="meta px-3 py-2">HTTP</th>
              <th className="meta px-3 py-2">code</th>
              <th className="meta px-3 py-2">含义</th>
            </tr>
          </thead>
          <tbody>
            {ERRORS.map((e) => (
              <tr key={e.code} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-3 py-2 font-mono text-[11px]">{e.status}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-blue-600 dark:text-blue-400">
                  {e.code}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 border-t border-black/10 pt-4 text-[13px] text-gray-500 dark:border-white/10 dark:text-gray-400">
        有问题可以直接在{" "}
        <Link href="/bbs" className="text-blue-600 hover:underline">
          论坛
        </Link>{" "}
        发帖，或者在 QQ 上找我。
      </p>
    </div>
  );
}
