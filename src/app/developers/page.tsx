import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "开发者 API",
  description:
    "用卡密调用时倾小站的只读 API：帖子、板块、标签、统计与更新日志。支持 sk_ 令牌与 OpenAPI 描述。",
  alternates: { canonical: "https://shiqing.site/developers" },
};

const MINT_CURL = [
  'curl -s -X POST https://api.shiqing.site/tokens \\',
  '  -H "Authorization: Bearer <你的卡密>" \\',
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"label":"我的爬虫"}\'',
].join("\n");

const CALL_CURL = [
  'curl -s "https://api.shiqing.site/posts?board=frontend&page=1&pageSize=5" \\',
  '  -H "Authorization: Bearer sk_xxxxxxxx"',
].join("\n");

const ME_CURL = [
  'curl -s https://api.shiqing.site/me \\',
  '  -H "Authorization: Bearer <你的卡密>"',
].join("\n");

const JS_SNIPPET = [
  'const key = "sk_xxxxxxxx";',
  'const res = await fetch("https://api.shiqing.site/posts?pageSize=5", {',
  '  headers: { Authorization: "Bearer " + key },',
  '});',
  'if (!res.ok) throw new Error("HTTP " + res.status);',
  'const { data, pagination } = await res.json();',
  'console.log(data.map((p) => p.title), pagination.total);',
].join("\n");

const DATA_CURL = [
  'curl -s "https://api.shiqing.site/misc/weather?city=南京" \\',
  '  -H "Authorization: Bearer sk_xxxxxxxx"',
].join("\n");

const TOOLS_CURL = [
  'curl -s "https://api.shiqing.site/tools/text/stats?text=你好世界" \\',
  '  -H "Authorization: Bearer sk_xxxxxxxx"',
  "",
  '# 全部 40 个工具（不需要凭证）',
  'curl -s https://api.shiqing.site/tools',
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
    path: "/api/v1/endpoints",
    desc: "接口目录：112 个第三方数据接口的分类与档位",
  },
  {
    method: "GET",
    path: "/api/v1/{能力路径}",
    desc: "第三方数据：天气 / 热榜 / 一言 / 二维码 / DNS 等，按档位限流",
  },
  {
    method: "GET",
    path: "/api/v1/music/search",
    desc: "网易云 / QQ 音乐 / 酷狗 搜歌",
  },
  {
    method: "GET",
    path: "/api/v1/music/url",
    desc: "单曲播放直链（网易云、QQ 免费曲可用）",
  },
  {
    method: "GET",
    path: "/api/v1/video/parse",
    desc: "视频链接解析：B 站出 720P 直链，其它站给元信息",
  },
  {
    method: "GET",
    path: "/api/v1/tools",
    desc: "40 个在线工具的名字、分组、参数表，不需要凭证",
  },
  {
    method: "GET",
    path: "/api/v1/tools/{group}/{tool}",
    desc: "调用工具：文本 / 开发 / 数据 / Web / 内容，每小时 600 次",
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

      <h2 className="section-title mt-9 text-lg">第三方数据接口</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-gray-700 dark:text-gray-300">
        除论坛数据外还开放了 112 个数据能力：翻译、图像、网络查询、社交平台、游戏数据、网页解析。
        和论坛接口共用一张卡密、同一套错误结构，路径就是能力名，查询参数原样带上。
      </p>
      <CodeBlock>{DATA_CURL}</CodeBlock>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <li>· 按成本分 free / basic / premium 三档，限额分别是 60·2000、20·300、6·60（每分钟·每天），各算各的。</li>
        <li>· 完整清单读 <code className="font-mono text-[12px]">GET /api/v1/endpoints</code>，带分类、方法与档位，不需要凭证。</li>
        <li>· 二进制结果（图片、二维码）原样返回，content-type 与 content-disposition 保留，可以直接存盘。</li>
      </ul>

      <h2 className="section-title mt-9 text-lg">音乐与视频</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-gray-700 dark:text-gray-300">
        音乐能搜网易云、QQ 音乐、酷狗，直链只有网易云与 QQ 免费曲拿得到（酷狗要先签名）。
        视频把分享链接丢给 <code className="font-mono text-[12px]">/api/v1/video/parse</code>：
        哔哩哔哩直接出 720P 的 MP4 直链，其它平台给标题、封面、简介这些元信息。
      </p>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <li>· 音乐接口每天 200 次（搜索与直链合计），视频每天 120 次。</li>
        <li>· 直链有时效，两小时左右，别存下来长期用。</li>
        <li>· 拿不到直链不算错误：回 200，<code className="font-mono text-[12px]">playable: false</code> 附原因。</li>
      </ul>

      <h2 className="section-title mt-9 text-lg">在线工具</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-gray-700 dark:text-gray-300">
        40 个纯计算接口，不依赖任何外部服务，几十毫秒返回：文本统计、命名风格、哈希、CSV、Diff、
        UUID/ULID、颜色与对比度、Cron、JWT、进制与单位换算、中文大写、BMI、占位图、OG 解析、一言诗词……
        路径是 <code className="font-mono text-[12px]">/api/v1/tools/&lt;分组&gt;/&lt;工具&gt;</code>，
        参数走 query；长文本也可以用 POST 把参数放进 body。
      </p>
      <CodeBlock>{TOOLS_CURL}</CodeBlock>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <li>· 分组：<code className="font-mono text-[12px]">text</code>（9）、<code className="font-mono text-[12px]">dev</code>（10）、<code className="font-mono text-[12px]">data</code>（8）、<code className="font-mono text-[12px]">web</code>（8）、<code className="font-mono text-[12px]">content</code>（5）。</li>
        <li>· 工具接口每张卡密每小时 600 次，同时计入每分钟 60 次与每天 2000 次的总额度。</li>
        <li>· 返回统一是 <code className="font-mono text-[12px]">{'{"data":...}'}</code>，meta 里带 tool、group 与耗时。</li>
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

      <h2 className="section-title mt-9 text-lg">全站搜索</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-gray-700 dark:text-gray-300">
        <code className="font-mono text-[12px]">GET /api/v1/search?q=关键词</code>{" "}
        一次返回帖子、文档、在线工具与项目的命中项，找不到的类别是空数组。
        适合给自己的工具做一个「搜一下这个站」的入口。
      </p>
      <CodeBlock>{`curl -s "https://api.shiqing.site/search?q=cloudflare" \\\n  -H "Authorization: Bearer sk_xxxxxxxx"`}</CodeBlock>

      <h2 className="section-title mt-9 text-lg">查自己的用量</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-gray-700 dark:text-gray-300">
        今天调了多少、还剩多少，不用猜：
        <Link href="/developers/usage" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
          用量查询
        </Link>
        页贴上卡密或 <code className="font-mono text-[12px]">sk_</code> 令牌就能看，
        也可以直接 <code className="font-mono text-[12px]">POST /api/developers/usage</code>{" "}
        并带上 <code className="font-mono text-[12px]">Authorization</code> 头。
      </p>

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
