import {
  ToolError,
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  bool,
  fromBase64Url,
  str,
  text,
  toBase64Url,
  type ToolDef,
} from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });

/* ------------------------------------------------------------------ */
/* text/stats                                                         */
/* ------------------------------------------------------------------ */

const stats: ToolDef = {
  name: "text/stats",
  group: "text",
  summary: "统计文本的字数、字节、行数、词数、中日韩字符与阅读时长",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "要统计的文本", required: true, example: "Hello 世界" },
  ],
  run: (ctx) => {
    const input = text(ctx, "text", { max: 200_000, required: false });
    const bytes = encoder.encode(input).length;
    const lines = input === "" ? [] : input.split(/\r\n|\r|\n/);
    let cjk = 0;
    let latin = 0;
    let digits = 0;
    let punct = 0;
    let spaces = 0;
    let other = 0;
    for (const ch of input) {
      if (/\s/.test(ch)) spaces += 1;
      else if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch)) cjk += 1;
      else if (/[A-Za-z]/.test(ch)) latin += 1;
      else if (/[0-9]/.test(ch)) digits += 1;
      else if (/[\p{P}\p{S}]/u.test(ch)) punct += 1;
      else other += 1;
    }
    const trimmed = input.trim();
    const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const readingSeconds = Math.round((cjk / 400) * 60 + (words / 220) * 60);
    return {
      chars: input.length,
      charsNoSpace: input.length - spaces,
      bytes,
      lines: lines.length,
      nonEmptyLines: lines.filter((line) => line.trim() !== "").length,
      longestLine,
      words,
      cjk,
      latin,
      digits,
      punctuation: punct,
      spaces,
      other,
      readingSeconds,
    };
  },
};

/* ------------------------------------------------------------------ */
/* text/case                                                          */
/* ------------------------------------------------------------------ */

function splitWords(input: string): string[] {
  const normalized = input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ");
  return normalized
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

const wordCase: ToolDef = {
  name: "text/case",
  group: "text",
  summary: "把文本在 camelCase、snake_case、kebab-case 等 10 种命名风格之间互转",
  methods: ["GET", "POST"],
  params: [{ name: "text", description: "原始文本或标识符", required: true, example: "hello world" }],
  run: (ctx) => {
    const input = text(ctx, "text", { max: 2000 });
    const words = splitWords(input);
    if (words.length === 0) throw new ToolError(400, "empty_text", "没有可转换的单词");
    const lower = words.map((w) => w.toLowerCase());
    const cap = (w: string) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1));
    return {
      words,
      camel: lower.map((w, i) => (i === 0 ? w : cap(w))).join(""),
      pascal: lower.map(cap).join(""),
      snake: lower.join("_"),
      kebab: lower.join("-"),
      constant: lower.join("_").toUpperCase(),
      dot: lower.join("."),
      title: words.map(cap).join(" "),
      sentence: lower.length === 0 ? "" : cap(lower[0]) + (lower.length > 1 ? " " + lower.slice(1).join(" ") : ""),
      upper: words.join(" ").toUpperCase(),
      lower: words.join(" ").toLowerCase(),
      train: words.map(cap).join("-"),
    };
  },
};

/* ------------------------------------------------------------------ */
/* text/base64                                                        */
/* ------------------------------------------------------------------ */

const base64: ToolDef = {
  name: "text/base64",
  group: "text",
  summary: "Base64 编码与解码，支持 UTF-8 与 URL 安全变体",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "要编码的文本，或要解码的 Base64 串", required: true },
    { name: "mode", description: "encode（默认）或 decode", example: "encode" },
    { name: "urlSafe", description: "是否使用 URL 安全字符集 - _", example: "false" },
  ],
  run: (ctx) => {
    const raw = text(ctx, "text", { max: 200_000 });
    const mode = (str(ctx, "mode") ?? "encode").toLowerCase();
    const urlSafe = bool(ctx, "urlSafe", false);
    if (mode === "encode") {
      const encoded = bytesToBase64(encoder.encode(raw));
      return { mode, urlSafe, result: urlSafe ? toBase64Url(encoded) : encoded };
    }
    if (mode === "decode") {
      const normalized = raw.replace(/\s+/g, "");
      let std = urlSafe ? fromBase64Url(normalized) : normalized;
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(std)) {
        throw new ToolError(400, "invalid_base64", "不是合法的 Base64 内容");
      }
      const rest = std.length % 4;
      if (rest === 1) throw new ToolError(400, "invalid_base64", "Base64 长度不合法");
      if (rest > 1) std = std + "=".repeat(4 - rest);
      let bytes: Uint8Array;
      try {
        bytes = base64ToBytes(std);
      } catch {
        throw new ToolError(400, "invalid_base64", "不是合法的 Base64 内容");
      }
      return { mode, urlSafe, result: decoder.decode(bytes), bytes: bytes.length };
    }
    throw new ToolError(400, "invalid_mode", "mode 只能是 encode 或 decode");
  },
};

/* ------------------------------------------------------------------ */
/* text/url                                                           */
/* ------------------------------------------------------------------ */

const urlCodec: ToolDef = {
  name: "text/url",
  group: "text",
  summary: "URL 编码与解码，或把查询字符串拆成键值对",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "要处理的文本", required: true },
    { name: "mode", description: "encode（默认）、decode 或 parse", example: "encode" },
    { name: "component", description: "true 用 encodeURIComponent（默认），false 用 encodeURI", example: "true" },
  ],
  run: (ctx) => {
    const raw = text(ctx, "text", { max: 100_000 });
    const mode = (str(ctx, "mode") ?? "encode").toLowerCase();
    if (mode === "encode") {
      const component = bool(ctx, "component", true);
      return { mode, result: component ? encodeURIComponent(raw) : encodeURI(raw) };
    }
    if (mode === "decode") {
      try {
        return { mode, result: decodeURIComponent(raw) };
      } catch {
        throw new ToolError(400, "invalid_escape", "含有不完整的百分号转义，无法解码");
      }
    }
    if (mode === "parse") {
      const source = raw.startsWith("?") ? raw.slice(1) : raw;
      const params = [...new URLSearchParams(source).entries()].map(([key, value]) => ({ key, value }));
      return { mode, count: params.length, params };
    }
    throw new ToolError(400, "invalid_mode", "mode 只能是 encode、decode 或 parse");
  },
};

/* ------------------------------------------------------------------ */
/* text/hash                                                          */
/* ------------------------------------------------------------------ */

function md5Hex(input: Uint8Array): string {
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i += 1) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  const padded = new Uint8Array((((input.length + 8) >> 6) + 1) * 64);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = input.length * 8;
  view.setUint32(padded.length - 8, bits >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bits / 4294967296), true);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  for (let offset = 0; offset < padded.length; offset += 64) {
    const m = new Uint32Array(16);
    for (let i = 0; i < 16; i += 1) m[i] = view.getUint32(offset + i * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i += 1) {
      let f = 0;
      let g = 0;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const sum = (a + f + k[i] + m[g]) >>> 0;
      const rotated = ((sum << shifts[i]) | (sum >>> (32 - shifts[i]))) >>> 0;
      const next = (b + rotated) >>> 0;
      a = d;
      d = c;
      c = b;
      b = next;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0]
    .map((value) => {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setUint32(0, value, true);
      return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    })
    .join("");
}

const SUPPORTED_HASHES = ["md5", "sha1", "sha256", "sha512"] as const;
type HashName = (typeof SUPPORTED_HASHES)[number];

const hash: ToolDef = {
  name: "text/hash",
  group: "text",
  summary: "计算 MD5 / SHA-1 / SHA-256 / SHA-512 摘要",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "要计算摘要的文本", required: true },
    { name: "algo", description: "md5、sha1、sha256（默认）或 sha512", example: "sha256" },
  ],
  run: async (ctx) => {
    const input = text(ctx, "text", { max: 200_000 });
    const algo = (str(ctx, "algo") ?? "sha256").toLowerCase() as HashName;
    if (!SUPPORTED_HASHES.includes(algo)) {
      throw new ToolError(400, "invalid_algo", "algo 支持 md5、sha1、sha256、sha512");
    }
    const bytes = encoder.encode(input);
    if (algo === "md5") return { algo, digest: md5Hex(bytes), bytes: bytes.length };
    const digest = await crypto.subtle.digest(algo.toUpperCase().replace("SHA", "SHA-"), bytes);
    return { algo, digest: bytesToHex(new Uint8Array(digest)), bytes: bytes.length };
  },
};

/* ------------------------------------------------------------------ */
/* text/csv                                                           */
/* ------------------------------------------------------------------ */

function parseCsv(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charAt(i);
    if (quoted) {
      if (ch === "\"") {
        if (input.charAt(i + 1) === "\"") {
          field += "\"";
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === "\"") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((items) => !(items.length === 1 && items[0] === ""));
}

const csv: ToolDef = {
  name: "text/csv",
  group: "text",
  summary: "CSV 与 JSON 互转，正确处理引号、逗号与换行",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "CSV 文本，或 JSON 数组字符串", required: true },
    { name: "mode", description: "csv2json（默认）或 json2csv", example: "csv2json" },
    { name: "header", description: "第一行是否为表头，默认 true", example: "true" },
    { name: "delimiter", description: "分隔符，默认英文逗号", example: "," },
  ],
  run: (ctx) => {
    const raw = text(ctx, "text", { max: 200_000 });
    const mode = (str(ctx, "mode") ?? "csv2json").toLowerCase();
    const delimiter = str(ctx, "delimiter") ?? ",";
    if (delimiter.length !== 1) throw new ToolError(400, "invalid_delimiter", "分隔符必须是单个字符");
    if (mode === "csv2json") {
      const useHeader = bool(ctx, "header", true);
      const rows = parseCsv(raw, delimiter);
      if (rows.length === 0) return { mode, rows: [] };
      if (!useHeader) return { mode, rows: rows.map((items) => ({ items })) };
      const head = rows[0];
      const data = rows.slice(1).map((items) => {
        const record: Record<string, string> = {};
        head.forEach((key, index) => {
          record[key.trim() === "" ? "column" + (index + 1) : key.trim()] = items[index] ?? "";
        });
        return record;
      });
      return { mode, columns: head, rows: data };
    }
    if (mode === "json2csv") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new ToolError(400, "invalid_json", "输入不是合法 JSON");
      }
      if (!Array.isArray(parsed)) throw new ToolError(400, "invalid_json", "JSON 必须是对象数组");
      const records = parsed.filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item)
      );
      if (records.length === 0) return { mode, csv: "" };
      const columns = [...new Set(records.flatMap((item) => Object.keys(item)))];
      const escape = (value: unknown) => {
        const flat = value === null || value === undefined ? "" : String(value);
        return /[",\n\r]/.test(flat) ? "\"" + flat.replace(/"/g, "\"\"") + "\"" : flat;
      };
      const lines = [columns.map(escape).join(delimiter)];
      for (const record of records) lines.push(columns.map((key) => escape(record[key])).join(delimiter));
      return { mode, columns, csv: lines.join("\n") };
    }
    throw new ToolError(400, "invalid_mode", "mode 只能是 csv2json 或 json2csv");
  },
};

/* ------------------------------------------------------------------ */
/* text/diff                                                          */
/* ------------------------------------------------------------------ */

interface DiffLine {
  type: "equal" | "add" | "del";
  line: number | null;
  text: string;
}

function diffLines(left: string, right: string): { entries: DiffLine[]; added: number; removed: number } {
  const a = left.split(/\r\n|\r|\n/);
  const b = right.split(/\r\n|\r|\n/);
  if (a.length > 2000 || b.length > 2000) {
    throw new ToolError(413, "too_many_lines", "每侧最多 2000 行");
  }
  const n = a.length;
  const m = b.length;
  const table: Uint16Array[] = [];
  for (let i = 0; i <= n; i += 1) table.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const entries: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      entries.push({ type: "equal", line: i + 1, text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      entries.push({ type: "del", line: i + 1, text: a[i] });
      i += 1;
      removed += 1;
    } else {
      entries.push({ type: "add", line: j + 1, text: b[j] });
      j += 1;
      added += 1;
    }
  }
  while (i < n) {
    entries.push({ type: "del", line: i + 1, text: a[i] });
    i += 1;
    removed += 1;
  }
  while (j < m) {
    entries.push({ type: "add", line: j + 1, text: b[j] });
    j += 1;
    added += 1;
  }
  return { entries, added, removed };
}

const diff: ToolDef = {
  name: "text/diff",
  group: "text",
  summary: "逐行比较两段文本，返回增删行与统计",
  methods: ["GET", "POST"],
  params: [
    { name: "a", description: "原始文本", required: true },
    { name: "b", description: "新文本", required: true },
  ],
  run: (ctx) => {
    const left = text(ctx, "a", { max: 100_000 });
    const right = text(ctx, "b", { max: 100_000 });
    const result = diffLines(left, right);
    return {
      added: result.added,
      removed: result.removed,
      identical: result.added === 0 && result.removed === 0,
      lines: result.entries,
    };
  },
};

/* ------------------------------------------------------------------ */
/* text/slug                                                          */
/* ------------------------------------------------------------------ */

const slug: ToolDef = {
  name: "text/slug",
  group: "text",
  summary: "把标题转成 URL slug，可去掉重音符号",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "原始标题", required: true, example: "Hello World 你好" },
    { name: "separator", description: "分隔符，默认 -", example: "-" },
    { name: "lower", description: "是否转小写，默认 true", example: "true" },
    { name: "ascii", description: "是否去掉非 ASCII 字符，默认 true", example: "true" },
  ],
  run: (ctx) => {
    const raw = text(ctx, "text", { max: 2000 });
    const separator = str(ctx, "separator") ?? "-";
    const lower = bool(ctx, "lower", true);
    const ascii = bool(ctx, "ascii", true);
    let value = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (ascii) value = value.replace(/[^\x00-\x7F]/g, "");
    if (lower) value = value.toLowerCase();
    value = value
      .replace(/[^\p{L}\p{N}]+/gu, separator)
      .replace(new RegExp("^" + separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "+"), "")
      .replace(new RegExp(separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "+$"), "");
    return { slug: value, length: value.length };
  },
};

/* ------------------------------------------------------------------ */
/* text/escape                                                        */
/* ------------------------------------------------------------------ */

const HTML_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

const escapeTool: ToolDef = {
  name: "text/escape",
  group: "text",
  summary: "按 HTML、JSON 或 JavaScript 规则转义与反转义",
  methods: ["GET", "POST"],
  params: [
    { name: "text", description: "要处理的文本", required: true },
    { name: "mode", description: "html（默认）、json 或 js", example: "html" },
    { name: "direction", description: "encode（默认）或 decode", example: "encode" },
  ],
  run: (ctx) => {
    const raw = text(ctx, "text", { max: 200_000 });
    const mode = (str(ctx, "mode") ?? "html").toLowerCase();
    const direction = (str(ctx, "direction") ?? "encode").toLowerCase();
    if (direction !== "encode" && direction !== "decode") {
      throw new ToolError(400, "invalid_direction", "direction 只能是 encode 或 decode");
    }
    if (mode === "html") {
      if (direction === "encode") {
        return { mode, direction, result: raw.replace(/[&<>"']/g, (ch) => HTML_MAP[ch] ?? ch) };
      }
      return {
        mode,
        direction,
        result: raw.replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, name: string) => {
          if (name === "amp") return "&";
          if (name === "lt") return "<";
          if (name === "gt") return ">";
          if (name === "quot") return "\"";
          return "'";
        }),
      };
    }
    if (mode === "json") {
      if (direction === "encode") {
        const quoted = JSON.stringify(raw);
        return { mode, direction, result: quoted.slice(1, -1) };
      }
      try {
        return { mode, direction, result: JSON.parse("\"" + raw + "\"") as string };
      } catch {
        throw new ToolError(400, "invalid_json_escape", "不是合法的 JSON 字符串转义");
      }
    }
    if (mode === "js") {
      if (direction === "encode") {
        const result = raw
          .replace(/\\/g, "\\\\")
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t")
          .replace(/\u2028/g, "\\u2028")
          .replace(/\u2029/g, "\\u2029")
          .replace(/'/g, "\\'")
          .replace(/"/g, "\\\"");
        return { mode, direction, result };
      }
      const result = raw.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, seq: string) => {
        if (seq === "n") return "\n";
        if (seq === "r") return "\r";
        if (seq === "t") return "\t";
        if (seq === "b") return "\b";
        if (seq === "f") return "\f";
        if (seq === "v") return "\v";
        if (seq === "0") return "\0";
        if (seq.startsWith("u")) return String.fromCharCode(parseInt(seq.slice(1), 16));
        if (seq.startsWith("x")) return String.fromCharCode(parseInt(seq.slice(1), 16));
        return seq;
      });
      return { mode, direction, result };
    }
    throw new ToolError(400, "invalid_mode", "mode 只能是 html、json 或 js");
  },
};

export const TEXT_TOOLS: ToolDef[] = [stats, wordCase, base64, urlCodec, hash, csv, diff, slug, escapeTool];
