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
 * 配置：优先读同目录 config.json（明文，已被 .gitignore 排除，不入库）；
 * 否则读同目录 config.json.enc（AES-256-GCM 加密版，入库），需环境变量
 * MAIL_RELAY_KEY（64 位 hex 密钥）解密；也可直接用环境变量覆盖：
 *   {
 *     "port": 9091,
 *     "secret": "与 wrangler secret MAILER_SECRET 保持一致",
 *     "qqUser": "你的QQ号@qq.com",
 *     "qqAuth": "QQ邮箱SMTP授权码（QQ邮箱→设置→账户→开启SMTP→生成授权码）"
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

const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 465,
  secure: true, // 465 隐式 TLS
  auth: { user: QQ_USER, pass: QQ_AUTH },
});

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function sendJson(res, status, obj) {
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

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1e6) req.destroy(); // 1MB 上限
  });
  req.on("error", () => sendJson(res, 400, { error: "bad request" }));
  req.on("end", async () => {
    try {
      const { to, subject, html, text } = JSON.parse(body || "{}");
      if (!to || !subject) {
        sendJson(res, 400, { error: "to/subject 必填" });
        return;
      }
      const info = await transporter.sendMail({
        from: `ShiQing 时倾 <${QQ_USER}>`,
        to: String(to),
        subject: String(subject),
        html: String(html ?? ""),
        text: String(text ?? ""),
      });
      console.log(`[mail-relay] 已发送 -> ${to} (${info.messageId})`);
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
