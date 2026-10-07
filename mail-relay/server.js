/**
 * ShiQing 时倾 —— QQ 邮箱邮件中继服务
 *
 * 用途：Cloudflare Worker 无法直连 SMTP（无 TCP/TLS 出口），
 * 本站 Worker 的 src/lib/mailer.ts 会 POST {MAILER_BASE}/send 到这里，
 * 由本服务通过 QQ 邮箱 SMTP（smtp.qq.com:465，授权码）真正发出邮件。
 *
 * 接口（与 mailer.ts 契约一致）：
 *   GET  /health                -> 200 "ok"
 *   POST /send  header: x-mailer-secret
 *         body: { to, subject, html, text? }   -> 200 { ok, messageId } / 4xx/5xx { error }
 *
 * 安全（本服务经隧道暴露在公网，只有 secret 一道门，因此做了以下限制）：
 *   - 恒定时间比较 x-mailer-secret
 *   - 每 RATE_WINDOW_MS 最多 RATE_MAX 封（防 secret 泄漏后被当开放中继群发）
 *   - 收件人格式校验 + 单封最多 MAX_RECIPIENTS 个
 *   - 请求体上限 MAX_BODY_BYTES（超出回 413，不再静默断连）
 *   - 仅监听 127.0.0.1，公网只能经 cloudflared 隧道进入
 *   - ⚠️ secret / QQ 授权码请定期轮换，明文 config.json 不要长期留在磁盘
 *
 * 配置：优先读同目录 config.json（明文，已被 .gitignore 排除，不入库）；
 * 否则读同目录 config.json.enc（AES-256-GCM 加密版，入库），需环境变量
 * MAIL_RELAY_KEY（64 位 hex 密钥）解密；也可直接用环境变量覆盖：
 *   {
 *     "port": 9091,
 *     "secret": "与 wrangler secret MAILER_SECRET 保持一致",
 *     "qqUser": "你的QQ号@qq.com",
 *     "qqAuth": "QQ邮箱SMTP授权码"
 *   }
 * 加密方式：node encrypt.js（用 MAIL_RELAY_KEY 把 config.json 加密为 config.json.enc）
 */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const CONFIG_PATH = path.join(__dirname, "config.json");
const ENC_CONFIG_PATH = path.join(__dirname, "config.json.enc");
const MAIL_RELAY_KEY = process.env.MAIL_RELAY_KEY || "";

function decryptConfig(encPath) {
  if (MAIL_RELAY_KEY.length !== 64) {
    throw new Error("缺少 MAIL_RELAY_KEY 环境变量（64 位 hex 密钥），无法解密 config.json.enc");
  }
  const buf = fs.readFileSync(encPath);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(MAIL_RELAY_KEY, "hex"), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plain.toString("utf-8"));
}

let config = {};
try {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } else if (fs.existsSync(ENC_CONFIG_PATH)) {
    config = decryptConfig(ENC_CONFIG_PATH);
    console.log("[mail-relay] 已从 config.json.enc 解密配置");
  }
} catch (err) {
  console.error("[mail-relay] 配置加载失败:", err.message);
  process.exit(1);
}

const PORT = Number(process.env.PORT || config.port || 9091);
const SECRET = process.env.MAILER_SECRET || config.secret || "";
const QQ_USER = process.env.QQ_MAIL_USER || config.qqUser || "";
const QQ_AUTH = process.env.QQ_MAIL_AUTH || config.qqAuth || "";

if (!SECRET || !QQ_USER || !QQ_AUTH) {
  console.error("[mail-relay] 缺少配置：请填写 config.json 的 secret / qqUser / qqAuth（或设置对应环境变量）");
  process.exit(1);
}

/* ---------- 安全限制 ---------- */
const MAX_BODY_BYTES = 256 * 1024; // 单请求体上限
const MAX_RECIPIENTS = 10; // 单封邮件收件人上限
const MAX_SUBJECT_LEN = 200;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 60; // 每窗口最多发送 60 封
const EMAIL_RE = /^[^\s@,<>"]+@[^\s@,<>"]+\.[^\s@,<>"]+$/;

const rate = { count: 0, resetAt: Date.now() + RATE_WINDOW_MS };
function hitRate() {
  const now = Date.now();
  if (now > rate.resetAt) {
    rate.count = 0;
    rate.resetAt = now + RATE_WINDOW_MS;
  }
  rate.count += 1;
  return rate.count <= RATE_MAX;
}

/** 校验并归一化收件人（支持逗号分隔，但数量与格式都受限） */
function parseRecipients(to) {
  const list = String(to)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.length || list.length > MAX_RECIPIENTS) return null;
  if (list.some((addr) => addr.length > 254 || !EMAIL_RE.test(addr))) return null;
  return list.join(", ");
}

const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 465,
  secure: true, // 465 隐式 TLS
  auth: { user: QQ_USER, pass: QQ_AUTH },
});

function timingSafeEqualStr(a, b) {
  // 先做定长摘要再比较：长度不同也不提前返回，避免长度侧信道
  const ha = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const hb = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sendJson(res, status, obj) {
  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  if (req.method !== "POST" || req.url !== "/send") {
    sendJson(res, 404, { error: "not found" });
    return;
  }
  if (!timingSafeEqualStr(req.headers["x-mailer-secret"], SECRET)) {
    sendJson(res, 401, { error: "unauthorized" });
    return;
  }
  if (!hitRate()) {
    sendJson(res, 429, { error: "too many requests" });
    return;
  }

  let body = "";
  let tooLarge = false;
  req.on("data", (chunk) => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > MAX_BODY_BYTES) {
      tooLarge = true;
      sendJson(res, 413, { error: "body too large" });
      req.destroy();
    }
  });
  req.on("error", () => sendJson(res, 400, { error: "bad request" }));
  req.on("end", async () => {
    if (tooLarge) return;
    try {
      const { to, subject, html, text } = JSON.parse(body || "{}");
      if (!to || !subject) {
        sendJson(res, 400, { error: "to/subject 必填" });
        return;
      }
      const recipients = parseRecipients(to);
      if (!recipients) {
        sendJson(res, 400, { error: "收件人格式不正确或数量超限" });
        return;
      }
      const info = await transporter.sendMail({
        from: `ShiQing 时倾 <${QQ_USER}>`,
        to: recipients,
        subject: String(subject).slice(0, MAX_SUBJECT_LEN),
        html: String(html ?? ""),
        text: String(text ?? ""),
      });
      console.log(`[mail-relay] 已发送 -> ${recipients} (${info.messageId})`);
      sendJson(res, 200, { ok: true, messageId: info.messageId });
    } catch (err) {
      console.error("[mail-relay] 发送失败:", err);
      sendJson(res, 502, { error: String((err && err.message) || err) });
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mail-relay] QQ 邮件中继已启动: http://127.0.0.1:${PORT}（/health 健康检查）`);
});
