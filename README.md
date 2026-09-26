# ShiQing 时倾（shiqing.site）

一个无人知晓的小站点 —— 多用户论坛 + 文件库 + 游戏 + 实用工具。
基于 **Next.js 16 (App Router) + TypeScript + Tailwind CSS**，部署在 **Cloudflare Workers**（D1 数据库），文件存储在本机并经 Cloudflare Tunnel 提供访问。

> 📦 当前版本：**v1.28.0** ｜ 🔗 GitHub：[shiqing-prog/shiqing-website](https://github.com/shiqing-prog/shiqing-website)

## ✨ 功能总览

**🗣️ 论坛（6 大板块）**
- 板块：前端开发 / 后端开发 / 技术综合 / 生活杂谈 / 游戏交流 / 资源共享
- 发帖（可附带**图片与文件**，帖子底部下载链接）、回复、点赞、编辑、删除
- 帖子置顶（管理员）、全站搜索、板块分页、最新/热门排行
- 阅读计数、回复通知（导航栏铃铛）、分享复制链接

**👤 用户系统**
- 邮箱 + 密码注册/登录（bcrypt 加密 + Cookie 会话）
- 用户主页（资料、TA 的帖子）、资料编辑、修改密码
- 防刷限流（注册/登录）、通知中心

**📁 文件库（/files）**
- 登录上传、全员下载、作者可删，**单文件最大 2GB**，上传进度条
- 文件直传本机存储（`F:\filelib`），经 `files.shiqing.site` 隧道访问，HMAC 凭证鉴权
- 帖子附件与文件库统一存储

**🎮 游戏（/games，10 款）**：贪吃蛇、2048、扫雷、打字测速、五子棋、俄罗斯方块、井字棋、猜数字、记忆翻牌、记忆序列

**🧰 工具（/tools，22 款）**：JSON 格式化、Base64、时间戳、文本统计、颜色转换、UUID、URL 编解码、密码生成、文本哈希、正则测试、进制转换、每日壁纸、图片转 Base64、随机数、单位换算、文本行处理、Base64 转图片、JSON 转 TS、调色板、Markdown 预览、Cron 解析、对比度检查

**🧠 心理测评（/psych，13 个量表）**
- 情绪：PHQ-9 抑郁、GAD-7 焦虑、DASS-21（抑郁/焦虑/压力）
- 人格：mini-IPIP 大五人格、荣格四维偏好速测（16 型）
- 健康与关系：WHO-5、心理繁荣量表、PHQ-15 躯体症状、生活满意度、罗森伯格自尊、UCLA-3 孤独感、依恋关系结构 ECR-RS
- 职业：职业兴趣探索（RIASEC 霍兰德三码）
- 全部在浏览器本地计分；登录后可保存记录、查看历史与同量表趋势；每题标注来源与许可，PHQ-9 第 9 题触发危机求助提示
- 量表许可调研与「收录 / 回避」清单见 `docs/psych/LICENSE_RESEARCH.md`；评分自检 `npm run test:psych`

**🏷️ 其他**：标签云 `/tags`、站点统计 `/stats`、RSS `/feed.xml`（支持 `?board=slug`）、站内私信、关注/粉丝、每日签到与热力图、站内公告、通知中心

**📋 更新日志（/changelog）**：按分类归档（新功能/改进/修复/安全/文档）+ 筛选

**🌐 API 接入**：每日一言（Hitokoto）、必应每日壁纸（Worker 代理）

**其他**：深色/亮色模式切换、SEO（sitemap/robots/OG）、萌ICP备案、响应式布局

## 🏗️ 架构

```
浏览器 → https://shiqing.site (Cloudflare Workers + D1)
           ├── 用户 / 板块 / 帖子 / 回复 / 通知 / 文件元数据 → Cloudflare D1 (SQLite)
           ├── 静态内容（工具/游戏/更新日志）→ 构建期编译
           ├── 文件上传/下载 → https://files.shiqing.site (Cloudflare Tunnel)
           │                        └── 本机 F:\filelib 文件服务 (Node, 9090 端口)
           └── 验证邮件 → https://mail.shiqing.site (Cloudflare Tunnel)
                                └── 本机 mail-relay (Node, 9091 端口，QQ 邮箱 SMTP)
```

- **数据层双实现**：线上用 D1（`src/lib/data.ts` D1DataStore），本地 `npm run dev` 自动降级为 JSON 文件存储（`data/db.json`，勿提交）
- **文件凭证**：Worker 用 HMAC（`FILE_HMAC_SECRET`）签发上传/删除凭证，本机文件服务验证（`F:\filelib\secret.txt` 与 wrangler secret 一致）
- **静态内容**（项目/工具/更新日志）：`data/*.json` 构建时编译进产物（`src/lib/content.ts`）

## 🚀 本地开发

```bash
npm install
npm run dev        # http://localhost:3000（数据存 data/db.json）
```

## 📱 旧浏览器兼容（Android 8 内置 WebView）

目标内核：**Android 8.0 内置 WebView ≈ Chrome 58**（Android 8.1 ≈ Chrome 61）。
Tailwind v4 默认面向 Chrome 111+ / Safari 16.4+，直接产物在旧内核上会**整体失效**，因此构建链做了四层处理：

| 层 | 问题 | 处理 |
|---|---|---|
| CSS `@layer` | Chrome 99+ 才支持；旧内核会**丢弃整个 @layer 块** → 全站工具类消失 | `@csstools/postcss-cascade-layers` 构建期展平 |
| CSS `:where()/:is()` | Chrome 88+；解析失败 → 深色模式等规则整条失效 | 自研插件 `packages/postcss-legacy-pseudo-classes` 展开为普通选择器（自检 `npm run test:legacy-css`） |
| CSS 颜色/媒体查询 | `color-mix()`/`oklab()`（Chrome 111+）、range 媒体查询（Chrome 104+） | `@csstools` 系列插件降级；`@property` 由 Tailwind 自带兜底 |
| JS 语法 | 可选链/空值合并/可选 catch 在 Chrome 58 是**语法错误**（白屏） | `package.json` 的 `browserslist`（chrome >= 58）让 SWC 降级应用代码 |
| JS 运行时 API | AbortController、queueMicrotask、Object.hasOwn、`.at()` 等不存在 | `public/legacy-polyfills.js`，用 `<script nomodule>` 加载——**只有老内核会下载执行**，现代浏览器零开销 |
| Next 预编译 chunk | node_modules 里的 chunk 不参与降级，含 `for await`（需 Chrome 63+） | `scripts/legacy-transpile.js`：acorn 按 ES2017 检测 + esbuild 精准降级（33 个 chunk 中实际只改 1 个），已挂进 `build:cf`/`deploy:cf` |
| 视觉降级 | flex 布局的 `gap` 需 Chrome 84+；`backdrop-filter` 需 Chrome 76+ | 能力探测给 `<html>` 打 `noflexgap`/`nobackdrop` 类，`globals.css` 末尾按类兜底（关键容器标 `data-gaprow`） |

相关自检命令：

```bash
npm run test:legacy-css     # 选择器降级逻辑单测
npm run test:legacy-build   # 校验产物：polyfill 是 ES5、所有 chunk 可被 ES2017 解析、CSS 无 @layer/:where
```

**注意**：以上是静态校验，不等于真机验证。改动样式或引入新的浏览器 API 后，建议用 Android 8 真机（或 `chrome58` 内核的模拟器）打开首页、帖子详情、`/psych` 与文件上传做一次冒烟。

## ☁️ 部署（Cloudflare）

```bash
npm run deploy:cf  # opennextjs-cloudflare build && wrangler deploy
```

依赖的 Cloudflare 资源（已创建）：
- D1 数据库 `dsh-bbs`（`db/schema.sql` 初始化，含种子板块）
- Worker secret `FILE_HMAC_SECRET`、`MAILER_SECRET`（与 mail-relay `config.json` 的 secret 一致）
- 自定义域名：shiqing.site / www.shiqing.site（Worker）、dsh.shiqing.site / files.shiqing.site / mail.shiqing.site（Tunnel）

本机常驻服务（Windows，计划任务自启）：
- 文件服务：`schtasks /Run /TN "shiqing-filelib"`（`F:\filelib\server.js`，127.0.0.1:9090，零依赖纯 Node）
  - 密钥：`F:\filelib\secret.txt`（与 wrangler secret `FILE_HMAC_SECRET` 一致）；分片断点续传/合并/下载/删除协议见 `F:\filelib\server.js` 头注释，自测脚本 `F:\filelib\test.js`
  - 创建任务（管理员 CMD）：`schtasks /Create /TN "shiqing-filelib" /TR "\"D:\nodejs\node.exe\" \"F:\filelib\server.js\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F`
  - 健康检查：`http://127.0.0.1:9090/health`（返回 ok）
- 邮件中继：`schtasks /Run /TN "shiqing-mailrelay"`（`mail-relay\server.js`，127.0.0.1:9091，QQ 邮箱 SMTP 发信）
  - 配置：`mail-relay\config.json`（**不入库**，含 qqUser / qqAuth 授权码 / secret）；仓库内提交的是加密版 `config.json.enc`
  - 加密/解密：`mail-relay\encrypt.js`，密钥 64 位 hex 存于仓库外（本机 `F:\harness\mailrelay-key.txt`，环境变量 `MAIL_RELAY_KEY`）；`server.js` 启动时若只有加密版会自动用 `MAIL_RELAY_KEY` 解密
  - 创建任务（管理员 CMD）：`schtasks /Create /TN "shiqing-mailrelay" /TR "\"D:\nodejs\node.exe\" \"F:\harness\personal-site\mail-relay\server.js\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F`
  - 健康检查：`http://127.0.0.1:9091/health`（返回 ok）
- 隧道：`schtasks /Run /TN "cloudflared-tunnel"`（配置 `C:\Users\31007\.cloudflared\config.yml`，隧道 `shiqing-mail`：mail.shiqing.site → 9091、files.shiqing.site → 9090）

## 👑 管理员设置

```bash
npx wrangler d1 execute dsh-bbs --remote --command "UPDATE users SET role='admin' WHERE email='你的邮箱';"
```

管理员权限：删除/置顶任意帖子、删除任意回复、访问后台管理页 `/admin`（论坛管理 + 项目/文章管理）。

## 📁 目录结构

```
personal-site/
├── data/                    # 静态内容数据（构建时编译进产物）
│   ├── changelog.json       # 更新日志（每次更新在此追加，带分类）
│   ├── projects.json        # 项目数据
│   └── posts.json           # 博客文章数据（已归档，前台展示于更新日志）
├── db/schema.sql            # D1 数据库结构（含种子板块）
├── src/
│   ├── app/
│   │   ├── page.tsx         # 首页（论坛：板块标签 + 最新/热门）
│   │   ├── bbs/             # 论坛：板块 / 帖子详情 / 发帖 / 搜索
│   │   ├── files/           # 文件库
│   │   ├── games/           # 游戏（贪吃蛇/2048/扫雷/打字）
│   │   ├── tools/           # 工具页（12 款）
│   │   ├── changelog/       # 更新日志（分类时间线）
│   │   ├── notifications/   # 通知中心
│   │   ├── settings/        # 账户设置（改密码）
│   │   ├── user/            # 用户主页 / 资料编辑
│   │   ├── login/ register/ # 认证页
│   │   ├── admin/           # 后台管理（仅管理员）
│   │   ├── api/             # Route Handlers（auth/posts/files/notifications/wallpaper…）
│   │   ├── sitemap.ts robots.ts loading.tsx error.tsx
│   │   └── layout.tsx       # 根布局（导航/主题初始化/metadata）
│   ├── components/          # 导航、卡片、论坛/游戏/工具组件
│   └── lib/
│       ├── types.ts         # 类型定义
│       ├── data.ts          # 数据层（D1 + JSON 双实现）
│       ├── auth.ts          # 认证与会话
│       ├── content.ts       # 构建期静态内容源
│       ├── fileticket.ts    # 文件 HMAC 凭证
│       └── ratelimit.ts     # 注册/登录限流
├── wrangler.jsonc           # Cloudflare Workers 部署配置（D1 绑定、域名、secret）
├── open-next.config.ts      # OpenNext Cloudflare 适配器
└── next.config.ts
```

## 📝 维护约定

- **更新日志**：每次发布新功能/修复后，在 `data/changelog.json` 顶部追加新版本（`version` 递增，`category` 填 `new`/`improve`/`fix`/`security`/`docs`）
- **板块**：D1 `boards` 表（`db/schema.sql` 有种子数据）
- **文件库密钥**：改 `F:\filelib\secret.txt` 后须同步 `npx wrangler secret put FILE_HMAC_SECRET`

## 🎨 个性化修改

- **导航 / 页脚**：`src/components/Navbar.tsx`、`Footer.tsx`
- **站点标题 / 描述 / OG**：`src/app/layout.tsx` 的 `metadata`
- **主题色**：`src/app/globals.css`（Kratos 蓝色系变量）
- **站名**：全站搜索「时倾」替换

## 📄 License

MIT
