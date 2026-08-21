# ShiQing 论坛（shiqing.site）

基于 **Next.js 16 (App Router) + TypeScript + Tailwind CSS** 的多用户 BBS 论坛，
部署在 **Cloudflare Workers**（D1 数据库），附带 **1GB 大文件传输**（本机存储 + Cloudflare Tunnel）。

## ✨ 功能

- **多用户系统**：邮箱 + 密码注册/登录（bcrypt 加密 + Cookie 会话），/register /login
- **BBS 论坛**：多板块（技术交流/生活杂谈/资源共享）、发帖、回复
- **文件库 /files**：登录用户上传（单文件最大 1GB）、全员下载、作者可删
  - 文件实际存储在本机 `F:\filelib`（独立 Node 服务），经 `files.shiqing.site` 隧道直传，不经过 Worker
- 原有个人站内容保留：项目 / 博客 / 工具 / 关于（导航弱化入口）
- 深色模式自适应

## 🏗️ 架构

```
浏览器 → https://shiqing.site (Cloudflare Workers + D1)
           ├── 用户 / 板块 / 帖子 / 回复 / 文件元数据 → Cloudflare D1 (SQLite)
           └── 文件上传/下载 → https://files.shiqing.site (Cloudflare Tunnel)
                                    └── 本机 F:\filelib 文件服务 (Node, 9090 端口)
```

- **数据层双实现**：线上用 D1（`src/lib/data.ts` D1DataStore），本地 `npm run dev` 自动降级为 JSON 文件存储（`data/db.json`，勿提交）
- **文件凭证**：Worker 用 HMAC（`FILE_HMAC_SECRET`）签发上传/删除凭证，本机文件服务验证（`F:\filelib\secret.txt` 需与 wrangler secret 一致）

## 🚀 开发

```bash
npm install
npm run dev        # 本地开发（数据存 data/db.json）
```

## ☁️ 部署（Cloudflare）

```bash
npm run deploy:cf  # opennextjs-cloudflare build && wrangler deploy
```

依赖的 Cloudflare 资源（已创建）：
- D1 数据库 `dsh-bbs`（`db/schema.sql` 初始化，含种子板块）
- Worker secret `FILE_HMAC_SECRET`
- 自定义域名：shiqing.site / www.shiqing.site（Worker）、dsh.shiqing.site / files.shiqing.site（Tunnel）

本机常驻服务（Windows）：
- `F:\filelib` 文件服务：`node F:\filelib\server.js`（127.0.0.1:9090）
- Cloudflare Tunnel：计划任务 `cloudflared-tunnel`（开机自启，读 `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml`）

## 📄 License

MIT


## 📁 目录结构

```
personal-site/
├── data/                    # 站点数据（JSON 存储，构建时编译进产物）
│   ├── projects.json        # 项目数据
│   └── posts.json           # 文章数据
├── src/
│   ├── app/
│   │   ├── layout.tsx       # 根布局（导航栏 + 页脚）
│   │   ├── page.tsx         # 首页
│   │   ├── about/           # 关于我
│   │   ├── projects/        # 项目列表
│   │   ├── blog/            # 博客列表
│   │   ├── blog/[slug]/     # 文章详情（构建时静态生成）
│   │   ├── tools/           # 实用工具页
│   │   ├── admin/           # 后台管理（客户端组件，仅本地可写）
│   │   ├── api/             # Route Handlers（本地 CRUD；线上 GET 只读）
│   │   └── not-found.tsx    # 404 页
│   ├── components/          # 导航栏、页脚、卡片、工具组件
│   └── lib/
│       ├── types.ts         # 类型定义
│       ├── content.ts       # 构建期数据源（import JSON，线上用）
│       └── store.ts         # 本地 JSON 读写（本地开发用）
├── wrangler.jsonc           # Cloudflare Workers 部署配置
├── open-next.config.ts      # OpenNext Cloudflare 适配器配置
└── public/                  # 静态资源
```

## 📝 内容管理

- 打开 http://localhost:3000/admin 进行内容管理
- 修改**即时生效**，无需重启；数据写入 `data/` 下的 JSON 文件
- 也可直接编辑 JSON 文件（注意保持合法 JSON 格式）

### 数据字段说明

**项目**（`data/projects.json`）：

| 字段 | 说明 |
| --- | --- |
| `id` | 唯一标识（默认自动生成） |
| `title` | 项目名称 |
| `description` | 项目描述 |
| `tech` | 技术栈数组 |
| `link` / `github` | 在线链接 / 源码地址 |
| `featured` | 是否精选（显示在首页） |
| `createdAt` | 日期（YYYY-MM-DD） |

**文章**（`data/posts.json`）：

| 字段 | 说明 |
| --- | --- |
| `slug` | URL 标识（自动由标题生成） |
| `title` / `excerpt` | 标题 / 摘要 |
| `content` | 正文（空行分段；支持 `#`/`##`/`###` 标题与 `1.` 有序列表） |
| `tags` | 标签数组 |
| `published` | 是否发布（false 则前台不显示） |
| `date` | 日期（YYYY-MM-DD） |

## 👑 管理员设置

默认注册的用户都是普通用户。将某个已注册邮箱设为管理员：

```bash
npx wrangler d1 execute dsh-bbs --remote --command "UPDATE users SET role='admin' WHERE email='你的邮箱';"
```

管理员权限：
- 删除任意帖子 / 回复
- 访问后台管理页 `/admin`（项目/博客内容管理）

## 🎨 个性化修改

- **导航栏 / 页脚**：`src/components/Navbar.tsx`、`Footer.tsx`
- **首页文案**：`src/app/page.tsx`（板块标签、站点头部）
- **关于页**：`src/app/about/page.tsx`（技能、邮箱、GitHub 等）
- **站点标题 / 描述 / OG 标签**：`src/app/layout.tsx` 中的 `metadata`
- **更新日志**：`data/changelog.json`（每次更新在此追加新版本）
- **主题色**：`src/app/globals.css` 中的 Kratos 蓝色系变量

## ☁️ 部署到 Cloudflare（当前线上方案）

本项目已配置 **Cloudflare Workers + OpenNext** 部署，线上地址：**https://shiqing.site**

```bash
# 1. 登录 Cloudflare（首次）
npm run cf:login

# 2. 构建 + 部署（含自定义域名绑定）
npm run deploy:cf
```

部署配置位于 `wrangler.jsonc`（Worker 名、`shiqing.site` / `www.shiqing.site` 自定义域名、nodejs_compat 标志）。

### ⚠️ 重要：数据更新方式

前台页面在**构建时**把 `data/*.json` 编译进产物（见 `src/lib/content.ts`），
线上运行时**不读写文件**（Cloudflare Workers 环境不支持）。因此：

- 修改 `data/*.json` 或后台 `/admin` 保存内容后 → 重新执行 `npm run deploy:cf` 即可生效
- 后台管理 `/admin` 在线上只读（显示构建时的数据），**编辑/新增/删除仅本地开发时可用**（`npm run dev`）

本地开发流程不变：`npm run dev`，后台管理完整可用。

> 若以后需要线上在线编辑内容，可将数据迁移到 Cloudflare D1 (SQLite) 或 KV，
> 改 `src/lib/store.ts` 的实现即可，页面层无需改动。

## 📄 License

MIT
