# mail.shiqing.site 隧道接入指南（QQ 邮箱验证用）

> ✅ **已于 2026-08-30 在本机完成**：隧道 `shiqing-mail`（64e37d40-92aa-48a8-843c-1656beaf0856）已建、DNS 已指到 `64e37d40-....cfargotunnel.com`、计划任务 `cloudflared-tunnel` 已注册（SYSTEM/ONSTART，`--config C:\Users\31007\.cloudflared\config.yml` run shiqing-mail）。以下为复现/排障步骤。

Cloudflare Worker 无法直连 SMTP，验证邮件链路为：

```
shiqing.site (Worker)
  └─ POST https://mail.shiqing.site/send  (x-mailer-secret 鉴权)
       └─ cloudflared 隧道
            └─ 本机 http://127.0.0.1:9091 (mail-relay\server.js，位于本仓库 mail-relay/)
                 └─ QQ 邮箱 SMTP (smtp.qq.com:465, 授权码)
```

中继服务本身已验证可用（QQ SMTP 测试邮件成功，`/health` 200）。下面只需把 `mail.shiqing.site` 暴露到本机 9091 端口。

## 步骤（在**管理员** CMD/PowerShell 中执行）

### 1. 安装 cloudflared（如未安装）
```cmd
winget install --id Cloudflare.cloudflared
```

### 2. 登录并创建/复用隧道
```cmd
cloudflared tunnel login            # 浏览器授权（选 shiqing.site 所在账户）
cloudflared tunnel create shiqing   # 首次创建；已有隧道可复用
```

### 3. 添加 DNS 路由
```cmd
cloudflared tunnel route dns shiqing mail.shiqing.site
```

### 4. 编写隧道配置
编辑 `%USERPROFILE%\.cloudflared\config.yml`（或原系统级配置所在位置），ingress 增加：
```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<你>\.cloudflared\<TUNNEL_ID>.json
ingress:
  - hostname: files.shiqing.site
    service: http://127.0.0.1:9090
  - hostname: mail.shiqing.site
    service: http://127.0.0.1:9091
  - service: http_status:404
```

### 5. 启动并验证
```cmd
cloudflared tunnel run shiqing
curl https://mail.shiqing.site/health    # 期望 200 ok
```

### 6. 计划任务自启（中继服务）
```cmd
schtasks /Create /TN "shiqing-mailrelay" /TR "\"D:\nodejs\node.exe\" \"F:\harness\personal-site\mail-relay\server.js\"" /SC ONLOGON /RL LIMITED /F
schtasks /Create /TN "cloudflared-tunnel" /TR "cloudflared tunnel run shiqing" /SC ONSTART /RL HIGHEST /F
```

## 健康检查
- 中继本机：`http://127.0.0.1:9091/health` → `ok`
- 公网：`https://mail.shiqing.site/health` → `ok`
- 端到端：注册新账号时收到 QQ 邮箱验证邮件；或 `/api/auth/verify-enabled` 返回 `{"enabled":true}`

## 配置要点
- `mail-relay\config.json` 的 `secret` 必须与 Worker 的 `MAILER_SECRET`（`npx wrangler secret put MAILER_SECRET`）一致
- `config.json` 含 QQ 授权码，**已 .gitignore 不入库**；仓库提交的是加密版 `config.json.enc`
- 加密：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成 64 位 hex 密钥 → `$env:MAIL_RELAY_KEY=<密钥>; node encrypt.js`
- 密钥与明文 config 都保存在仓库外（本机 `F:\harness\mailrelay-key.txt`）；`server.js` 启动时若只有 `config.json.enc`，会用 `MAIL_RELAY_KEY` 自动解密
