# 卡密接口文档（ShiQing 卡密中心）

把卡密的分发与校验放在本站（Cloudflare Workers + D1）上，供外部词库/客户端调用。
接口契约与参考方案一致：`Authorization: Bearer` 鉴权、`{code,msg,data}` 响应体、
`invalid` + `reason` 语义、**秒级** Unix 时间戳。

- 基础地址：`https://shiqing.site/api/card`
- 健康检查：`GET /ping`（无需鉴权）
- 词库调用：`POST /verify`、`POST /consume`（Bearer `CARD_API_TOKEN`）
- 管理接口：`/generate`、`/info`、`/revoke`、`/list`、`/stats`（管理员登录态 或 Bearer `CARD_ADMIN_TOKEN`）
- 管理后台：`https://shiqing.site/admin` → 「卡密管理」

> 与参考方案的两处差异（都是本项目环境所限或更安全的做法）：
> 1. 本项目用 `@opennextjs/cloudflare`（OpenNext）而非 `next-on-pages`，因此用 `getCloudflareContext()` 取环境变量，
>    也**不需要** `export const runtime = 'edge'`（OpenNext 只在 Workers 运行）。
> 2. D1 复用本站已有的 `dsh_bbs`（绑定名 `dsh_bbs`，不是 `DB`），不新建独立库。

---

## 1. 鉴权

| 用途 | 凭证 | 配置位置 |
|---|---|---|
| 词库调用 `verify` / `consume` | `Authorization: Bearer <CARD_API_TOKEN>` | Worker secret（`wrangler secret put CARD_API_TOKEN`） |
| 脚本/curl 调管理接口 | `Authorization: Bearer <CARD_ADMIN_TOKEN>` | Worker secret |
| 后台页面调管理接口 | 站点管理员登录态（Cookie） | 无需配置 |

两种 token 都是 48 位 hex。轮换：

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
echo "<新 token>" | npx wrangler secret put CARD_API_TOKEN
```

本地开发：项目根 `.dev.vars`（已 gitignore）写 `CARD_API_TOKEN=...` 与 `CARD_ADMIN_TOKEN=...`。

## 2. 健康检查

```bash
curl https://shiqing.site/api/card/ping
# {"code":0,"msg":"pong","data":{"time":1759100000},"time":1759100000}
```

## 3. 校验卡密（无副作用）

```bash
curl -X POST https://shiqing.site/api/card/verify \
  -H "Authorization: Bearer $CARD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"sec_basic_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX","qq":"3100722103"}'
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `key` | 是 | 卡密 |
| `qq` | 否 | 非空时必须为 5–12 位数字 |

有效：

```json
{ "code": 0, "msg": "ok",
  "data": { "valid": true, "activated": false, "plan": "basic", "days": 30,
            "expired_at": 0, "quota": 0, "used": 0, "bound_qq": "" } }
```

无效（HTTP 仍 200，与参考方案一致）：

```json
{ "code": 0, "msg": "invalid",
  "data": { "valid": false, "reason": "expired", "message": "卡密已过期" } }
```

`reason`：`not_found` / `revoked` / `expired` / `quota_exceeded` / `qq_mismatch`。
`expired_at = 0` 表示**尚未激活**（有效但未开始计时）。

排查用：`GET /api/card/verify?key=xxx`（不校验 QQ 绑定，只看状态）。

## 4. 消费卡密（扣一次）

```bash
curl -X POST https://shiqing.site/api/card/consume \
  -H "Authorization: Bearer $CARD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"sec_basic_...","qq":"3100722103","request_id":"order-20260929-0001"}'
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `key` | 是 | 卡密 |
| `qq` | 否 | 首次消费即绑定，之后必须一致 |
| `request_id` | 否 | 幂等键：同一 id 重复调用不会重复扣次数 |

成功：

```json
{ "code": 0, "msg": "ok",
  "data": { "valid": true, "plan": "basic", "days": 30, "expired_at": 1790000000,
            "quota": 0, "used": 3, "bound_qq": "3100722103" } }
```

幂等命中会多一个 `"duplicate": true`。

行为规则：

1. **原子扣减**：单条带条件的 `UPDATE`（未过期、未吊销、未超次数、绑定匹配），并发不会扣超。
2. **首次消费绑定 QQ**：`bound_qq` 为空时写入本次 `qq`；已绑定则必须完全一致。
   ⚠️ 不传 `qq` **不能**绕过已绑定卡密的校验（参考方案里的 `OR ?2 = ''` 分支会导致绕过，已去掉）。
3. **计时**：默认「首次消费时」写入 `now + days*86400`；生成时若选 `activate: "immediate"` 则生成即计时。

## 5. 管理接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/card/generate` | 批量生成：`{prefix, plan, count, days, quota, remark, activate}`（count ≤ 1000，days ≤ 3650） |
| GET | `/api/card/list?page=1&size=20&status=&q=` | 分页列表（比参考方案多返回 `total`） |
| GET | `/api/card/info?key=xxx` | 单张详情 |
| POST | `/api/card/revoke` | 吊销：`{key}` |
| GET | `/api/card/stats` | 统计：总数/可用/已用/已激活/已过期/已吊销 |

```bash
# 生成 5 张、30 天、100 次上限
curl -X POST https://shiqing.site/api/card/generate \
  -H "Authorization: Bearer $CARD_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"sec","plan":"basic","count":5,"days":30,"quota":100}'
```

管理接口**不返回 CORS 头**，只允许同源（后台页面）或带 `CARD_ADMIN_TOKEN` 的脚本调用。

## 5.5 卡密兑换到本站账号（与博客/论坛共用同一套用户与登录）

除了「词库按次使用」，卡密还可以**整卡兑换到本站账号**：权益落在**同一张 `users` 表**，
认证沿用现有的 `bbs_session` Cookie（没有第二套账号体系）。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/card/redeem` | **登录态**（Cookie），body `{key}` | 把整张卡兑换到当前账号 |
| GET | `/api/card/me` | **登录态**（Cookie） | 我的权益 + 已兑换卡密列表 |

页面入口：`/settings`（账户设置）→ 「🎫 卡密兑换」。

```bash
# 用登录会话兑换（浏览器里也可以直接操作）
curl -X POST https://shiqing.site/api/card/redeem \
  -H "Content-Type: application/json" \
  -H "Cookie: bbs_session=<你的会话>" \
  -d '{"key":"sec_pro_XXXX"}'
# {"code":0,"msg":"ok","data":{"redeemed":true,
#   "plan":{"plan":"pro","expiresAt":1792427796,"quota":10,"used":0,"active":true,"remainingDays":20}}}
```

规则：

1. **互斥**：只有「未被按次使用过（`used=0`）、未被兑换过、未绑定 QQ/账号」的卡才能整卡兑换；
   反之，兑换过的卡再被词库 `consume` 会返回 `reason = "redeemed"`。
2. **权益叠加**：到期时间从「当前到期与现在的较晚者」往后加 `days` 天（可续期），
   次数相加（任一方 `quota = 0` 表示不限则整体不限）。
3. **幂等**：同一张卡重复兑换只生效一次，第二次返回 `duplicate: true` + 当前权益。
4. 权益字段（`users` 表）：`plan` / `plan_expires_at` / `plan_quota` / `plan_used`；
   `plan_expires_at = 0` 表示未激活，已过期则 `active=false`（需重新兑换）。

## 5.6 卡密申请（主页提交 → 管理员审核 → 自动发卡）

用户不需要找管理员要卡：主页（`/`）有「🎫 卡密申请」折叠面板，
登录后填写套餐/天数/次数/理由即可提交，管理员在后台「卡密申请」页审核，
**通过时服务端自动生成一张卡密**（默认未激活，兑换到账号时才开始计时），
用户回到主页或 `/settings` 复制卡密入账。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/card/request` | **登录态** | 我的申请记录 + 待审核数 + 规则 |
| POST | `/api/card/request` | **登录态** | 提交申请：`{plan, days, quota, reason, contact?}` |
| GET | `/api/card/request/list?page=1&size=20&status=` | 管理员 | 全部申请（`status` 省略 = 全部，0 待审 / 1 通过 / 2 拒绝），返回 `total` 与 `pending` |
| POST | `/api/card/request/review` | 管理员 | 审核：`{id, action: "approve"\|"reject", note?, plan?, days?, quota?, prefix?}` |

```bash
# 1) 用户提交申请（登录态）
curl -X POST https://shiqing.site/api/card/request \
  -H "Content-Type: application/json" -H "Cookie: bbs_session=<会话>" \
  -d '{"plan":"pro","days":30,"quota":100,"reason":"个人词库工具自用","contact":"123456"}'

# 2) 管理员查看待审核
curl "https://shiqing.site/api/card/request/list?status=0" \
  -H "Authorization: Bearer $CARD_ADMIN_TOKEN"

# 3) 通过（可在审核时覆盖 plan/days/quota/prefix）
curl -X POST https://shiqing.site/api/card/request/review \
  -H "Authorization: Bearer $CARD_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"id":12,"action":"approve","note":"已通过","days":30}'
# {"code":0,"msg":"已通过并自动发放卡密","data":{"row":{...},"cardKey":"QB-AMSP-5ENQ-3XMZ-UJZ6"}}
```

规则与防刷：

1. **必须登录**，申请与 `users.id` 绑定（与论坛/博客同一套账号）。
2. 同一用户**最多 1 条待审核**申请；每 24 小时最多提交 3 次；另有 5 次/10 分钟的内存限流。
3. `reason` 5-200 字，`contact` 留空则用注册邮箱。
4. **审核是原子的**（`WHERE id = ? AND status = 0`）：并发重复审核只有一个成功；
   若卡密已生成但审核落空，服务端会立即吊销这张卡，避免产生无主卡密。
5. 通过时生成的卡默认 `expired_at = 0`（未激活），用户兑换到账号后才开始计时。
6. 用户的申请记录只返回自己的；管理接口**不返回 CORS 头**。

### 管理员自助发卡（免审核）

管理员（`users.role = "admin"`）在主页提交申请时**跳过审核**：

- 服务端立即生成卡密（前缀固定 `QB`），并**以 `status = 1`（已通过）写入申请记录**，
  `card_key` / `review_note`（「管理员自助发卡（免审核）」）/ `reviewed_by` / `reviewed_at` 一并落库，
  审计动作记为 `request_approve`。
- 响应体为 `{"code":0,"msg":"管理员申请已直接发卡","data":{...,"auto":true,"cardKey":"QB-XXXX-XXXX-XXXX-XXXX"}}`，
  主页面板收到 `auto` 后自动把卡密写入剪贴板，并提示去「个人设置 → 卡密兑换」入账。
- 该分支在「待审核数」检查**之前**、每日次数检查**之后**执行：仍受「每 24 小时最多 3 次」限制，
  但不受「最多 1 条待审核」限制，管理员可连续自助发卡。
- `createCardRequest` 按传入字段写入 `status` / `card_key` 等（D1 与本地 JSON 行为一致），
  普通用户提交仍固定为 `status = 0`、空卡密。

## 5.7 消费账号权益次数（词库/计费端调用）

整卡兑换到账号后，权益里的「次数」由本接口核销（否则 `users.plan_used` 永远为 0）。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/card/account-consume` | Bearer `CARD_API_TOKEN` | 消费一次账号权益：`{user_id, request_id?}` |

- 仅当账号权益**未过期**且**未超次数**（`plan_quota = 0` 表示不限）时，原子自增 `plan_used`。
- 带 `request_id` 时幂等：同一 id 成功消费过则回放当前权益，不重复扣次。
- 成功返回 `data.plan`（当前权益视图）；失败返回 `data.valid=false` + `reason`
  （`expired` / `quota_exceeded`）+ 当前 `plan`。

```bash
curl -X POST https://shiqing.site/api/card/account-consume \
  -H "Authorization: Bearer $CARD_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"user_id":"<users.id>","request_id":"order-2026-0001"}'
# {"code":0,"msg":"ok","data":{"valid":true,"plan":{"plan":"pro","used":1,...}}}
```

## 6. 错误码

| HTTP | code | 含义 |
|---|---|---|
| 200 | 0 | 业务成功（`msg` = `ok` 或 `invalid`） |
| 400 | 400 | 参数错误（缺 `key`、QQ 格式非法等） |
| 401 | 401 | 未提供/错误的 Bearer，或未登录 |
| 403 | 403 | 已登录但不是管理员 |
| 429 | 429 | 触发限流 |
| 503 | 503 | 服务端未配置 `CARD_API_TOKEN` |

限流（生产环境为 D1 共享计数 `rate_limits`，D1 不可用时回退内存桶并告警）：
`verify` 1200 次/5 分钟、`consume` 400 次/5 分钟、`account-consume` 1200 次/5 分钟、
`generate` 60 次/10 分钟。

## 7. 数据表（D1）

```sql
cards(id, card_key UNIQUE, prefix, plan, days, quota, used, bound_qq,
      bound_user_id, redeemed_at, redeem_token, expired_at, created_at, used_at, status, remark)
-- redeem_token：兑换批次令牌，防同秒并发重复发放权益（需执行 db/migration-redeem-token.sql）
card_logs(id, card_key, qq, action, ip, request_id, detail, created_at)
card_requests(id, user_id, plan, days, quota, reason, contact, status,
              card_key, review_note, reviewed_by, reviewed_at, created_at)
-- users 表新增权益字段（与论坛/博客同一张表）
users(..., plan DEFAULT 'free', plan_expires_at, plan_quota, plan_used)
```

迁移：`db/schema.sql` 已包含两张表；线上补列用（D1 的 `--command` 只执行第一条语句，需逐条执行）：

```bash
npx wrangler d1 execute dsh_bbs --remote --command "ALTER TABLE cards ADD COLUMN bound_user_id TEXT NOT NULL DEFAULT ''"
npx wrangler d1 execute dsh_bbs --remote --command "ALTER TABLE cards ADD COLUMN redeemed_at INTEGER NOT NULL DEFAULT 0"
npx wrangler d1 execute dsh_bbs --remote --command "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'"
npx wrangler d1 execute dsh_bbs --remote --command "ALTER TABLE users ADD COLUMN plan_expires_at INTEGER NOT NULL DEFAULT 0"
npx wrangler d1 execute dsh_bbs --remote --command "ALTER TABLE users ADD COLUMN plan_quota INTEGER NOT NULL DEFAULT 0"
npx wrangler d1 execute dsh_bbs --remote --command "ALTER TABLE users ADD COLUMN plan_used INTEGER NOT NULL DEFAULT 0"
```

`card_requests` 表（v1.32.0 新增，`db/schema.sql` 已含建表语句，线上已执行）：

```bash
npx wrangler d1 execute dsh_bbs --remote --command "CREATE TABLE IF NOT EXISTS card_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'basic', days INTEGER NOT NULL DEFAULT 30, quota INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '', status INTEGER NOT NULL DEFAULT 0, card_key TEXT NOT NULL DEFAULT '', review_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT NOT NULL DEFAULT '', reviewed_at INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)"
```

## 8. 词库端接入

词库的 URL 从 `?action=verify` 改为 REST 路径：

```
POST https://shiqing.site/api/card/verify
POST https://shiqing.site/api/card/consume
Authorization: Bearer <CARD_API_TOKEN>
```

其余逻辑（AI / UAPI / 群管）不用改。

## 9. 与参考方案的差异（修掉的问题）

| 项 | 参考方案 | 现在 |
|---|---|---|
| 适配器 | `@cloudflare/next-on-pages` + `getRequestContext` | `@opennextjs/cloudflare` + `getCloudflareContext` |
| D1 | 新建 `cards_db`，绑定名 `DB` | 复用 `dsh_bbs`，绑定名 `dsh_bbs` |
| QQ 绑定 | `bound_qq = '' OR ?2 = '' OR bound_qq = ?2` → **不传 qq 可绕过** | 去掉 `?2 = ''`，必须匹配 |
| QQ 校验 | 无 | 必须 5–12 位数字 |
| Token 比较 | 字符串 `===` | 恒定时间比较 |
| 幂等 | 无 | `request_id` 去重 |
| 限流 | 无 | verify/consume/generate 各自限流 |
| 审计 | 无 | `card_logs` 记录消费与管理操作 |
| 生成 | 逐条 INSERT + 5 次重试 | `db.batch()` 一次提交 |
| `days` | 无上限 | 1–3650 |
| 随机码 | `byte % 36`（有模偏差） | 拒绝采样，无偏差 |
| `list` | 无 total | 返回 total |
| 管理鉴权 | 页面手输 ADMIN_TOKEN（密钥落到浏览器） | 后台走登录态；脚本可继续用 ADMIN_TOKEN |
| 管理 CORS | 全部接口 `*` | 管理接口不加 CORS |
