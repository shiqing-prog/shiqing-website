import { ToolError, bool, int, randomBytes, str, text, type ToolDef } from "./types";

/* ------------------------------ uuid ------------------------------ */

function uuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

function uuidV7(): string {
  const bytes = randomBytes(16);
  const now = Date.now();
  bytes[0] = Math.floor(now / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(now / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(now / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(now / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

const uuid: ToolDef = {
  name: "dev/uuid",
  group: "dev",
  summary: "批量生成 UUID v4 或按时间排序的 UUID v7",
  methods: ["GET", "POST"],
  params: [
    { name: "version", description: "4（默认）或 7", example: "4" },
    { name: "count", description: "生成数量，1-100，默认 1", example: "5" },
  ],
  run: (ctx) => {
    const version = str(ctx, "version") ?? "4";
    const count = int(ctx, "count", 1, 1, 100);
    if (version !== "4" && version !== "7") throw new ToolError(400, "invalid_version", "version 只能是 4 或 7");
    const values = Array.from({ length: count }, () => (version === "4" ? uuidV4() : uuidV7()));
    return { version: Number(version), count, uuids: values };
  },
};

/* ------------------------------ ulid ------------------------------ */

const ULID_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function ulidValue(time: number): string {
  let remaining = time;
  const timePart: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    timePart.unshift(ULID_CHARS.charAt(remaining % 32));
    remaining = Math.floor(remaining / 32);
  }
  const random = randomBytes(16);
  let bits = 0;
  let value = 0;
  const randomPart: string[] = [];
  for (const byte of random) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      randomPart.push(ULID_CHARS.charAt((value >>> (bits - 5)) & 31));
      bits -= 5;
    }
  }
  return timePart.join("") + randomPart.join("").slice(0, 16);
}

const ulid: ToolDef = {
  name: "dev/ulid",
  group: "dev",
  summary: "生成可按字典序排序的 ULID（时间前缀 + 随机后缀）",
  methods: ["GET", "POST"],
  params: [{ name: "count", description: "生成数量，1-100，默认 1", example: "5" }],
  run: (ctx) => {
    const count = int(ctx, "count", 1, 1, 100);
    const now = Date.now();
    return { count, ulids: Array.from({ length: count }, () => ulidValue(now)) };
  },
};

/* ----------------------------- password --------------------------- */

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/";
const AMBIGUOUS = "0O1lI|`\'\"";

const password: ToolDef = {
  name: "dev/password",
  group: "dev",
  summary: "生成强随机密码，可排除易混字符并评估强度",
  methods: ["GET", "POST"],
  params: [
    { name: "length", description: "长度，8-128，默认 20", example: "24" },
    { name: "symbols", description: "是否包含符号，默认 true", example: "true" },
    { name: "digits", description: "是否包含数字，默认 true", example: "true" },
    { name: "upper", description: "是否包含大写，默认 true", example: "true" },
    { name: "excludeAmbiguous", description: "排除 0O1lI 等易混字符，默认 false", example: "true" },
    { name: "count", description: "生成数量，1-20，默认 1", example: "3" },
  ],
  run: (ctx) => {
    const length = int(ctx, "length", 20, 8, 128);
    const count = int(ctx, "count", 1, 1, 20);
    const useSymbols = bool(ctx, "symbols", true);
    const useDigits = bool(ctx, "digits", true);
    const useUpper = bool(ctx, "upper", true);
    const excludeAmbiguous = bool(ctx, "excludeAmbiguous", false);
    let pool = LOWER + (useUpper ? UPPER : "") + (useDigits ? DIGITS : "") + (useSymbols ? SYMBOLS : "");
    if (excludeAmbiguous) pool = [...pool].filter((ch) => !AMBIGUOUS.includes(ch)).join("");
    if (pool.length === 0) throw new ToolError(400, "empty_charset", "字符集为空");
    const generate = () => {
      const bytes = randomBytes(Math.max(length * 2, 32));
      let out = "";
      let index = 0;
      while (out.length < length) {
        if (index >= bytes.length) throw new ToolError(500, "random_exhausted", "随机源不足，请重试");
        const byte = bytes[index];
        index += 1;
        if (byte < 256 - (256 % pool.length)) out += pool.charAt(byte % pool.length);
      }
      return out;
    };
    const entropy = Math.round(length * Math.log2(pool.length));
    return {
      length,
      poolSize: pool.length,
      entropyBits: entropy,
      strength: entropy >= 100 ? "very-strong" : entropy >= 70 ? "strong" : entropy >= 50 ? "fair" : "weak",
      passwords: Array.from({ length: count }, generate),
    };
  },
};

/* ------------------------------ color ---------------------------- */

interface Rgb { r: number; g: number; b: number }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseColor(input: string): Rgb {
  const value = input.trim().toLowerCase();
  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) digits = digits.split("").map((d) => d + d).join("");
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[,\s/]+/).filter((part) => part !== "").map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return { r: clamp(Math.round(parts[0]), 0, 255), g: clamp(Math.round(parts[1]), 0, 255), b: clamp(Math.round(parts[2]), 0, 255) };
    }
  }
  const hsl = value.match(/^hsla?\(([^)]+)\)$/);
  if (hsl) {
    const parts = hsl[1].split(/[,\s/]+/).filter((part) => part !== "");
    const h = Number(parts[0]);
    const s = Number((parts[1] ?? "0").replace("%", ""));
    const l = Number((parts[2] ?? "0").replace("%", ""));
    if ([h, s, l].every((n) => Number.isFinite(n))) return hslToRgb(h, s / 100, l / 100);
  }
  throw new ToolError(
    400,
    "invalid_color",
    "颜色格式无法识别，支持 #rgb、#rrggbb、rgb()、hsl()。注意 URL 里的 # 会被当成片段截断：GET 时请去掉 #，或改用 POST 把 color 放进 JSON body"
  );
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 1000) / 10 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
}

function rgbToHsv({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round((max === 0 ? 0 : d / max) * 1000) / 10, v: Math.round(max * 1000) / 10 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0")).join("");
}

const color: ToolDef = {
  name: "dev/color",
  group: "dev",
  summary: "颜色格式互转：HEX / RGB / HSL / HSV / CMYK 与亮度",
  methods: ["GET", "POST"],
  params: [{ name: "color", description: "颜色值，如 #e5484d、rgb(229,72,77)、hsl(358,74%,60%)", required: true }],
  run: (ctx) => {
    const rgb = parseColor(text(ctx, "color", { max: 100 }));
    const hsl = rgbToHsl(rgb);
    const hsv = rgbToHsv(rgb);
    const k = 1 - Math.max(rgb.r, rgb.g, rgb.b) / 255;
    const cmyk = {
      c: Math.round(((1 - rgb.r / 255 - k) / (1 - k)) * 100) || 0,
      m: Math.round(((1 - rgb.g / 255 - k) / (1 - k)) * 100) || 0,
      y: Math.round(((1 - rgb.b / 255 - k) / (1 - k)) * 100) || 0,
      k: Math.round(k * 100),
    };
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return {
      hex: rgbToHex(rgb),
      rgb,
      hsl,
      hsv,
      cmyk,
      luminance: Math.round(luminance * 1000) / 1000,
      isDark: luminance < 0.5,
    };
  },
};

/* ---------------------------- contrast --------------------------- */

function relativeLuminance(rgb: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

const contrast: ToolDef = {
  name: "dev/contrast",
  group: "dev",
  summary: "计算两色的对比度并判断 WCAG AA / AAA 是否达标",
  methods: ["GET", "POST"],
  params: [
    { name: "foreground", description: "前景色（文字色）", required: true, example: "#ffffff" },
    { name: "background", description: "背景色", required: true, example: "#1f2430" },
  ],
  run: (ctx) => {
    const fg = parseColor(text(ctx, "foreground", { max: 100 }));
    const bg = parseColor(text(ctx, "background", { max: 100 }));
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const rounded = Math.round(ratio * 100) / 100;
    return {
      ratio: rounded,
      foreground: rgbToHex(fg),
      background: rgbToHex(bg),
      wcag: {
        aaNormal: ratio >= 4.5,
        aaLarge: ratio >= 3,
        aaaNormal: ratio >= 7,
        aaaLarge: ratio >= 4.5,
      },
    };
  },
};

/* ------------------------------ cron ----------------------------- */

function parseCronField(field: string, min: number, max: number, name: string): number[] {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const piece = part.trim();
    if (piece === "") throw new ToolError(400, "invalid_cron", name + " 段有空的项");
    const stepMatch = piece.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    let source = piece;
    let step = 1;
    if (stepMatch) {
      source = stepMatch[1];
      step = Number(stepMatch[2]);
      if (!Number.isInteger(step) || step < 1) throw new ToolError(400, "invalid_cron", name + " 段的步长不合法");
    }
    let start = min;
    let end = max;
    if (source !== "*") {
      const range = source.match(/^(\d+)(?:-(\d+))?$/);
      if (!range) throw new ToolError(400, "invalid_cron", name + " 段无法解析：" + piece);
      start = Number(range[1]);
      end = range[2] === undefined ? start : Number(range[2]);
    }
    if (start < min || end > max || start > end) {
      throw new ToolError(400, "invalid_cron", name + " 段超出范围 " + min + "-" + max + "：" + piece);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return [...values].sort((a, b) => a - b);
}

const cron: ToolDef = {
  name: "dev/cron",
  group: "dev",
  summary: "解析 5 段 Cron 表达式并计算接下来几次执行时间（UTC）",
  methods: ["GET", "POST"],
  params: [
    { name: "expression", description: "5 段表达式：分 时 日 月 周", required: true, example: "*/15 * * * *" },
    { name: "count", description: "返回接下来几次，1-20，默认 5", example: "5" },
  ],
  run: (ctx) => {
    const expression = text(ctx, "expression", { max: 200 });
    const count = int(ctx, "count", 5, 1, 20);
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) throw new ToolError(400, "invalid_cron", "需要 5 段：分 时 日 月 周");
    const minutes = parseCronField(parts[0], 0, 59, "分");
    const hours = parseCronField(parts[1], 0, 23, "时");
    const days = parseCronField(parts[2], 1, 31, "日");
    const months = parseCronField(parts[3], 1, 12, "月");
    const weekdays = parseCronField(parts[4], 0, 6, "周");
    const runs: string[] = [];
    const cursor = new Date();
    cursor.setUTCSeconds(0, 0);
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    const limit = new Date(cursor.getTime() + 5 * 366 * 24 * 3600 * 1000);
    while (runs.length < count && cursor <= limit) {
      if (
        minutes.includes(cursor.getUTCMinutes()) &&
        hours.includes(cursor.getUTCHours()) &&
        days.includes(cursor.getUTCDate()) &&
        months.includes(cursor.getUTCMonth() + 1) &&
        weekdays.includes(cursor.getUTCDay())
      ) {
        runs.push(cursor.toISOString());
      }
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    }
    return { expression, valid: runs.length > 0, timezone: "UTC", next: runs };
  },
};

/* ------------------------------- jwt ----------------------------- */

function decodeSegment(segment: string): unknown {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const rest = normalized.length % 4;
  const padded = rest === 0 ? normalized : normalized + "=".repeat(4 - rest);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
}

const jwt: ToolDef = {
  name: "dev/jwt",
  group: "dev",
  summary: "解码 JWT 的 header 与 payload，并检查 exp / nbf 是否有效（不验签）",
  methods: ["GET", "POST"],
  params: [{ name: "token", description: "JWT 字符串", required: true }],
  run: (ctx) => {
    const token = text(ctx, "token", { max: 20_000 }).trim();
    const segments = token.split(".");
    if (segments.length !== 3) throw new ToolError(400, "invalid_jwt", "JWT 应该是用点分隔的三段");
    let header: unknown;
    let payload: unknown;
    try {
      header = decodeSegment(segments[0]);
      payload = decodeSegment(segments[1]);
    } catch {
      throw new ToolError(400, "invalid_jwt", "前两段不是合法的 Base64URL JSON");
    }
    const claims = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof claims.exp === "number" ? claims.exp : null;
    const nbf = typeof claims.nbf === "number" ? claims.nbf : null;
    const iat = typeof claims.iat === "number" ? claims.iat : null;
    return {
      header,
      payload,
      signatureLength: segments[2].length,
      verified: false,
      note: "只做解码，未验证签名",
      expired: exp === null ? null : now >= exp,
      notBefore: nbf === null ? null : now < nbf,
      expiresIn: exp === null ? null : exp - now,
      issuedAt: iat === null ? null : new Date(iat * 1000).toISOString(),
    };
  },
};

/* ------------------------------ regex ---------------------------- */

const regex: ToolDef = {
  name: "dev/regex",
  group: "dev",
  summary: "测试正则表达式并返回所有匹配、位置与捕获组",
  methods: ["GET", "POST"],
  params: [
    { name: "pattern", description: "正则表达式", required: true, example: "\\d+" },
    { name: "text", description: "要匹配的文本", required: true },
    { name: "flags", description: "标志位，默认 g", example: "gi" },
  ],
  run: (ctx) => {
    const pattern = text(ctx, "pattern", { max: 500 });
    const input = text(ctx, "text", { max: 20_000 });
    const rawFlags = str(ctx, "flags") ?? "g";
    const flags = [...new Set(rawFlags.replace(/[^gimsuyd]/g, ""))].join("");
    let expression: RegExp;
    try {
      expression = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
    } catch (error) {
      throw new ToolError(400, "invalid_regex", "正则无法编译：" + (error instanceof Error ? error.message : "未知错误"));
    }
    const matches: Array<{ value: string; index: number; groups: string[]; named: Record<string, string> }> = [];
    let match: RegExpExecArray | null;
    while ((match = expression.exec(input)) !== null && matches.length < 200) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1).map((item) => item ?? ""),
        named: match.groups ? (match.groups as Record<string, string>) : {},
      });
      if (match[0] === "") expression.lastIndex += 1;
    }
    return { count: matches.length, truncated: matches.length >= 200, matches };
  },
};

/* --------------------------- http-status ------------------------- */

const HTTP_STATUS: Record<number, string> = {
  100: "Continue", 101: "Switching Protocols", 103: "Early Hints",
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 206: "Partial Content",
  301: "Moved Permanently", 302: "Found", 303: "See Other", 304: "Not Modified", 307: "Temporary Redirect", 308: "Permanent Redirect",
  400: "Bad Request", 401: "Unauthorized", 402: "Payment Required", 403: "Forbidden", 404: "Not Found",
  405: "Method Not Allowed", 406: "Not Acceptable", 408: "Request Timeout", 409: "Conflict", 410: "Gone",
  411: "Length Required", 412: "Precondition Failed", 413: "Content Too Large", 414: "URI Too Long",
  415: "Unsupported Media Type", 416: "Range Not Satisfiable", 418: "I'm a Teapot", 422: "Unprocessable Content", 425: "Too Early",
  426: "Upgrade Required", 428: "Precondition Required", 429: "Too Many Requests", 431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error", 501: "Not Implemented", 502: "Bad Gateway", 503: "Service Unavailable",
  504: "Gateway Timeout", 505: "HTTP Version Not Supported", 507: "Insufficient Storage", 508: "Loop Detected",
};

const httpStatus: ToolDef = {
  name: "dev/http-status",
  group: "dev",
  summary: "查询 HTTP 状态码含义，或按关键词反查状态码",
  methods: ["GET"],
  params: [
    { name: "code", description: "状态码，如 404", example: "404" },
    { name: "q", description: "按名称关键词搜索，如 timeout", example: "timeout" },
  ],
  run: (ctx) => {
    const code = str(ctx, "code");
    const query = str(ctx, "q");
    if (code !== null && code.trim() !== "") {
      const value = Number(code);
      const reason = HTTP_STATUS[value];
      if (!reason) throw new ToolError(404, "unknown_status", "没有收录 " + code + " 这个状态码");
      return { code: value, reason, family: Math.floor(value / 100) + "xx" };
    }
    const entries = Object.entries(HTTP_STATUS).map(([value, reason]) => ({ code: Number(value), reason }));
    if (query === null || query.trim() === "") return { total: entries.length, codes: entries };
    const needle = query.toLowerCase();
    const hits = entries.filter((item) => item.reason.toLowerCase().includes(needle) || String(item.code).includes(needle));
    return { total: hits.length, query, codes: hits };
  },
};

/* ------------------------------- mime ---------------------------- */

const MIME_MAP: Array<[string, string]> = [
  ["html", "text/html"], ["htm", "text/html"], ["css", "text/css"], ["js", "text/javascript"],
  ["mjs", "text/javascript"], ["json", "application/json"], ["xml", "application/xml"], ["txt", "text/plain"],
  ["md", "text/markdown"], ["csv", "text/csv"], ["yaml", "application/yaml"], ["yml", "application/yaml"],
  ["pdf", "application/pdf"], ["zip", "application/zip"], ["gz", "application/gzip"], ["tar", "application/x-tar"],
  ["7z", "application/x-7z-compressed"], ["rar", "application/vnd.rar"], ["wasm", "application/wasm"],
  ["png", "image/png"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["gif", "image/gif"],
  ["webp", "image/webp"], ["avif", "image/avif"], ["svg", "image/svg+xml"], ["ico", "image/x-icon"],
  ["bmp", "image/bmp"], ["tiff", "image/tiff"], ["heic", "image/heic"],
  ["mp3", "audio/mpeg"], ["wav", "audio/wav"], ["ogg", "audio/ogg"], ["flac", "audio/flac"],
  ["aac", "audio/aac"], ["m4a", "audio/mp4"], ["opus", "audio/opus"],
  ["mp4", "video/mp4"], ["webm", "video/webm"], ["mov", "video/quicktime"], ["avi", "video/x-msvideo"],
  ["mkv", "video/x-matroska"], ["flv", "video/x-flv"], ["m3u8", "application/vnd.apple.mpegurl"],
  ["woff", "font/woff"], ["woff2", "font/woff2"], ["ttf", "font/ttf"], ["otf", "font/otf"],
  ["eot", "application/vnd.ms-fontobject"],
  ["doc", "application/msword"], ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"], ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["ppt", "application/vnd.ms-powerpoint"], ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["epub", "application/epub+zip"], ["apk", "application/vnd.android.package-archive"], ["dmg", "application/x-apple-diskimage"],
];

const mime: ToolDef = {
  name: "dev/mime",
  group: "dev",
  summary: "按扩展名查 MIME 类型，或按 MIME 反查扩展名",
  methods: ["GET"],
  params: [{ name: "q", description: "扩展名（png）或 MIME（image/png）", required: true, example: "png" }],
  run: (ctx) => {
    const query = text(ctx, "q", { max: 200 }).trim().toLowerCase().replace(/^\./, "");
    if (query.includes("/")) {
      const hits = MIME_MAP.filter(([, type]) => type === query).map(([ext, type]) => ({ extension: ext, mime: type }));
      if (hits.length === 0) throw new ToolError(404, "unknown_mime", "没有收录 " + query);
      return { query, matches: hits };
    }
    const exact = MIME_MAP.find(([ext]) => ext === query);
    if (exact) return { query, extension: exact[0], mime: exact[1], kind: exact[1].split("/")[0] };
    const hits = MIME_MAP.filter(([ext]) => ext.includes(query)).map(([ext, type]) => ({ extension: ext, mime: type }));
    if (hits.length === 0) throw new ToolError(404, "unknown_extension", "没有收录 ." + query);
    return { query, matches: hits };
  },
};

export const DEV_TOOLS: ToolDef[] = [uuid, ulid, password, color, contrast, cron, jwt, regex, httpStatus, mime];
