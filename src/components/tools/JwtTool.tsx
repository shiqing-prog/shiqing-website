"use client";

import { useEffect, useMemo, useState } from "react";

/** base64url -> 字符串（含 UTF-8 解码） */
function decodeSegment(seg: string): string {
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function fmtTime(seconds: number): string {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
}

/** 把相对秒数说成人话 */
function humanDuration(sec: number): string {
  const abs = Math.abs(Math.round(sec));
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(d + " 天");
  if (h) parts.push(h + " 小时");
  if (!d && m) parts.push(m + " 分钟");
  if (parts.length === 0) parts.push(abs + " 秒");
  return parts.slice(0, 2).join(" ");
}

const TIME_CLAIMS: Record<string, string> = {
  exp: "过期时间",
  iat: "签发时间",
  nbf: "生效时间",
  auth_time: "认证时间",
};

const CLAIM_HINTS: Record<string, string> = {
  iss: "签发者",
  sub: "主体（一般是用户 id）",
  aud: "接收方",
  jti: "唯一 id",
  scope: "授权范围",
  azp: "授权方",
  email: "邮箱",
  name: "名字",
  role: "角色",
};

const HMAC_HASH: Record<string, string> = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

type Parsed =
  | { kind: "empty" }
  | { kind: "error"; error: string }
  | {
      kind: "ok";
      header: Record<string, unknown>;
      payload: Record<string, unknown>;
      signature: string;
      parts: string[];
    };

export default function JwtTool() {
  const [raw, setRaw] = useState("");
  const [secret, setSecret] = useState("");
  const [verify, setVerify] = useState<{ state: "idle" | "ok" | "bad" | "error"; msg: string }>({
    state: "idle",
    msg: "",
  });

  const parsed = useMemo<Parsed>(() => {
    const token = raw.trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
    if (token === "") return { kind: "empty" };
    const parts = token.split(".");
    if (parts.length < 2) return { kind: "error", error: "这看起来不是一个 JWT（应该至少有两段，用 . 分隔）" };
    try {
      const header = JSON.parse(decodeSegment(parts[0])) as Record<string, unknown>;
      const payload = JSON.parse(decodeSegment(parts[1])) as Record<string, unknown>;
      return { kind: "ok", header, payload, signature: parts[2] ?? "", parts };
    } catch {
      return { kind: "error", error: "解码失败：base64url 不合法，或者解出来的不是 JSON" };
    }
  }, [raw]);

  const jwt = parsed.kind === "ok" ? parsed : null;

  // 当前时间放 state 里，每 30 秒刷新一次：既满足渲染纯度，过期状态也能自动更新
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const exp = jwt ? Number(jwt.payload.exp) : NaN;
  const nbf = jwt ? Number(jwt.payload.nbf) : NaN;
  const expired = Number.isFinite(exp) && exp < now;
  const notYet = Number.isFinite(nbf) && nbf > now;

  async function verifySignature() {
    if (!jwt) return;
    const alg = String(jwt.header.alg ?? "");
    const hash = HMAC_HASH[alg];
    if (!hash) {
      setVerify({ state: "error", msg: "只支持 HS256 / HS384 / HS512 的本地验签（RS/ES 需要公钥，这里没做）" });
      return;
    }
    if (secret === "") {
      setVerify({ state: "error", msg: "先填密钥" });
      return;
    }
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash }, false, [
        "sign",
      ]);
      const data = enc.encode(jwt.parts.slice(0, 2).join("."));
      const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
      // 转成 base64url 比对
      let bin = "";
      for (const b of sig) bin += String.fromCharCode(b);
      const expected = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const ok = expected === jwt.signature;
      setVerify({
        state: ok ? "ok" : "bad",
        msg: ok ? "签名验证通过，token 没有被篡改 ✅" : "签名不匹配：密钥不对，或者 token 被改过 ❌",
      });
    } catch (err) {
      setVerify({ state: "error", msg: err instanceof Error ? err.message : "验签失败" });
    }
  }

  const timeRows = jwt
    ? Object.keys(TIME_CLAIMS)
        .filter((k) => Number.isFinite(Number(jwt.payload[k])))
        .map((k) => ({ key: k, at: Number(jwt.payload[k]) }))
    : [];

  return (
    <div className="kratos-card p-6">
      <h2 className="text-xl font-bold">JWT 解析</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        把 JWT 粘进来，解出 header / payload、标出过期时间，还能用密钥本地验签。token 不会离开浏览器。
      </p>

      <label className="mt-5 block text-sm font-medium">JWT（可以带 Bearer 前缀）</label>
      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setVerify({ state: "idle", msg: "" });
        }}
        rows={5}
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.xxxxx"
        className="input-tool mt-1.5 w-full resize-y font-mono text-xs"
      />

      {parsed.kind === "error" && (
        <p className="mt-4 rounded-[2px] bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {parsed.error}
        </p>
      )}

      {jwt && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              alg: {String(jwt.header.alg ?? "?")}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              typ: {String(jwt.header.typ ?? "?")}
            </span>
            {Number.isFinite(exp) &&
              (expired ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  已过期 {humanDuration(now - exp)}
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                  还有 {humanDuration(exp - now)} 过期
                </span>
              ))}
            {notYet && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                还没生效
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Header</p>
              <pre className="input-tool mt-1.5 overflow-x-auto rounded-[2px] bg-gray-50 p-3 font-mono text-xs dark:bg-gray-900">
                {JSON.stringify(jwt.header, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium">Payload</p>
              <pre className="input-tool mt-1.5 overflow-x-auto rounded-[2px] bg-gray-50 p-3 font-mono text-xs dark:bg-gray-900">
                {JSON.stringify(jwt.payload, null, 2)}
              </pre>
            </div>
          </div>

          {timeRows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-[2px] border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">声明</th>
                    <th className="px-3 py-2 font-medium">含义</th>
                    <th className="px-3 py-2 font-medium">时间</th>
                    <th className="px-3 py-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {timeRows.map((row) => {
                    const rel = row.at - now;
                    const isPast = rel < 0;
                    return (
                      <tr key={row.key} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2 font-mono">{row.key}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{TIME_CLAIMS[row.key]}</td>
                        <td className="px-3 py-2 font-mono">{fmtTime(row.at)}</td>
                        <td className={"px-3 py-2 " + (isPast ? "text-gray-500" : "text-blue-600 dark:text-blue-400")}>
                          {isPast ? humanDuration(rel) + "前" : "还有 " + humanDuration(rel)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {Object.keys(CLAIM_HINTS).some((k) => k in jwt.payload) && (
            <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              常见声明：
              {Object.keys(CLAIM_HINTS)
                .filter((k) => k in jwt.payload)
                .map((k) => CLAIM_HINTS[k])
                .join("、")}
              。
            </p>
          )}

          <div className="mt-5 rounded-[2px] border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-medium">本地验签（仅 HMAC）</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setVerify({ state: "idle", msg: "" });
                }}
                placeholder="签名密钥"
                className="input-tool flex-1 font-mono text-xs"
              />
              <button type="button" onClick={() => void verifySignature()} className="btn-tool text-xs">
                验证签名
              </button>
            </div>
            {verify.state !== "idle" && (
              <p
                className={
                  "mt-2 text-xs " +
                  (verify.state === "ok"
                    ? "text-green-600"
                    : verify.state === "bad"
                      ? "text-red-600"
                      : "text-amber-600")
                }
              >
                {verify.msg}
              </p>
            )}
          </div>
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        说明：解析只是 base64url 解码，不代表 token 有效 —— 是否可信要看签名。这里只做 HS256/384/512 的本地验签；RS256、ES256
        这类非对称算法需要公钥（JWKS），先不支持。
      </p>
    </div>
  );
}
