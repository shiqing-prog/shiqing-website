# 项目快照（上下文摘要）

> 本文件是 ShiQing 时倾网站的项目状态快照，供后续会话快速恢复上下文。
> 最后更新：v1.15.0（2026-08-22）

## 一句话

Next.js 16 全栈社区网站：多用户论坛 + 2GB 文件库 + 游戏 + 12 款工具，部署 Cloudflare Workers（D1），文件存本机。

## 线上资源

| 资源 | 地址 | 说明 |
| --- | --- | --- |
| 主站 | https://shiqing.site | 论坛/游戏/工具/更新日志 |
| 文件库 | https://files.shiqing.site | 本机文件存储（Tunnel） |
| dsh 远程 | https://dsh.shiqing.site | Cloudflare Access 认证 |
| GitHub | github.com/shiqing-prog/shiqing-website | 已同步 main |

## 技术栈

- Next.js 16（App Router + Turbopack）+ TypeScript + Tailwind v4（Kratos 蓝 #007cba）
- Cloudflare：Workers（OpenNext 适配）、D1（SQLite）、Tunnel（cloudflared）
- 本机：F:\filelib Node 文件服务（9090 端口）、计划任务自启
- 数据层双实现：线上 D1（data.ts D1DataStore）/ 本地 JSON（data/db.json）

## 功能清单（v1.15.0）

- **论坛**：6 板块（前端/后端/技术综合/生活/游戏/资源）、发帖（带图片/文件附件）、回复、点赞、置顶（管理员）、编辑、删除、搜索、分页、热帖排行、阅读计数
- **用户**：邮箱+密码注册登录、主页、资料编辑、改密码、通知中心（回复提醒）
- **文件库**：2GB/文件、直传本机、HMAC 凭证、进度条、删帖联动清理附件
- **游戏**：贪吃蛇、2048、扫雷、打字测速
- **工具**：JSON/Base64/时间戳/文本统计/颜色/UUID/URL/密码/哈希/正则/进制/壁纸
- **API**：每日一言（Hitokoto）、必应每日壁纸
- **其他**：深色模式切换、更新日志（分类筛选）、SEO（sitemap/robots/OG）、萌ICP

## 关键文件

- `src/lib/data.ts` — 数据层（D1 + JSON 双实现，全部数据操作入口）
- `src/lib/auth.ts` — 认证/会话；`fileticket.ts` — HMAC 凭证；`ratelimit.ts` — 限流
- `wrangler.jsonc` — 部署配置（D1 绑定、域名、FILE_PUBLIC_BASE）
- `db/schema.sql` — 表结构（users/sessions/boards/posts/replies/likes/files/notifications）
- `data/changelog.json` — 更新日志（版本号 1.x 语义化 + category 分类）

## 常用命令

```bash
npm run dev          # 本地开发
npm run deploy:cf    # 构建 + 部署 Cloudflare
schtasks /Run /TN "cloudflared-tunnel"   # 隧道自启
schtasks /Run /TN "shiqing-filelib"      # 文件服务自启
# 设管理员：
npx wrangler d1 execute dsh-bbs --remote --command "UPDATE users SET role='admin' WHERE email='...';"
```

## 版本历史（语义化）

1.0.0 网站上线 → 1.1.0 安全 → 1.2.0 BBS → 1.3.0 文件库/自启 → 1.4.0 Kratos 风格 → 1.5.0 内容管理 → 1.6.0 论坛体验 → 1.7.0 用户与安全 → 1.8.0 互动 → 1.9.0 主题/管理 → 1.10.0 通知/账户 → 1.10.1 修复整理 → 1.11.0 日志分类 → 1.12.0 板块细化 → 1.13.0 游戏/工具/API → 1.14.0 更多游戏/工具 → 1.15.0 发帖附件 + 2GB

## 服务状态检查

- 文件服务：`http://127.0.0.1:9090/health`
- 隧道：`https://files.shiqing.site/health`（200）
- 本机 dsh：127.0.0.1:3080
- 电脑重启后：两条计划任务自动恢复

## 待办/可继续方向

- 邮箱验证（需 SMTP）、文件断点续传、回复分页、帖子标签、五子棋/俄罗斯方块
- 更新日志日期注意用真实日期（git 提交时间）
