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
├── data/                    # 站点数据（JSON 存储）
│   ├── projects.json        # 项目数据
│   └── posts.json           # 文章数据
├── src/
│   ├── app/
│   │   ├── layout.tsx       # 根布局（导航栏 + 页脚）
│   │   ├── page.tsx         # 首页
│   │   ├── about/           # 关于我
│   │   ├── projects/        # 项目列表
│   │   ├── blog/            # 博客列表
│   │   ├── blog/[slug]/     # 文章详情
│   │   ├── admin/           # 后台管理（客户端组件）
│   │   ├── api/             # Route Handlers（CRUD API）
│   │   └── not-found.tsx    # 404 页
│   ├── components/          # 导航栏、页脚、卡片组件
│   └── lib/
│       ├── types.ts         # 类型定义
│       └── store.ts         # JSON 读写工具
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

## ☁️ 部署

推荐部署到 [Vercel](https://vercel.com)（Next.js 官方平台，免费）：

1. 将项目推送到 GitHub
2. Vercel 中导入仓库，框架选择 Next.js，其余默认
3. 部署完成后自动获得 HTTPS 域名

> 注意：数据以文件形式存储，Vercel 的无服务器环境不支持持久化写文件，
> 若需在线编辑内容，建议后续迁移到 SQLite / Postgres / Vercel KV 等数据库。
> 纯展示场景（内容直接写 JSON 后提交）不受影响。

## 📄 License

MIT
