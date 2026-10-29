# 项目快照（上下文摘要）

> 本文件是 ShiQing 时倾网站的**当前状态快照**，供新会话在 2 分钟内恢复上下文。
> 最后更新：**v1.44.0（2026-10-29，全站视觉重做）**
> 完整档案（架构、数据模型、API、子系统、运维、技术债）见 [PROJECT_ARCHIVE.md](./PROJECT_ARCHIVE.md)；卡密协议见 [card-api.md](./card-api.md)；安全与密钥轮换见 [../SECURITY.md](../SECURITY.md)。

## 一句话

Next.js 16 全栈社区站点：多用户论坛 + 2GB 文件库 + 27 个本地工具 + 10 款游戏 + 27 个心理量表 + 短链接 + 卡密中心，部署 Cloudflare Workers（D1），文件/邮件走 Tunnel 回源玩客云。

## 线上资源

| 资源 | 地址 | 说明 |
| --- | --- | --- |
| 主站 | https://shiqing.site | Worker + D1（binding `dsh_bbs`） |
| 文件库 | https://files.shiqing.site | Tunnel → 玩客云 filelib :9090 |
| 邮件中继 | https://mail.shiqing.site | Tunnel → 玩客云 mail-relay :9092 |
| 卡密中心 | https://cards.shiqing.site | 玩客云 cardserver :8787（CSP frame-src 放行） |
| 状态 | https://shiqing.site/status ｜ /api/status | 六项探测 + 60 天可用率 |
| GitHub | github.com/shiqing-prog/shiqing-website | main，96 提交 |

## 技术栈

- Next.js 16.3.1（App Router / Turbopack / async params）+ React 19.2.8 + TypeScript strict + Tailwind v4（Kratos 蓝 #007cba）
- Cloudflare Workers（@opennextjs/cloudflare 1.20.2，nodejs_compat）+ D1（SQLite）+ Cloudflare Tunnel
- 数据层双实现：线上 D1（`data.ts` D1DataStore）/ 本地 `data/db.json`（JsonDataStore，写操作串行）
- 内容层独立：`store.ts`（projects/posts → 线上 D1 `site_content` / 本地 data/*.json）
- 旧浏览器目标：Android 8 WebView ≈ Chrome 58（7 层降级，见档案 §4）

## 规模（v1.44.0）

| 项 | 数量 |
| --- | --- |
| 源码 | src ≈ 2.9 万行 |
| API / 页面 | 61 个 route.ts / 39 个 page.tsx |
| 数据表 | 25 张（schema.sql + 5 个迁移） |
| 工具 / 游戏 / 量表 | 27 / 10 / 27 |
| 版本记录 | 51 条（1.0.0 → 1.44.0） |

## 四条项目规矩（写代码前先认这四条）

1. 数据访问一律 `getDb()`（不要自己拼 D1）；计数类写操作必须原子（`INSERT OR IGNORE` / 条件 UPDATE）。
2. 分页参数一律 `src/lib/pagination.ts` 的 `parsePage`/`parsePageSize`（`page=2.3` 曾导致 500）。
3. 页面读数据用 `safe()` 兜底，D1 抖动不许把整页搞崩。
4. 5xx 用 `serverError()`，不回显内部异常；请求体用 `readJsonBody`。

## 常用命令

```bash
npm run dev                  # 本地开发（data/db.json）
npx tsc --noEmit             # 类型检查（提交前必须）
npm run test:psych           # 量表评分自检
npm run test:legacy-css      # 旧内核 CSS 降级自检
npm run build:cf             # 构建（6–10 分钟，后台跑）
npm run deploy:cf            # 构建 + wrangler deploy
```

发布后：`curl https://shiqing.site/api/status` 验证 → commit + push → 在 `data/changelog.json` 顶部追加版本（category 只能是 new/improve/fix/security/docs）。

## 最近发生了什么

- **v1.42.2 / 1.42.3（2026-10-28）**：五路代码审查（lib/api/pages/components/tools+games）后，修掉 1 个 P0 + 7 个 P1 + 67 条 P2。P0 是分页参数未取整导致列表接口 500；P1 含 DASS-21 阈值用错量表、私信会话越权、卡密幂等永不命中导致重复扣次数、PsychRunner 跨量表串台、ToolLayout 输入框失控。
- v1.42.0 / 1.42.1（2026-10-27）：预渲染页改静态资产缓存 + `enableCacheInterception`，TTFB 0.63s → 0.25s。
- v1.40.0（2026-10-23）：心理量表 13 → 27。

## 已知坑（详见档案 §16）

- `data/changelog.json` 的 `category` 只能是五个值，写 `feat` 会让分类徽章空白。
- 心理量表用小数/平均分分级的 band 必须以 `.99` 结尾（`bandFor` 落空会返回最严重区间）。
- Cloudflare 的 Cache Rules / Header Transform Rules 对 Worker 响应不生效，别在控制台找开关。
- D1 LIKE 有 50 字节上限；限流表 / `cards.redeem_token` 迁移没做会静默降级。
- 停 systemd unit 前先 `systemctl list-dependencies --reverse`（曾连带停掉 cloudflared）。

## 待办/可继续方向

- 剩余 P2/P3：`posts(author_id)` 索引、`listTags` 全表聚合、admin 内容写并发、`fileticket` 的 `exp` 未校验、邮件通知串行无超时。
- 产品取舍待定：邮箱枚举（409）、CSP 无 nonce、`account-consume` 无站内调用方。
- 无 CI / 无 E2E，可考虑给关键链路补最小回归。
