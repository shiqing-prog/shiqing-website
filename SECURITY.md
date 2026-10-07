# 安全说明与密钥轮换清单

本文件记录本站的安全基线、已知取舍，以及**必须由人工执行**的密钥轮换步骤。

## 一、必须轮换的凭据（代码无法自动完成）

以下凭据曾在/正在本机明文保存（均已被 `.gitignore` 排除、且经核实**从未提交**到
公开仓库 `shiqing-prog/shiqing-website`，但明文留在磁盘/工作区仍有泄漏面）：

| 凭据 | 位置 | 泄漏后果 | 轮换方式 |
|---|---|---|---|
| `CARD_API_TOKEN` | `personal-site/.dev.vars`、`F:\\harness\\card-tokens.txt` | 调用词库 verify/consume/account-consume | `npx wrangler secret put CARD_API_TOKEN`；同步更新这两处 |
| `CARD_ADMIN_TOKEN` | 同上 | **直接刷卡/销卡/审批发卡**（管理接口接受该 token） | `npx wrangler secret put CARD_ADMIN_TOKEN`；同步更新 |
| `MAILER_SECRET` | `mail-relay/config.json`、Worker secret | 调用 `mail.shiqing.site/send` 发信 | `wrangler secret put MAILER_SECRET` + 改 config.json |
| QQ 邮箱 SMTP 授权码 | `mail-relay/config.json` | 接管该 QQ 邮箱收发信 | QQ 邮箱 → 设置 → 账户 → 重新生成授权码 |
| `MAIL_RELAY_KEY` | `F:\\harness\\mailrelay-key.txt` | 解密公开仓库里的 `config.json.enc` | 重新生成 64 位 hex，`node encrypt.js` 后覆盖 enc 文件 |

> `echo xxx | wrangler secret put` 会把换行写进值里导致校验失败；请用
> `cmd /c "npx wrangler secret put X"` 后在提示符下粘贴。

建议：轮换完成后删除磁盘上的明文副本，改为只在运行时经环境变量注入。

## 二、必须执行的 D1 迁移

| 迁移文件 | 内容 |
|---|---|
| `db/migration-ratelimit.sql` | `rate_limits` 表（D1 共享限流；缺失时会静默回退内存桶，多 isolate 下几乎等于没限流） |
| `db/migration-redeem-token.sql` | `cards.redeem_token` 列（整卡兑换并发去重，见下） |

## 三、已修复（代码层）

- **并发兑换不在同秒重复发放权益**：`cards.redeem_token` 用一次性令牌关联 claim 与
  grant（此前用秒级 `now`，同一秒内的两个并发请求会让 grant 的 EXISTS 命中上一次
  claim，从而重复叠加权益）。需执行 `db/migration-redeem-token.sql`。
- **账号权益次数可被真正核销**：新增 `POST /api/card/account-consume`（Bearer
  `CARD_API_TOKEN`），原子自增 `users.plan_used`，仅在有效期内且未超次数时成功；
  此前 `plan_used` 没有任何写入点。带 `request_id` 时幂等。
- **卡密幂等按「卡 + 成功日志」限定**：失败调用不再污染 `request_id`，无法借此绕过 quota。
- **SSR 会话过期校验**：页面统一走 `getSessionUserFromCookies()`，过期 Cookie 不再算已登录。
- **5xx 不再回显内部异常**：统一 `serverError()`，原始错误只写服务端日志（补上了 signin）。
- **限流升级为 D1 共享计数**（`rate_limits` 表 + `hitRateLimitDb`），多 isolate 下也生效；
  D1 不可用/表缺失时回退进程内存桶并**打印一次告警**（不再静默降级）。需执行
  `db/migration-ratelimit.sql`。
- **安全响应头**：新增 CSP（`next.config.ts`，无 nonce：`default-src 'self'`、
  `object-src 'none'`、`base-uri 'self'`、`form-action 'self'`、`frame-ancestors 'self'`，
  `script-src` 仍含 `'unsafe-inline'`）；外加 `nosniff` / `X-Frame-Options` /
  `Referrer-Policy` / `Permissions-Policy` / HSTS（仅生产），并关闭 `X-Powered-By`。
- **邮件中继加固**：`/send` 增加速率限制、收件人格式与数量校验、请求体上限（413）、
  恒定时间比较改为「先 SHA-256 摘要再比较」（不再泄漏长度）。
- **上传流程去孤儿化**：`/api/files/ticket` 只签凭证、不再预建 `files` 行；客户端在
  `upload-complete` 成功后调用 `/api/files/confirm`（校验 HMAC + 凭证归属）才落元数据。
  分片数由服务端按文件大小计算，不再采信前端 `chunks`。
- **删除文件校验引用**：`DELETE /api/files/[id]` 在头像/帖子仍在引用时返回 409，避免裂图。
- **昵称唯一**：注册与修改资料都会校验昵称未被占用，避免 @提及 命中同名者/冒充。
- **点赞/收藏/关注/投票原子化**：改用 `INSERT OR IGNORE` + `changes` 判定，消除并发双击
  下的唯一约束 500 与计数漂移。
- **其他**：密码最短 8 位；上传文件名过滤路径分隔符/控制字符；发帖标签限长 30 字并去重；
  点赞/收藏/投票/关注补限流；`safeEqual` 不再按长度提前返回。

## 四、已知取舍（需产品决策，未改）

- **注册接口对已存在邮箱返回 409**：可被用于枚举注册邮箱。要彻底修复需改为
  「注册不自动登录 + 邮件确认」流程；当前保留自动登录体验。（昵称冲突也返回 409，同理。）
- **文件库公开列目录**：`GET /api/files` 与下载链接无鉴权，属「全员可下载」的
  产品设计（页面已明示）。
- **CSP 未做 nonce**：`script-src` 仍含 `'unsafe-inline'`；严格 nonce 需全站动态渲染，
  留待后续（详见 `next.config.ts` 注释）。
- **邮件验证开关**：`VERIFY_EMAIL=true` 时仍不阻止未验证账号登录（`WORKSPACE_MEMORY.md`
  记为已知项）。
- **账号权益次数的消费方**：本站新增 `/api/card/account-consume` 作为核销入口，但当前
  站内没有自动调用它的功能；需由词库/计费端接入后 `plan_used` 才会增长。
