import { ToolError, bool, int, str, text, type ToolDef } from "./types";

/* -------------------------------- ua ----------------------------- */

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\/([\d.]+)/, "Edge"],
  [/OPR\/([\d.]+)/, "Opera"],
  [/Firefox\/([\d.]+)/, "Firefox"],
  [/Chrome\/([\d.]+)/, "Chrome"],
  [/Version\/([\d.]+).*Safari/, "Safari"],
  [/MSIE ([\d.]+)/, "Internet Explorer"],
  [/Trident\/.*rv:([\d.]+)/, "Internet Explorer"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows NT 10\.0/, "Windows 10/11"],
  [/Windows NT 6\.3/, "Windows 8.1"],
  [/Windows NT 6\.1/, "Windows 7"],
  [/Android ([\d.]+)/, "Android"],
  [/(iPhone|iPad|iPod).*OS ([\d_]+)/, "iOS"],
  [/Mac OS X ([\d_.]+)/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Ubuntu/, "Ubuntu"],
  [/Linux/, "Linux"],
];

const ua: ToolDef = {
  name: "web/ua",
  group: "web",
  summary: "解析 User-Agent，识别浏览器、系统、设备与爬虫",
  methods: ["GET"],
  params: [{ name: "ua", description: "User-Agent 字符串；留空则用本次请求的 UA", example: "Mozilla/5.0 …" }],
  run: (ctx) => {
    const input = str(ctx, "ua") ?? ctx.request.headers.get("user-agent") ?? "";
    if (input.length > 2000) throw new ToolError(413, "too_large", "UA 过长");
    const browser = BROWSERS.map(([pattern, name]) => {
      const match = input.match(pattern);
      return match ? { name, version: match[1] ?? "" } : null;
    }).find((item) => item !== null) ?? null;
    const system = SYSTEMS.map(([pattern, name]) => {
      const match = input.match(pattern);
      return match ? { name, version: (match[1] ?? "").replace(/_/g, ".") } : null;
    }).find((item) => item !== null) ?? null;
    const mobile = /Mobile|Android|iPhone|iPad|iPod/.test(input);
    const tablet = /iPad|Tablet/.test(input);
    const botPattern = /bot|crawler|spider|slurp|curl|wget|python-requests|headless/i;
    const bot = botPattern.exec(input);
    return {
      ua: input,
      browser,
      system,
      engine: /Gecko\//.test(input) ? (/AppleWebKit/.test(input) ? "WebKit" : "Gecko") : /Trident/.test(input) ? "Trident" : null,
      device: tablet ? "tablet" : mobile ? "mobile" : "desktop",
      isBot: bot !== null,
      botName: bot ? bot[0] : null,
    };
  },
};

/* ------------------------------- url ----------------------------- */

const urlTool: ToolDef = {
  name: "web/url",
  group: "web",
  summary: "把 URL 拆成协议、主机、路径、查询参数与片段",
  methods: ["GET"],
  params: [{ name: "url", description: "要解析的 URL", required: true, example: "https://example.com/a?b=1#c" }],
  run: (ctx) => {
    const raw = text(ctx, "url", { max: 4000 }).trim();
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new ToolError(400, "invalid_url", "不是合法的 URL，需要带协议（如 https://）");
    }
    const query: Record<string, string | string[]> = {};
    for (const key of new Set(parsed.searchParams.keys())) {
      const values = parsed.searchParams.getAll(key);
      query[key] = values.length > 1 ? values : values[0];
    }
    return {
      href: parsed.href,
      protocol: parsed.protocol.replace(":", ""),
      username: parsed.username || null,
      password: parsed.password ? "***" : null,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port || null,
      pathname: parsed.pathname,
      segments: parsed.pathname.split("/").filter((part) => part !== ""),
      search: parsed.search || null,
      query,
      hash: parsed.hash || null,
      isSecure: parsed.protocol === "https:",
      isLocal: /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname),
    };
  },
};

/* ------------------------------- geo ----------------------------- */

const geo: ToolDef = {
  name: "web/geo",
  group: "web",
  summary: "返回调用方所在的城市、地区、时区与网络信息（基于边缘节点）",
  methods: ["GET"],
  params: [],
  run: (ctx) => {
    const cf = (ctx.request as unknown as { cf?: Record<string, unknown> }).cf;
    if (!cf) {
      return { available: false, message: "当前运行时没有边缘地理信息（本地开发环境）" };
    }
    const pick = (key: string) => (typeof cf[key] === "string" ? (cf[key] as string) : null);
    return {
      available: true,
      city: pick("city"),
      region: pick("region"),
      regionCode: pick("regionCode"),
      country: pick("country"),
      continent: pick("continent"),
      postalCode: pick("postalCode"),
      timezone: pick("timezone"),
      latitude: pick("latitude"),
      longitude: pick("longitude"),
      colo: pick("colo"),
      asn: typeof cf.asn === "number" ? cf.asn : null,
      asOrganization: pick("asOrganization"),
      httpProtocol: pick("httpProtocol"),
      tlsVersion: pick("tlsVersion"),
    };
  },
};

/* ----------------------------- headers --------------------------- */

const SENSITIVE_HEADERS = ["cookie", "authorization", "x-api-key", "proxy-authorization"];

const headers: ToolDef = {
  name: "web/headers",
  group: "web",
  summary: "回显本次请求的请求头，并给出客户端 IP 与连接信息",
  methods: ["GET"],
  params: [],
  run: (ctx) => {
    const entries: Record<string, string> = {};
    ctx.request.headers.forEach((value, key) => {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        entries[key] = "[已隐藏]";
      } else {
        entries[key] = value;
      }
    });
    const cf = (ctx.request as unknown as { cf?: Record<string, unknown> }).cf;
    return {
      headers: entries,
      count: Object.keys(entries).length,
      cfConnectingIp: ctx.request.headers.get("cf-connecting-ip"),
      realIp: ctx.request.headers.get("x-real-ip"),
      forwardedFor: ctx.request.headers.get("x-forwarded-for"),
      country: cf && typeof cf.country === "string" ? cf.country : null,
      colo: cf && typeof cf.colo === "string" ? cf.colo : null,
      httpProtocol: cf && typeof cf.httpProtocol === "string" ? cf.httpProtocol : null,
    };
  },
};

/* ---------------------------- placeholder ------------------------ */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colorOrThrow(value: string, name: string): string {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(value) && !/^[a-zA-Z]+$/.test(value)) {
    throw new ToolError(400, "invalid_" + name, name + " 需要是 #rrggbb 或颜色名");
  }
  return value;
}

const placeholder: ToolDef = {
  name: "web/placeholder",
  group: "web",
  summary: "生成 SVG 占位图，可自定义尺寸、底色与文字",
  methods: ["GET"],
  params: [
    { name: "width", description: "宽度，16-2000，默认 600", example: "800" },
    { name: "height", description: "高度，16-2000，默认 400", example: "450" },
    { name: "text", description: "显示的文字，默认显示尺寸", example: "封面图" },
    { name: "bg", description: "背景色，默认 #e5484d", example: "#1f2430" },
    { name: "fg", description: "文字色，默认 #ffffff", example: "#ffffff" },
    { name: "radius", description: "圆角，0-200，默认 0", example: "16" },
  ],
  run: (ctx) => {
    const width = int(ctx, "width", 600, 16, 2000);
    const height = int(ctx, "height", 400, 16, 2000);
    const label = str(ctx, "text") ?? width + " × " + height;
    const bg = colorOrThrow(str(ctx, "bg") ?? "#e5484d", "bg");
    const fg = colorOrThrow(str(ctx, "fg") ?? "#ffffff", "fg");
    const radius = int(ctx, "radius", 0, 0, 200);
    const fontSize = Math.max(12, Math.min(96, Math.round(Math.min(width, height) / 8)));
    const textValue = escapeXml(label.slice(0, 80));
    const svg =
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + width + "\" height=\"" + height + "\" viewBox=\"0 0 " + width + " " + height + "\">" +
      "<rect width=\"" + width + "\" height=\"" + height + "\" rx=\"" + radius + "\" fill=\"" + bg + "\"/>" +
      "<text x=\"50%\" y=\"50%\" fill=\"" + fg + "\" font-family=\"system-ui,-apple-system,Segoe UI,Noto Sans SC,sans-serif\" font-size=\"" + fontSize + "\" text-anchor=\"middle\" dominant-baseline=\"central\">" + textValue + "</text>" +
      "</svg>";
    return { width, height, text: label, bg, fg, radius, svg };
  },
};

/* ------------------------------ favicon -------------------------- */

const favicon: ToolDef = {
  name: "web/favicon",
  group: "web",
  summary: "用一两个文字生成 SVG 图标（favicon）",
  methods: ["GET"],
  params: [
    { name: "text", description: "图标文字，1-2 个字符", required: true, example: "澪" },
    { name: "size", description: "尺寸，16-512，默认 64", example: "64" },
    { name: "bg", description: "背景色，默认 #e5484d", example: "#e5484d" },
    { name: "fg", description: "文字色，默认 #ffffff", example: "#ffffff" },
    { name: "radius", description: "圆角，0-256，默认 16", example: "16" },
  ],
  run: (ctx) => {
    const label = text(ctx, "text", { max: 4 }).trim();
    if ([...label].length > 2) throw new ToolError(400, "too_long", "最多 2 个字符");
    const size = int(ctx, "size", 64, 16, 512);
    const bg = colorOrThrow(str(ctx, "bg") ?? "#e5484d", "bg");
    const fg = colorOrThrow(str(ctx, "fg") ?? "#ffffff", "fg");
    const radius = int(ctx, "radius", 16, 0, 256);
    const fontSize = Math.round(size * ([...label].length > 1 ? 0.46 : 0.62));
    const svg =
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + size + "\" height=\"" + size + "\" viewBox=\"0 0 " + size + " " + size + "\">" +
      "<rect width=\"" + size + "\" height=\"" + size + "\" rx=\"" + radius + "\" fill=\"" + bg + "\"/>" +
      "<text x=\"50%\" y=\"52%\" fill=\"" + fg + "\" font-family=\"system-ui,-apple-system,Segoe UI,Noto Sans SC,sans-serif\" font-size=\"" + fontSize + "\" font-weight=\"700\" text-anchor=\"middle\" dominant-baseline=\"central\">" + escapeXml(label) + "</text>" +
      "</svg>";
    return { text: label, size, bg, fg, radius, svg };
  },
};

/* -------------------------------- og ----------------------------- */

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp("<meta[^>]+(?:property|name)=[\"\']" + property + "[\"\'][^>]+content=[\"\']([^\"\']*)[\"\']", "i"),
    new RegExp("<meta[^>]+content=[\"\']([^\"\']*)[\"\'][^>]+(?:property|name)=[\"\']" + property + "[\"\']", "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const og: ToolDef = {
  name: "web/og",
  group: "web",
  summary: "抓取网页的 Open Graph 元信息：标题、描述、主图、站点名",
  methods: ["GET"],
  params: [{ name: "url", description: "要解析的页面地址", required: true, example: "https://shiqing.site" }],
  run: async (ctx) => {
    const raw = text(ctx, "url", { max: 2000 }).trim();
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      throw new ToolError(400, "invalid_url", "不是合法的 URL");
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new ToolError(400, "invalid_url", "只支持 http 与 https");
    }
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0)/.test(target.hostname)) {
      throw new ToolError(400, "invalid_url", "不支持内网地址");
    }
    let response: Response;
    try {
      response = await fetch(target.href, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; ShiQingBot/1.0)", accept: "text/html,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ToolError(502, "fetch_failed", "抓取失败：目标无响应或超时");
    }
    if (!response.ok) throw new ToolError(502, "fetch_failed", "目标返回 HTTP " + response.status);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) throw new ToolError(415, "not_html", "目标不是 HTML 页面");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 400_000) throw new ToolError(413, "too_large", "页面超过 400KB，抓取已中止");
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const resolve = (value: string | null) => {
      if (!value) return null;
      try {
        return new URL(decodeEntities(value), target.href).href;
      } catch {
        return null;
      }
    };
    return {
      url: target.href,
      finalUrl: response.url,
      status: response.status,
      title: metaContent(html, "og:title") ?? (titleMatch ? decodeEntities(titleMatch[1]).trim() : null),
      description: metaContent(html, "og:description") ?? metaContent(html, "description"),
      image: resolve(metaContent(html, "og:image")),
      siteName: metaContent(html, "og:site_name"),
      type: metaContent(html, "og:type"),
      locale: metaContent(html, "og:locale"),
      favicon: resolve(metaContent(html, "icon") ?? metaContent(html, "shortcut icon")),
    };
  },
};

/* -------------------------------- ip ----------------------------- */

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 0) return true;
  return false;
}

const ip: ToolDef = {
  name: "web/ip",
  group: "web",
  summary: "判断 IP 属于公网还是内网，并做 IPv6 归一化",
  methods: ["GET"],
  params: [{ name: "ip", description: "IPv4 或 IPv6 地址；留空取本次请求的客户端 IP", example: "192.168.1.1" }],
  run: (ctx) => {
    const raw = str(ctx, "ip") ?? ctx.request.headers.get("cf-connecting-ip") ?? ctx.request.headers.get("x-real-ip") ?? "";
    const value = raw.trim();
    if (value === "") throw new ToolError(400, "missing_ip", "没有可分析的 IP");
    if (value.length > 100) throw new ToolError(400, "invalid_ip", "IP 过长");
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
    const ipv6 = value.includes(":");
    if (!ipv4 && !ipv6) throw new ToolError(400, "invalid_ip", "不是合法的 IP 地址");
    let normalized = value.toLowerCase();
    if (ipv4) {
      const parts = value.split(".").map(Number);
      if (parts.some((n) => n > 255)) throw new ToolError(400, "invalid_ip", "IPv4 每段不能超过 255");
      normalized = parts.join(".");
    }
    return {
      ip: value,
      version: ipv4 ? 4 : 6,
      type: ipv4 ? (isPrivateIpv4(normalized) ? "private" : "public") : normalized === "::1" || normalized.startsWith("fe80") || normalized.startsWith("fc") || normalized.startsWith("fd") ? "private" : "public",
      normalized,
      isLoopback: normalized === "::1" || normalized.startsWith("127."),
      isLinkLocal: normalized.startsWith("169.254") || normalized.startsWith("fe80"),
    };
  },
};

export const WEB_TOOLS: ToolDef[] = [ua, urlTool, geo, headers, placeholder, favicon, og, ip];
