# mail.shiqing.site / files.shiqing.site 隧道接入指南

> ✅ **2026-10-07 迁移到 Linux（Ubuntu）后已重新落地**：本机三个常驻服务改用 **systemd 用户级服务**（登录即启动，并已 `loginctl enable-linger shiqing`，开机免登录也会拉起）；隧道 `shiqing-mail`（`64e37d40-92aa-48a8-843c-1656beaf0856`）的 ingress 改为 **Cloudflare 远程配置**管理。

## 链路

```
shiqing.site (Worker)
  ├─ POST https://mail.shiqing.site/send   (x-mailer-secret)
  │    └─ cloudflared 隧道 shiqing-mail
  │         └─ 本机 http://127.0.0.1:9091  (mail-relay/server.js → QQ SMTP)
  └─ 文件库 https://files.shiqing.site
       └─ cloudflared 隧道 shiqing-mail
            └─ 本机 http://127.0.0.1:9090  (filelib/server.js)
```

## 本机服务（systemd --user）

| 服务 | 定义文件 | 监听 | 说明 |
|---|---|---|---|
| `shiqing-filelib` | `~/.config/systemd/user/shiqing-filelib.service` | 127.0.0.1:9090 | `/run/media/shiqing/041A79441A7933B0/filelib`（零依赖 Node） |
| `shiqing-mailrelay` | `~/.config/systemd/user/shiqing-mailrelay.service` | 127.0.0.1:9091 | `personal-site/mail-relay`（nodemailer + QQ SMTP） |
| `shiqing-cloudflared` | `~/.config/systemd/user/shiqing-cloudflared.service` | — | `~/.local/bin/cloudflared`，token 在 `~/.cloudflared/tunnel.env` |

## 常用命令

```bash
systemctl --user status shiqing-filelib shiqing-mailrelay shiqing-cloudflared
systemctl --user restart shiqing-cloudflared
journalctl --user -u shiqing-mailrelay -f
loginctl enable-linger shiqing     # 开机免登录自启（已开启）
```

## 隧道（cloudflared）

- 二进制：`~/.local/bin/cloudflared`（GitHub release `cloudflared-linux-amd64`）
- Connector token：用 Cloudflare API Token 调 `GET /accounts/{account_id}/cfd_tunnel/{tunnel_id}/token`，保存到 `~/.cloudflared/tunnel.env` 的 `TUNNEL_TOKEN=`
- 运行：`cloudflared tunnel --no-autoupdate run`（从环境变量读取 `TUNNEL_TOKEN`）
- Ingress（远程配置，`config_src=cloudflare`）：
  ```json
  { "config": { "ingress": [
    { "hostname": "files.shiqing.site", "service": "http://127.0.0.1:9090" },
    { "hostname": "mail.shiqing.site",  "service": "http://127.0.0.1:9091" },
    { "service": "http_status:404" }
  ] } }
  ```
  通过 `PUT /accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations` 设置。DNS 仍指向 `64e37d40-....cfargotunnel.com`，无需改动。

## 配置要点

- `mail-relay/config.json` 的 `secret` 必须与 Worker 的 `MAILER_SECRET` 一致
- `config.json` 含 QQ 授权码，**已 .gitignore 不入库**；仓库提交的是加密版 `config.json.enc`
- `filelib/secret.txt` 必须与 Worker 的 `FILE_HMAC_SECRET` 一致

## 健康检查

- 本机：`curl http://127.0.0.1:9090/health`、`curl http://127.0.0.1:9091/health` → `ok`
- 公网：`https://files.shiqing.site/health`、`https://mail.shiqing.site/health` → `ok`
- 总览：`https://shiqing.site/status`（JSON：`/api/status`）
