# 个人网站

基于 **Next.js 16 (App Router) + TypeScript + Tailwind CSS** 的全栈个人网站。
前台展示作品与博客，后台 `/admin` 管理内容，数据以 JSON 文件本地存储，零数据库依赖，开箱即用。

## ✨ 功能

- **首页**：个人简介（Hero）+ 精选项目 + 最新文章
- **项目**：作品集展示（技术栈标签、在线链接、GitHub 链接）
- **博客**：文章列表与详情页（支持 `#` 标题、有序列表、段落排版）
- **关于**：个人介绍、技能、联系方式
- **后台管理 `/admin`**：项目与文章的增删改查、精选/发布开关
- 深色模式自适应、响应式布局、404 页面

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（Next.js 16 默认使用 Turbopack）
npm run dev
```

打开 http://localhost:3000 即可访问。

生产构建：

```bash
npm run build && npm run start
```

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

## 🎨 个性化修改

- **导航栏 / 页脚**：`src/components/Navbar.tsx`、`Footer.tsx`
- **首页文案**：`src/app/page.tsx`（替换「你的名字」、简介等）
- **关于页**：`src/app/about/page.tsx`（技能、邮箱、GitHub 等）
- **站点标题 / 描述**：`src/app/layout.tsx` 中的 `metadata`
- **主题色**：Tailwind 的 `blue` 系配色，改类名即可（如 `bg-blue-600` → `bg-emerald-600`）

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
