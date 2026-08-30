/**
 * 加密 mail-relay 配置：把同目录 config.json 加密为 config.json.enc（AES-256-GCM）。
 * 用法：$env:MAIL_RELAY_KEY = "<64位hex密钥>"; node encrypt.js
 * 密钥生成：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 明文 config.json 不入库（.gitignore），仅加密版入库；运行时可省略明文，
 * 由 server.js 用 MAIL_RELAY_KEY 自动解密。
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEY = process.env.MAIL_RELAY_KEY || "";
if (KEY.length !== 64) {
  console.error("错误：请设置 MAIL_RELAY_KEY（64 位 hex，node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"）");
  process.exit(1);
}

const src = path.join(__dirname, "config.json");
const dst = path.join(__dirname, "config.json.enc");
if (!fs.existsSync(src)) {
  console.error("错误：缺少 config.json");
  process.exit(1);
}

const plain = fs.readFileSync(src, "utf-8");
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(KEY, "hex"), iv);
const enc = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
const tag = cipher.getAuthTag();

fs.writeFileSync(dst, Buffer.concat([iv, tag, enc]));
console.log(`已加密 -> ${dst} (${fs.statSync(dst).size} 字节)`);
