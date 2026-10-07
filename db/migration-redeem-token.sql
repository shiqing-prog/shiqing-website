-- 2026-10：整卡兑换批次令牌
-- 背景：redeemCardToAccount 原来用「本次调用的秒级 now」作为 claim/grant 的关联值，
-- 同一秒内的两个并发请求会因 grant 的 EXISTS 命中上一次 claim 而重复发放账号权益。
-- 这里给 cards 增加一个高熵令牌列：claim 写入本次令牌，grant 用同一令牌校验。
-- 幂等：D1/SQLite 重复执行 ALTER TABLE 会报 duplicate column，属预期（可忽略）。
ALTER TABLE cards ADD COLUMN redeem_token TEXT NOT NULL DEFAULT '';
