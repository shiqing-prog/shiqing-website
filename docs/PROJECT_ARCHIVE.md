# ShiQing 时倾 · 项目档案

> **档案基线**：站点 v1.42.3 ｜ commit `9f4873e`（2026-10-28）｜ 仓库 `shiqing-prog/shiqing-website`
> **建档时间**：2026-10-29
> **定位**：这是站点的**完整档案**——新会话、新维护者读完这一份就能接手。日常速查看 [docs/PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)；卡密对外协议看 [docs/card-api.md](./card-api.md)；安全与轮换看 [SECURITY.md](../SECURITY.md)；上手命令看 [README.md](../README.md)。

---

## 0. 找什么看哪里

| 我想知道 | 看这里 |
| --- | --- |
| 站点是干什么的、规模多大 | §1 |
| 线上跑在哪、依赖哪些外部服务 | §2、§13 |
| 用了什么框架/库、怎么构建 | §3、§4 |
| 某个功能代码在哪 | §5 代码地图、§10 子系统 |
| 数据存哪、表结构 | §6、§7 |
| 有哪些接口、怎么鉴权 | §8、§11 |
| 有哪些页面 | §9 |
| 部署/回滚/排障 | §13 |
| 历史上修过什么、为什么 | §14、§15 |
| 有什么已知坑、不能做什么 | §16、§17 |

---

## 1. 一句话与规模

**一个无人知晓的小站点**：多用户论坛 + 2GB 文件库 + 27 个浏览器本地工具 + 10 款小游戏 + 27 个心理量表 + 卡密分发中心，Next.js 16 App Router 全栈，跑在 Cloudflare Workers + D1，文件与邮件走 Cloudflare Tunnel 落回本机/玩客云。

| 指标 | 数值（v1.42.3） |
| --- | --- |
| 源码 | src 约 2.85 万行（lib 9.1k、components 10.3k、app 9.0k） |
| 路由 | API 58 个 route.ts，页面 38 个 page.tsx，布局 1 个 |
| 数据表 | 24 张（D1 / SQLite） |
| 工具 | 27 个（src/components/tools/*Tool.tsx） |
| 游戏 | 10 款（src/components/games/*.tsx） |
| 心理量表 | 27 个（src/lib/psych/scales.ts，2998 行） |
| 更新日志 | 49 条版本记录（1.0.0 → 1.42.3） |
| Git | 96 个提交（首提交 2026-08-16） |
| 依赖 | 运行期仅 7 个 npm 包（next/react/bcryptjs/markdown-it/qrcode 等） |

> **版本号只维护在 data/changelog.json**，package.json 的 `version` 是脚手架残留的 `0.1.0`，不要拿它当发布号。

---

## 2. 线上资源与拓扑

| 资源 | 地址 | 承载 |
| --- | --- | --- |
| 主站 | https://shiqing.site （+ www） | Cloudflare Worker（OpenNext 产物）+ D1 |
| 文件库 | https://files.shiqing.site | Cloudflare Tunnel → 玩客云 filelib :9090 |
| 邮件中继 | https://mail.shiqing.site | Cloudflare Tunnel → 玩客云 mail-relay :9092 |
| 卡密中心（外部） | https://cards.shiqing.site | 玩客云 cardserver :8787，被主站 CSP `frame-src` 放行 |
| dsh 远程 | https://dsh.shiqing.site | Cloudflare Access 保护的本机 dsh web |
| 仓库 | github.com/shiqing-prog/shiqing-website | main 分支，单线开发 |

请求路径：

```
浏览器 → shiqing.site (Worker + D1)
          ├── 页面/接口 → D1(dsh_bbs) 读业务数据
          ├── admin 改项目/博客 → D1 site_content（线上）/ data/*.json（本地）
          ├── 上传下载 → files.shiqing.site → filelib（HMAC 凭证鉴权）
          └── 验证/提醒邮件 → mail.shiqing.site → mail-relay → QQ 域名邮箱 SMTP
```

**运维事实**（2026-10 复核）：

- 笔记本只常驻 `shiqing-cloudflared` 隧道单元；filelib / mail-relay / cardserver 的源站都在玩客云 192.168.1.193（Node 20 在 `/opt/node`）。
- 两个隧道 `shiqing-files`、`shiqing-relay` 的 ExecStart 都带 `--edge-ip-version 4`（该机 IPv6 假通，能拿地址但大文件下不来）。
- 改 systemd unit 前先 `systemctl list-dependencies --reverse`：曾因 `Requires=` 停 filelib 连带停 cloudflared，导致 files/mail/cards 全线 530 约 6 分钟。

---

## 3. 技术栈

| 层 | 选型 | 备注 |
| --- | --- | --- |
| 框架 | Next.js 16.3.1（App Router、Turbopack、async params） | Server Components 为主，交互处才 `"use client"` |
| 语言 | TypeScript 5（strict） | `npx tsc --noEmit` 必须干净 |
| UI | React 19.2.8 + Tailwind CSS v4（Kratos 蓝 #007cba） | 无 UI 组件库，全手写 |
| 运行时 | Cloudflare Workers（`nodejs_compat`，compat date 2025-01-01） | @opennextjs/cloudflare 1.20.2 |
| 数据库 | Cloudflare D1（SQLite）binding `dsh_bbs` | 本地 dev 自动降级 JSON 文件 |
| 加密 | bcryptjs（cost 10）、WebCrypto HMAC-SHA256 / SHA-256 / MD5 | 无 Node 原生 crypto 依赖 |
| Markdown | markdown-it（`html:false`、`linkify:true`、`breaks:true`） | 用户内容一律不渲染原始 HTML |
| 二维码 | qrcode（客户端生成） | |
| 部署 | OpenNext 构建 → `wrangler deploy` | 不做 CI，手动部署 |

**刻意不引入**：ORM（直接写 SQL）、状态管理库（useState + fetch）、表单库、UI 框架、邮件 SDK（自己 fetch 到 mail-relay）、非必要 polyfill。

---

## 4. 构建链与旧浏览器兼容

```bash
npm run dev        # next dev，数据落 data/db.json
npm run build:cf   # opennextjs-cloudflare build && legacy-transpile && populate-static-cache
npm run deploy:cf  # 上一步 + wrangler deploy
```

`build:cf` 的三个阶段：

1. `opennextjs-cloudflare build` → 产出 .open-next/worker.js + assets/；
2. `node scripts/legacy-transpile.js` → 用 acorn 按 **ES2017** 扫描 Next 预编译 chunk（node_modules 里不参与 SWC 降级的那些），发现 `for await` 之类才用 esbuild 精准降级（33 个 chunk 里通常只改 1 个）；
3. `node scripts/populate-static-cache.js` → 把 .open-next/cache 复制进 assets/cdn-cgi/_next_cache（配合 `staticAssetsIncrementalCache`，否则增量缓存等于没开）。

**目标内核 Android 8 内置 WebView ≈ Chrome 58**，为此做了 7 层处理：

| 层 | 问题 | 处理 |
| --- | --- | --- |
| CSS @layer | Chrome 99+；旧内核整块丢弃 → 工具类全失效 | @csstools/postcss-cascade-layers 构建期展平 |
| CSS :where()/:is() | Chrome 88+；解析失败整条规则失效 | 自研插件 packages/postcss-legacy-pseudo-classes |
| CSS 颜色/媒体查询 | color-mix()/oklab()/range 媒体查询 | @csstools 系列插件降级 |
| JS 语法 | 可选链/空值合并/可选 catch 在 Chrome 58 是**语法错误**（白屏） | `browserslist: chrome >= 58` 让 SWC 降级应用代码 |
| JS 运行时 API | AbortController、queueMicrotask、.at() 等缺失 | public/legacy-polyfills.js + `<script nomodule>`（现代浏览器零开销） |
| Next 预编译 chunk | 含 `for await`（需 Chrome 63+） | scripts/legacy-transpile.js |
| 视觉降级 | flex gap 需 Chrome 84+、backdrop-filter 需 76+ | `<html>` 打 `noflexgap`/`nobackdrop`，globals.css 末尾按类兜底，关键容器标 `data-gaprow` |

自检：`npm run test:legacy-css`（选择器降级单测）、`npm run test:legacy-build`（产物：polyfill 是 ES5、所有 chunk 可被 ES2017 解析、CSS 无 @layer/:where）。**静态校验 ≠ 真机**，改样式后建议 Android 8 真机冒烟首页 / 帖子详情 / /psych / 上传。

**缓存与渲染策略**

- open-next.config.ts：`incrementalCache: staticAssetsIncrementalCache`、`enableCacheInterception: true` —— 预渲染页命中缓存后直接返回（TTFB 0.63s → 0.25s，服务端 CPU 仅 ~24ms）。**用了 PPR 就不能开**；页面错乱先回滚这一行。
- **Cloudflare 的 Cache Rules / Response Header Transform Rules 对 Worker 生成的响应不生效**（实测：规则 enabled、表达式匹配，响应头纹丝不动），别去控制台找开关。
- 绝大部分业务页 `export const dynamic = "force-dynamic"`；静态页为 about / changelog / cards / tools / projects 等。

---

## 5. 代码地图

```
src/
├── app/                      # 路由（58 API + 38 页 + 1 布局）
├── components/               # 10,316 行
│   ├── tools/                # 27 工具 + ToolLayout + ToolsIndex
│   ├── games/                # 10 游戏
│   ├── bbs/                  # 20 个帖子/回复/编辑器组件
│   ├── user/                 # 11 个用户主页/资料/关注组件
│   ├── psych/                # PsychRunner（答题流）
│   ├── auth/ files/ status/  # 各 1 个
│   └── Navbar / Footer / 主题切换 / PostContent / Markdown 渲染
├── lib/                      # 9,110 行
├── db/                       # schema + 4 个迁移 + 种子
├── data/                     # changelog.json / projects.json / posts.json
├── scripts/                  # legacy-transpile / legacy-build-check / populate-static-cache / psych-selftest / legacy-css-selftest
├── packages/postcss-legacy-pseudo-classes/   # 自研 PostCSS 插件（file: 依赖）
└── mail-relay/               # 邮件中继（独立 Node 服务，与站点同仓）
```

### lib 逐文件职责

| 文件 | 行数 | 职责 / 要点 |
| --- | --- | --- |
| data.ts | 3606 | **唯一数据入口**：DataStore 接口 + D1DataStore + JsonDataStore，`getDb()` 运行时选后端；另含 `hitRateLimitDb`（D1 原子限流）、`escapeLike`、`truncateBytes`（D1 LIKE 50 字节上限） |
| psych/scales.ts | 2998 | 27 个量表的题目/选项/分级/建议文案 + SCALES、CATEGORIES、getScale、scaleMeta、LOWER_IS_BETTER |
| types.ts | 317 | 全部实体类型（User/BbsPost/Reply/CardRecord/PsychResultRecord…） |
| card.ts | 290 | 卡密领域逻辑：checkCardUsable、mergePlan、cardPublicView（剥离 id/redeem_token）、CARD_REQUEST_RULES |
| store.ts | 222 | 项目/博客内容双后端（D1 site_content / data/*.json），本地写文件用 tmp+rename 原子替换 |
| status.ts | 192 | /status 探测：web/d1/files/mail/bing/hitokoto 六项，15s 内存缓存，4s/2.5s 超时 |
| status-history.ts | 87 | 5 分钟桶采样进 status_samples，按天聚合 60 天可用率（固定 +8 时区） |
| psych/scoring.ts | 169 | sumScores、bandFor、dimensionBreakdown、resultFromBand、OPTIONS_*、CRISIS_LINES |
| cardServer.ts | 149 | requireApiToken（Bearer CARD_API_TOKEN，常量时间）、requireAdmin、readEnv、logCard |
| chunkedUpload.ts | 140 | 客户端分片上传：CHUNK_SIZE = 2MB、CHUNK_TIMEOUT_MS = 30s、fetchWithTimeout、fetchWithRetry（4 次，4xx 不重试） |
| auth.ts | 103 | bcrypt、会话 token、SESSION_COOKIE = "bbs_session"、toPublicUser（剥敏感字段）、getSessionUser / getSessionUserFromCookies |
| fileticket.ts | 84 | HMAC-SHA256 票据签发/校验（hex，常量时间比较） |
| ratelimit.ts | 60 | checkRateLimit（D1 优先，失败回退内存桶并告警一次）、clientIp |
| markdown.ts | — | markdown-it 渲染 + 外链 target=_blank rel=noopener（只对非 shiqing.site 链接） |
| md5.ts / pagination.ts / safe.ts / http.ts / id.ts | 小 | 真 MD5、分页参数解析、服务端数据降级、请求体/错误统一处理、uid/slugify |
| level.ts | — | 等级由积分推导（不存库）：发帖×5 + 回复×2 + 签到×3 + 收到的赞×1，7 级 |
| signinGrid.ts / reading.ts / time.ts / toc.ts / mentions.ts / notify.ts / mailer.ts / jsonld.ts / clipboard.ts / useCurrentUser.ts / useHighScore.ts | 小 | 签到热力图、阅读时长估算、相对时间、目录生成、@提及解析、邮件通知（HTML 转义）、mail-relay 客户端、JSON-LD 转义、复制、当前用户 hook、游戏最高分 hook |

---

## 6. 数据层与并发语义

```ts
getDb(): Promise<DataStore>   // 单例缓存（cached）
  ├── 有 env.dsh_bbs → D1DataStore
  └── 否则（next dev / 构建期 / 取 context 抛错）→ JsonDataStore（data/db.json，已 gitignore）
```

**关键约定**

- 所有业务读写走 `getDb()`，页面/接口不要自己拼 D1；`store.ts` 是另一条独立的「内容」通道（projects/posts），互不干扰。
- **JsonDataStore 写操作串行化**（内部读写队列），避免两个请求 read-modify-write 丢更新；但 **D1 侧仍是读-改-写**，计数类操作一律用 `INSERT OR IGNORE` / 条件 UPDATE / `changes` 判定，不要「先查再写」（点赞、收藏、关注、投票、签到都按这个写）。
- **分页参数一律走 src/lib/pagination.ts**：`parsePage` / `parsePageSize`（取整、`Number.isFinite`、夹区间）。历史事故：`page=2.3` → `OFFSET 26.000000000000004` → SQLite `datatype mismatch` → 500；`Number("Infinity")` 让 `|| 1` 兜底失效。
- **D1 LIKE 模式有 50 字节上限**，超了直接报错（搜索页 500），所以 `truncateBytes` 先按 UTF-8 字节截断再拼 `%...%`，并用 `escapeLike` 转义 `% _ \` + `ESCAPE '\'`。
- **读失败要降级不要炸页**：页面里用 `safe(promise, fallback, tag)`，D1 抖动时返回空列表/占位，而不是整棵 RSC 树掉进错误边界。
- site_content 的 `readContent` 在「行存在但 JSON 解析失败」时**静默返回 fallback**——这会让 admin 看到空内容，排查时先查表里的原始 JSON（已知取舍，未改成抛错）。
- 限流：`hitRateLimitDb` 用原子 UPSERT + `RETURNING`，**超限的 key 只读不写**（防止被刷时把每个请求放大成一次 D1 写），每 500 次清理过期窗口；D1 不可用时回退内存桶并只告警一次。

---

## 7. 数据模型（27 表）

`db/schema.sql`（331 行）一次建全，另有 6 个增量迁移：

| 迁移 | 内容 | 状态 |
| --- | --- | --- |
| schema.sql | 27 表 + 索引 + 6 个板块种子 | 线上已执行 |
| migration-drafts.sql | drafts 表 | 需在线上执行 |
| migration-psych.sql | psych_results 表 | 需在线上执行 |
| migration-ratelimit.sql | rate_limits 表 | **必须执行**，缺了会静默回退内存桶（多 isolate 约等于没限流） |
| migration-redeem-token.sql | cards.redeem_token 列 | **必须执行**，缺了并发兑换会重复发权益 |
| migration-links.sql | short_links 表（短链接） | 已于 2026-10-29 线上执行 |
| migration-api.sql | api_tokens / api_usage 表（开发者 API） | 已于 2026-10-30 线上执行 |
| seed-content.sql | 把 projects/posts 灌进 site_content | 首次部署执行 |

| 表 | 用途 | 关键列 / 约束 |
| --- | --- | --- |
| users | 账号 | email 唯一、nickname 唯一、password_hash(bcrypt)、role、email_verified、verify_token(_expires)、reset_token(_expires)、notify_email、plan / plan_expires_at / plan_quota / plan_used、avatar |
| sessions | 登录会话 | token 主键，expires_at 30 天 |
| boards | 板块 | 6 个种子：frontend / backend / tech / life / gaming / share |
| posts | 帖子 | board_id、author_id、sticky、view_count、attachments(JSON 文本)、tags(JSON 文本) |
| replies | 回复 | parent_id（楼中楼）、reply_to_user_id |
| reply_likes / likes / favorites | 点赞/收藏 | 复合唯一键，靠 INSERT OR IGNORE 幂等 |
| notifications | 站内通知 | type、actor_id、post_id、reply_id、is_read |
| files | 文件元数据 | uploader_id、url；物理文件在 filelib |
| site_content | 项目/博客内容块 | key(projects/posts) + data(JSON) |
| rate_limits | 分布式限流 | key 主键 + count + reset_at |
| drafts | 云端草稿 | 主键 (user_id, kind, ref_id) |
| messages | 私信 | sender_id/receiver_id，会话查询走 (before, limit) 游标 |
| follows | 关注 | follower_id + followee_id |
| signins | 签到 | (user_id, date) |
| polls / poll_votes | 帖子投票 | |
| announcements | 站内公告 | expires_at 可空 |
| psych_results | 测评记录 | scale_slug、total、max、level_key、type_code、answers(JSON) |
| cards | 卡密 | card_key 唯一、plan、days、quota、used、bound_qq、bound_user_id、redeemed_at、redeem_token、expired_at(0=未激活)、status(1 正常/0 吊销) |
| card_logs | 卡密审计 | action(verify/consume/generate/revoke/redeem/account_consume/request/request_approve/request_reject)、request_id、detail |
| card_requests | 卡密申请 | status(0 待审/1 通过/2 拒绝) |
| status_samples | 状态页采样 | (service, bucket) 唯一，5 分钟一桶 |
| short_links | 短链接 | code 主键（创建后不可改名）、url 只存 http/https 绝对地址、created_by、clicks 原子自增 |
| api_tokens | API 令牌 | token 是 `sk_` + 48 hex 主键、card_key 归属卡密、revoked 吊销标记、last_used_at |
| api_usage | API 用量 | (card_key, day) 复合主键、count 当日次数、last_at；day 用上海日期 |

**索引（v1.42.3 已补）**：posts(author_id, created_at DESC)、replies(author_id) 已建；listTags 改为 D1 内 `json_each` 聚合，不再搬运全表。

---

## 8. HTTP API（75 条）

统一约定：JSON 响应；5xx 一律 `serverError()`（回固定文案，原始异常只进日志）；请求体用 `readJsonBody` 解析（非法 JSON/数组/null → 400 而不是 500）；字符串入参用 `asString` 规整。

| 域 | 路由 |
| --- | --- |
| 认证 | auth/{register,login,logout,me,password,profile,forgot,reset,verify,resend-verify,verify-enabled} |
| 论坛 | posts、posts/[id]、posts/[id]/{replies,like,favorite,poll,sticky,view}、replies/[id]、replies/[id]/like、boards、drafts、favorites |
| 用户 | users/search、users/[id]/follow、messages、messages/[userId] |
| 通知 | notifications、notifications/read-all、announcements、announcements/[id] |
| 文件 | files、files/[id]（DELETE）、files/ticket、files/confirm |
| 内容 | projects、projects/[id] |
| 心理 | psych/results、psych/results/[id] |
| 卡密 | card/{ping,info,verify,consume,account-consume,qq-access,redeem,me}（对外，Bearer CARD_API_TOKEN）｜ card/{generate,revoke,list,stats,request,request/list,request/review}（管理，登录态 admin 或 CARD_ADMIN_TOKEN） |
| 短链 | links（GET 我的列表 / POST 新建）、links/[code]（DELETE） |
| 开发者 API v1 | v1/ping（公开）、v1/me、v1/boards、v1/tags、v1/stats、v1/changelog、v1/posts、v1/posts/[id]、v1/tokens（GET/POST）、v1/tokens/[token]（DELETE）、v1/openapi.json（公开）、v1/uapi/[...path]（UApiPro 18 条白名单中转，200 次/卡/天） |
| 其他 | status、signin、wallpaper（必应壁纸代理） |

**鉴权三档**

1. 公开：card/ping、card/verify、card/info、files 列表/下载、users/search（限流）、wallpaper。
2. 登录态：Cookie `bbs_session`（httpOnly、SameSite=Lax、生产 Secure、30 天）。
3. Bearer 令牌：`CARD_API_TOKEN`（业务接口，常量时间比较）、`CARD_ADMIN_TOKEN`（管理接口，也可用登录态 role='admin'）。

---

## 9. 页面（40 个）

| 分组 | 页面 |
| --- | --- |
| 首页/内容 | /（论坛聚合：板块 + 最新/热门）、/about、/projects、/changelog、/archive、/tags、/tags/[tag] |
| 论坛 | /bbs/board/[slug]、/bbs/post/[id]、/bbs/post/[id]/edit、/bbs/new、/bbs/search |
| 账号 | /login、/register、/forgot、/reset、/verify、/settings、/notifications、/messages、/favorites、/following |
| 用户 | /user/[id]、/user/[id]/edit、/user/[id]/followers、/user/[id]/following |
| 工具/游戏 | /tools（27 个单页内切换）、/tools/image（图片压缩单独成页）、/games（10 款） |
| 心理 | /psych（27 量表列表）、/psych/[slug]（答题）、/psych/history（历史与趋势） |
| 运维/统计 | /status（六项探测 + 60 天可用率）、/stats、/leaderboard、/admin（论坛管理 + 内容管理 + 卡密管理） |
| 其他 | /cards（卡密领取/申请）、/links（短链接管理）、/developers（开发者 API 文档） |
| 非页面路由 | /feed.xml（RSS，支持 ?board=slug）、/sitemap.xml、/robots.txt、/opensearch.xml、/s/[code]（短链 302） |
| 框架文件 | layout.tsx、loading.tsx、error.tsx、not-found.tsx、globals.css、图标若干 |

---

## 10. 子系统

### 10.1 认证与会话

- 注册：邮箱 + 密码（≥8 位）+ 昵称（唯一），bcrypt cost 10；注册后直接建 30 天会话（`VERIFY_EMAIL=true` 只发验证邮件，**不阻止登录**，属已知取舍）。
- 会话：随机 64 hex token 存 sessions 表，Cookie `bbs_session`；`userFromSessionToken` 是唯一校验点（过期即删会话）。
- 页面取当前用户一律 `getSessionUserFromCookies()`，**不要**自己 `db.getSession()`（会绕过过期判断）。
- `toPublicUser` 白名单输出，绝不带 password_hash / verify_token / reset_token。
- 找回密码：`forgot` 发信带 reset_token（有时限）→ `reset` 重设；邮箱验证 token 24 小时。

### 10.2 文件上传与文件库

```
POST /api/files/ticket  → HMAC 票据（uid, exp=10min, chunks）
   ↓ 前端 2MB 分片直传 files.shiqing.site/upload（30s 超时，4 次重试）
files.shiqing.site/upload-complete → 合并
   ↓
POST /api/files/confirm（校验 HMAC + 归属）→ 落 files 表
```

- 单文件上限 **2GB**（MAX_UPLOAD_BYTES），分片 2MB，分片数由服务端按 size 计算，不采信前端。
- 删除：`DELETE /api/files/[id]` 先查引用（头像、帖子附件），被引用返回 409；删物理文件失败要记日志（历史 P2：曾不查 `res.ok`，元数据删了物理还在）。
- 文件库是**公开可列可下载**的产品设计（页面已明示），不要把私密文件放这里。

### 10.3 卡密

- 生命周期：生成 → （可选）绑定 QQ 首消 或 整卡兑换到本站账号 → 消费/吊销；`expired_at = 0` 表示未激活（首次使用才开始计时）。
- `quota = 0` 表示不限次数；`bound_qq` 一旦绑定必须完全匹配。
- 幂等：`request_id` + card_logs 中**成功**日志匹配；失败的调用不写成功日志，无法借 request_id 绕过 quota。
- 整卡兑换：`redeem_token` 把 claim 与 grant 串起来（秒级时间戳在并发下会重复发权益，见 migration-redeem-token.sql）。
- 账号权益：落在 `users.plan_*`，`POST /api/card/account-consume` 原子扣 plan_used（request_id 幂等）。**站内目前没有自动调用方**，需词库/计费端接入。
- 申请流转：/cards 提交（CARD_REQUEST_RULES 限制待审数/每日数/理由长度）→ /admin 审核 → 通过自动发卡。
- 对外协议与错误码见 [docs/card-api.md](./card-api.md)。

### 10.4 心理测评

- 27 个量表，分 6 类（情绪/人格/健康/关系/压力/职业），全部**浏览器本地计分**，登录后才保存（psych_results）并出历史趋势。
- 结构：`PsychScale { slug, name, subtitle, category, minutes, tags, questions[], bands[] | dimensions }`；`scoring.ts` 提供 bandFor / dimensionBreakdown。
- **踩过的坑**：`bandFor` 命中失败返回最后一个（最严重）区间，所以平均分/小数分级的 band 必须用 `.99` 结尾（`1-3.99`、`4-5.69`），否则 3.95 这类值落空被误判成最严重。
- `PsychBreakdownItem` 必须含 `percent`、不能有 `key` 字段。
- 症状类量表记入 LOWER_IS_BETTER（分数越高越需关注），趋势配色相反；PHQ-9 第 9 题触发危机求助提示（CRISIS_LINES）。
- 每题标注来源与许可；许可调研在 docs/psych/LICENSE_RESEARCH.md，结构化清单在 docs/psych/instruments.json；自检 `npm run test:psych`。

### 10.5 状态页 /status

- 六项探测：站点应用、D1、文件库、邮件中继、必应壁纸、一言；自有服务 4s 超时、第三方 2.5s。
- 15 秒内存缓存，避免自动刷新放大探测；结果每 5 分钟一桶写 status_samples（INSERT OR IGNORE，刷新不放大写入）。
- 页面展示 60 天每日可用率（时区固定 +8）；/api/status 返回 JSON。
- 采样失败静默——采样不该影响状态页本身。

### 10.6 通知与邮件

- 站内通知：回复、@提及、点赞、关注等写入 notifications，导航栏铃铛。
- 邮件：`notifyByEmail` → src/lib/mailer.ts → `POST {MAILER_BASE}/send`（头 `x-mailer-secret`），仅当收件人开了 notify_email；**HTML 必须转义**（否则可借站点邮箱投递钓鱼链接）；失败静默不影响主流程。
- mail-relay 自身：/send 有速率限制、收件人格式/数量校验、请求体上限 413、常量时间比较（先 SHA-256 再比）。

### 10.7 等级 / 签到 / 排行榜

- 等级不落库：积分 = 发帖×5 + 回复×2 + 签到×3 + 收到的赞×1，7 档（新手上路 → 传奇人物），level.ts 现算。
- 签到：signins(user_id, date)，重复签到靠唯一约束 + INSERT OR IGNORE；签到页出热力图（signinGrid.ts）。
- 排行榜 /leaderboard：按发帖/回复/获赞聚合（注意 posts(author_id) 无索引）。

### 10.8 论坛周边

草稿（跨设备续写，new/edit 两种）、投票（polls/poll_votes）、收藏、点赞（帖子/回复两套）、关注/粉丝、私信（游标分页 `?before=&limit=`）、标签云、归档、全站搜索（escapeLike + truncateBytes）、置顶（管理员）、附件（图片/文件，走 §10.2 链路）。

---

## 11. 安全基线

**已做**

- CSP + X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy / HSTS（仅生产），关闭 X-Powered-By。script-src 仍含 `'unsafe-inline'`（无 nonce）；frame-src 放行 cards.shiqing.site；connect-src 放行 files.shiqing.site 与 v1.hitokoto.cn。
- 用户内容不渲染 HTML：markdown-it `html:false` + linkify 白名单；JSON-LD 里 `<` 转义成 `\u003c`；邮件模板 HTML 转义。
- 凭据：safeEqual 常量时间、文件票据 HMAC-SHA256、会话 httpOnly + SameSite=Lax。
- 限流覆盖 19 处（登录、注册、找回、发帖、回复、点赞、收藏、投票、关注、私信、上传票据、confirm、草稿、搜索等）。
- 5xx 不回显内部异常；上传文件名过滤路径分隔符/控制字符；标签限长 30 字并去重；密码 ≥8 位；昵称唯一。

**已知取舍（需产品决策，未改）**

1. 注册对已存在邮箱返回 409 → 可枚举邮箱（要彻底修需改「注册不自动登录 + 邮件确认」）。
2. 文件库公开列目录/下载（产品设计）。
3. CSP 无 nonce（严格 nonce 需全站动态渲染）。
4. `VERIFY_EMAIL=true` 不阻止未验证账号登录。
5. `/api/card/account-consume` 站内无自动调用方（需外部接入 plan_used 才增长）。

**必须人工轮换的凭据**（详见 SECURITY.md）：CARD_API_TOKEN、CARD_ADMIN_TOKEN、MAILER_SECRET、QQ 邮箱 SMTP 授权码、MAIL_RELAY_KEY。密钥值**不写进本档案、记忆、日志**；位置索引在 ~/.dsh/credentials-index.md。

---

## 12. 环境变量与密钥

| 名称 | 类型 | 用途 | 位置 |
| --- | --- | --- | --- |
| FILE_PUBLIC_BASE | var | 文件公网基址，默认 https://files.shiqing.site | wrangler.jsonc |
| MAILER_BASE | var | 邮件中继基址，默认 https://mail.shiqing.site | wrangler.jsonc |
| VERIFY_EMAIL | var | 是否发验证邮件（不阻止登录） | wrangler.jsonc |
| FILE_HMAC_SECRET | secret | 文件票据 HMAC 密钥，须与 filelib secret.txt 一致 | wrangler secret |
| MAILER_SECRET | secret | mail-relay /send 的 x-mailer-secret | wrangler secret + mail-relay config |
| CARD_API_TOKEN | secret | 卡密对外接口 Bearer | wrangler secret / .dev.vars |
| CARD_ADMIN_TOKEN | secret | 卡密管理接口 Bearer | wrangler secret / .dev.vars |
| CARD_REQUEST_RULES | 代码常量 | 卡密申请的待审/每日/理由长度限制 | src/lib/card.ts |

本地 `.dev.vars`（600、已 gitignore）只有 CARD_API_TOKEN / CARD_ADMIN_TOKEN 两个键；mail-relay/config.json（600、gitignore）存 QQ 授权码与 secret，仓库里只有加密版 config.json.enc（密钥在工作区外 mailrelay-key.txt）。

---

## 13. 部署与运维

**发布流程（唯一路径）**

```bash
npx tsc --noEmit                 # 1. 类型必须干净
npm run test:psych               # 2. 量表评分自检（改 psych 时）
npm run build:cf                 # 3. 6–10 分钟，后台跑
npx wrangler deploy              # 4. 或直接用 npm run deploy:cf
curl -sS https://shiqing.site/api/status | head -c 300   # 5. 线上验证
git add -A && git commit -m "..." && git push    # 6. 提交
# 7. data/changelog.json 追加版本（category ∈ new/improve/fix/security/docs）
```

**首次/迁移**

```bash
npx wrangler d1 execute dsh-bbs --remote --file=db/schema.sql
npx wrangler d1 execute dsh-bbs --remote --file=db/migration-ratelimit.sql
npx wrangler d1 execute dsh-bbs --remote --file=db/migration-redeem-token.sql
npx wrangler d1 execute dsh-bbs --remote --file=db/seed-content.sql
# 设管理员：
npx wrangler d1 execute dsh-bbs --remote --command "UPDATE users SET role='admin' WHERE email='你的邮箱';"
```

**本机/远程服务**

| 服务 | 位置 | 单元 / 命令 |
| --- | --- | --- |
| 隧道 | 笔记本或玩客云 | `systemctl --user restart shiqing-cloudflared`；token 在 ~/.cloudflared/tunnel.env |
| 文件服务 filelib | 玩客云 :9090 | 零依赖纯 Node，/health；secret.txt 与 FILE_HMAC_SECRET 一致 |
| 邮件中继 mail-relay | 玩客云 :9092 | /health；config.json；encrypt.js 加解密 |
| 卡密中心 cardserver | 玩客云 :8787 | 独立服务，主站只通过 frame-src + 接口交互 |
| dsh web | 笔记本 :3080 | 手动跑前先 `systemctl --user stop shiqing-dshweb`（否则 EADDRINUSE 无限重启） |

**排障速查**

- 页面 500 且日志有 `datatype mismatch` → 分页参数没走 parsePage。
- 搜索 500 → LIKE 模式超 50 字节，检查 truncateBytes。
- 限流形同虚设 → rate_limits 表没迁移（日志有「已回退内存桶」告警）。
- 兑换重复发权益 → cards.redeem_token 列没加。
- 页面错乱/TTFB 反常 → 先回滚 open-next.config.ts 的 enableCacheInterception。
- 上传「界面报失败但文件已在」→ 合并成功、/api/files/confirm 失败（元数据没落库，会成孤儿文件）。
- files/mail/cards 530 → 先看隧道单元是否被连带停掉（见 §2 的 systemd 纪律）。

---

## 14. 质量记录

**自检命令**

| 命令 | 覆盖 |
| --- | --- |
| npx tsc --noEmit | 全量类型 |
| npx eslint src scripts mail-relay/server.js | 代码规范（注意 `npx eslint .` 会扫 .open-next，极慢） |
| npm run test:psych | 27 个量表的区间/维度/边界自检 |
| npm run test:legacy-css | :where/:is 降级逻辑 |
| npm run test:legacy-build | 产物 ES2017 可解析、polyfill ES5、无 @layer |

**2026-10-28 全站代码审查（五路并行：lib/data、api、pages、components、tools+games）**

- v1.42.2：修 1 个 P0 + 7 个 P1 —— 分页参数导致列表接口 500（P0）、DASS-21 用 DASS-42 阈值、私信会话越权泄露、卡密幂等永不命中导致重复扣 plan_used、PsychRunner 跨量表状态串台、ToolLayout 输入框失控、HashTool 提示顶掉结果等。
- v1.42.3：修 67 条 P2 —— 签到并发撞主键、文件票据不校验 exp、删物理文件不查 res.ok、附件上传中可提交、文件库删除后 total 不减、useCurrentUser 失败当未登录缓存 10s、邮件通知串行无超时、21 个工具与 9 个游戏逻辑修复等。
- 报告中未修项（P2/P3）已并入 §16 技术债。

---

## 15. 版本史（52 条，最新在前）

| 版本 | 日期 | 分类 | 内容 |
| --- | --- | --- | --- |
| 1.45.0 | 2026-10-30 | new | 开发者 API：卡密即凭证（或换 `sk_` 令牌）调用只读接口，含 UApiPro 中转与 /developers 文档页 |
| 1.44.0 | 2026-10-29 | improve | 全站视觉重做：从毛玻璃渐变换成「夜间刊物」（朱砂强调色 + 衬线标题 + 描边方角卡片） |
| 1.43.0 | 2026-10-29 | new | 新增短链接工具：/links 管理页 + /s/[code] 302 跳转与点击统计 |
| 1.42.3 | 2026-10-28 | fix | 把这轮代码审查剩下的 67 条 P2 全部修掉 |
| 1.42.2 | 2026-10-28 | fix | 修掉代码审查查出的 1 个 P0 与 7 个 P1 问题 |
| 1.42.1 | 2026-10-27 | improve | 预渲染页再提速：命中缓存后直接返回，跳过渲染管线 |
| 1.42.0 | 2026-10-27 | improve | 全站提速：预渲染页面改用静态资产缓存 |
| 1.41.0 | 2026-10-25 | new | 状态页升级：渐变横幅 + 60 天可用率状态条 |
| 1.40.0 | 2026-10-23 | new | 心理测评新增 14 个量表，总数 13 → 27 |
| 1.39.0 | 2026-10-23 | new | 工具箱新增二维码生成与 CSV ↔ JSON |
| 1.38.1 | 2026-10-16 | fix | 全站体检：重定向、收录信息、标题层级、缓存与站点图标 |
| 1.38.0 | 2026-10-16 | new | 工具箱新增文本 Diff 与 JWT 解析，并支持搜索过滤 |
| 1.37.0 | 2026-10-16 | new | 图片压缩 / 格式转换工具（纯前端、批量） |
| 1.36.1 | 2026-10-10 | fix | 卡密输入容错 + QQ 权益查询接口 |
| 1.36.0 | 2026-10-10 | new | 卡密直达：管理员自助发卡、统一 QB 卡密格式、站内领取页 |
| 1.35.0 | 2026-10-07 | new | 服务状态检查页 /status |
| 1.34.0 | 2026-10-07 | new | 云端草稿、发帖趋势、搜索筛选、贡献统计 |
| 1.33.0 | 2026-10-07 | new | @提及补全、标签页、归档、排行榜、代码语言标签 |
| 1.32.0 | 2026-09-30 | new | 主页卡密申请：在线提交 → 后台审核 → 自动发卡 |
| 1.31.0 | 2026-09-29 | new | 卡密可绑定本站账号（共用同一套用户与登录） |
| 1.30.0 | 2026-09-29 | new | 卡密系统（分发与验证中心） |
| 1.29.0 | 2026-09-05 | fix | 全站代码审查：修复 20 处数据、安全与显示问题 |
| 1.28.0 | 2026-09-05 | improve | 适配旧 WebView（Android 8 内置内核） |
| 1.27.0 | 2026-09-05 | new | 心理测评中心（13 个量表） |
| 1.26.0 | 2026-09-05 | new | 编辑器、长文阅读与标签导航 |
| 1.25.0 | 2026-09-05 | new | 工具箱扩充、小游戏与阅读体验优化 |
| 1.24.0 | 2026-09-05 | new | 忘记密码、邮件提醒、站内公告与游戏纪录 |
| 1.23.0 | 2026-09-05 | new | 社区互动：私信、关注、签到与激励体系 |
| 1.22.0 | 2026-08-30 | new | 全新视觉、7 套主题与移动端 UI |
| 1.21.0 | 2026-08-30 | new | 论坛体验：楼中楼回复与 Markdown |
| 1.20.0 | 2026-08-30 | new | QQ 邮箱验证落地、数据层重构与安全加固 |
| 1.19.0 | 2026-08-25 | security | 邮箱验证 |
| 1.18.0 | 2026-08-25 | new | 分片断点续传、帖子导出与标签搜索 |
| 1.17.0 | 2026-08-25 | new | 帖子收藏、更多工具与游戏 |
| 1.16.0 | 2026-08-25 | new | 帖子标签、回复分页与新游戏 |
| 1.15.0 | 2026-08-23 | new | 发帖附件与 2GB 文件上限 |
| 1.14.0 | 2026-08-23 | new | 更多游戏与工具、每日壁纸 |
| 1.13.0 | 2026-08-23 | new | 游戏栏目与更多工具 |
| 1.12.0 | 2026-08-22 | improve | BBS 板块细化 |
| 1.11.0 | 2026-08-22 | improve | 更新日志增加板块分类 |
| 1.10.1 | 2026-08-22 | fix | 修复与整理 |
| 1.10.0 | 2026-08-22 | new | 通知系统与账户功能 |
| 1.9.0 | 2026-08-22 | new | 主题与管理增强 |
| 1.8.0 | 2026-08-22 | new | 互动增强 |
| 1.7.0 | 2026-08-22 | new | 用户体系与安全增强 |
| 1.6.0 | 2026-08-21 | improve | 论坛体验全面改进 |
| 1.5.0 | 2026-08-20 | improve | 内容管理完善 |
| 1.4.0 | 2026-08-19 | improve | Kratos 风格改版 |
| 1.3.0 | 2026-08-18 | new | 文件库与开机自启 |
| 1.2.0 | 2026-08-18 | new | 升级为 BBS 论坛 |
| 1.1.0 | 2026-08-17 | security | 安全加固 |
| 1.0.0 | 2026-08-16 | new | 网站上线 |

---

## 16. 已知约束与技术债

**产品/安全取舍**：见 §11 五条。

**代码层未修（P2/P3）**

- store.ts 读 D1 行 JSON 解析失败时静默回退（内容「消失」难排查）；updateProject 在 featured 缺省时重置为 false。
- 内容写接口（admin）在 D1 侧是读-改-写，多管理员同时改同一 key 会丢更新。
- posts(author_id) 无索引；listTags 全表聚合；notifyByEmail 串行且无超时。
- fetchWithTimeout 在无 AbortController 的环境里用 Promise.race，定时器不清理（旧内核才走到）。
- sessionCookieOptions 在会话已过期时 maxAge 为负（等于立即过期，行为可接受但语义含糊）。
- fileticket 签发的 exp（10 分钟）在 /api/files/confirm 未被校验——票据泄露后可在有效期内重放确认（依赖 HMAC 保密性兜底）。

**工程约束**

- 没有 CI：类型检查、测试、构建全靠手动；提交前至少 `tsc --noEmit`。
- 无 E2E 测试；游戏/工具逻辑靠人工冒烟。
- 旧浏览器兼容是「静态校验 + 真机抽查」，不是自动化回归。
- .dev.vars / config.json 是本地明文密钥，注意别 commit（已在 .gitignore）。

---

## 17. 新会话上手清单 / 改动纪律

1. `git status` 确认干净；`git log -1` 看当前版本；读 data/changelog.json 顶部三条知道最近在干什么。
2. 改代码前先确认：数据访问走 `getDb()`、分页走 `parsePage`、页面降级走 `safe()`、5xx 走 `serverError()`——这四条是本项目的「规矩」。
3. 改完：`npx tsc --noEmit` → 相关自检（psych/legacy）→ `npm run build:cf`（后台）→ `wrangler deploy` → `curl` 线上验证 → commit + push。
4. 每次发布在 data/changelog.json 顶部追加 `{version, date, title, category, items}`；**category 只能是 new/improve/fix/security/docs**（feat 会让分类徽章显示空白，1.37/1.38 踩过）。
5. 动 D1 结构必须新增 `db/migration-*.sql` 并在线上执行，同时更新 §7 表格。
6. 密钥一律不写进仓库、不贴进聊天、不写进记忆；新密钥登记到 ~/.dsh/credentials-index.md。
7. 涉及 systemd / 隧道的操作，先 `list-dependencies --reverse`，改完立刻 curl 三个公网域验证。
8. 本档案随版本更新：改架构、加表、加环境变量、加子系统时同步改对应小节（并在 §14 记一行）。

---

*本档案基于 v1.42.3 代码库实测生成（路由/表/组件/版本均为当时真实统计），非推测。*
