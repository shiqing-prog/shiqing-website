import type { NextRequest } from "next/server";

/** 一次性工具接口的调用上下文：query 与 JSON body 都支持 */
export interface ToolContext {
  request: NextRequest;
  params: URLSearchParams;
  body: Record<string, unknown> | null;
}

export type ToolHandler = (ctx: ToolContext) => unknown | Promise<unknown>;

export interface ToolParam {
  name: string;
  description: string;
  required?: boolean;
  example?: string;
}

export interface ToolDef {
  /** 形如 text/stats，对应 /api/v1/tools/text/stats */
  name: string;
  group: string;
  summary: string;
  methods: Array<"GET" | "POST">;
  params: ToolParam[];
  run: ToolHandler;
}

/** 工具内部抛出的可预期错误，路由层转成统一 JSON 错误 */
export class ToolError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ToolError";
  }
}

/** 从 query 或 JSON body 里取一个字符串参数 */
export function str(ctx: ToolContext, name: string): string | null {
  const fromQuery = ctx.params.get(name);
  if (fromQuery !== null) return fromQuery;
  const fromBody = ctx.body ? ctx.body[name] : undefined;
  if (typeof fromBody === "string") return fromBody;
  if (typeof fromBody === "number" || typeof fromBody === "boolean") return String(fromBody);
  return null;
}

/** 必填文本参数，带长度上限，超过就 413 */
export function text(
  ctx: ToolContext,
  name: string,
  options?: { max?: number; required?: boolean; fallback?: string }
): string {
  const max = options?.max ?? 100_000;
  const raw = str(ctx, name);
  if (raw === null) {
    if (options?.fallback !== undefined) return options.fallback;
    if (options?.required === false) return "";
    throw new ToolError(400, "missing_" + name, "缺少参数 " + name);
  }
  if (raw.length > max) {
    throw new ToolError(413, "too_large", "参数 " + name + " 超过 " + max + " 字符上限");
  }
  return raw;
}

/** 整数参数，带范围校验 */
export function int(
  ctx: ToolContext,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = str(ctx, name);
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new ToolError(400, "invalid_" + name, name + " 必须是整数");
  }
  if (value < min || value > max) {
    throw new ToolError(400, "invalid_" + name, name + " 必须在 " + min + " 到 " + max + " 之间");
  }
  return value;
}

/** 数字参数（允许小数） */
export function float(
  ctx: ToolContext,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = str(ctx, name);
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new ToolError(400, "invalid_" + name, name + " 必须是数字");
  if (value < min || value > max) {
    throw new ToolError(400, "invalid_" + name, name + " 必须在 " + min + " 到 " + max + " 之间");
  }
  return value;
}

/** 布尔参数：true/1/yes/on 视为真 */
export function bool(ctx: ToolContext, name: string, fallback = false): boolean {
  const raw = str(ctx, name);
  if (raw === null) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/** base64url 与标准 base64 互转用的小工具 */
export function toBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const rest = padded.length % 4;
  return rest === 0 ? padded : padded + "=".repeat(4 - rest);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** 秒级时间戳（工具返回值里统一用） */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
