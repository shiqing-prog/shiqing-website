/* eslint-disable @typescript-eslint/no-require-imports -- Node 开发脚本，使用 CommonJS */
/**
 * 心理测评评分自检（无需测试框架）
 *
 * 用法：npm run test:psych
 * 原理：先把 src/lib/psych 下的 TS 编译到临时目录，再用 node 跑本脚本，
 *      对每个量表用「全选最低 / 全选最高 / 全选中间 / 定向作答」跑一遍评分，
 *      校验总分范围、分级非空、维度百分比合法、反向计分方向、以及定向类型判定。
 */
const fs = require("fs");
const path = require("path");

const outDir = process.argv[2] || path.join(__dirname, "..", ".tmp-psych");
const { SCALES } = require(path.join(path.resolve(outDir), "scales.js"));

let fail = 0;
const check = (cond, msg) => {
  if (!cond) {
    fail++;
    console.log("  ❌ " + msg);
  }
};
const LEVEL_KEYS = ["good", "info", "mild", "moderate", "severe"];

for (const s of SCALES) {
  const values = s.options.map((o) => o.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mid = values[Math.floor(values.length / 2)];
  const n = s.questions.length;

  console.log(
    `\n${s.slug} (${s.name}) 题数=${n} 选项=${values.length} 反向题=${
      s.questions.filter((q) => q.reverse).length
    }`
  );

  for (const [label, raw] of [
    ["全选最低", new Array(n).fill(min)],
    ["全选最高", new Array(n).fill(max)],
    ["全选中间", new Array(n).fill(mid)],
  ]) {
    let r;
    try {
      r = s.score(raw);
    } catch (e) {
      fail++;
      console.log(`  ❌ ${label} 抛错: ${e.message}`);
      continue;
    }
    check(Number.isFinite(r.total), `${label} total 非数字`);
    check(r.total >= 0 && r.total <= r.max, `${label} total ${r.total} 超出 0-${r.max}`);
    check(typeof r.level === "string" && r.level.length > 0, `${label} level 为空`);
    check(Array.isArray(r.advice) && r.advice.length > 0, `${label} advice 为空`);
    check(LEVEL_KEYS.includes(r.levelKey), `${label} levelKey 非法: ${r.levelKey}`);
    for (const b of r.breakdown ?? []) {
      check(b.percent >= 0 && b.percent <= 100, `${label} 维度 ${b.label} percent 越界`);
      check(b.value >= 0 && b.value <= b.max + 0.001, `${label} 维度 ${b.label} value 越界`);
    }
    console.log(
      `  ${label}: total=${r.total}/${r.max} level=${r.level}` +
        (r.typeCode ? ` code=${r.typeCode}` : "")
    );
  }

  // 反向计分方向：RSES 第 3 题（反向题）给最低分应提高总分
  if (s.slug === "rses") {
    const base = new Array(n).fill(3);
    const flipped = [...base];
    flipped[2] = 1;
    check(s.score(flipped).total > s.score(base).total, "RSES 反向题方向错误");
  }

  // 危机钩子
  if (s.slug === "phq9") {
    const safe = new Array(n).fill(0);
    const risky = [...safe];
    risky[8] = 1;
    check(s.crisis(safe) === null, "PHQ-9 无风险应返回 null");
    check(typeof s.crisis(risky) === "string", "PHQ-9 第 9 题 >0 应返回危机文案");
  }

  // ECR-RS 四种依恋类型都应可达
  if (s.slug === "ecrrs") {
    const mk = (avoidHigh, anxHigh) => {
      const raw = new Array(9).fill(4);
      for (let i = 0; i < 4; i++) raw[i] = avoidHigh ? 1 : 7; // 反向题：低原始分 = 高回避
      raw[4] = avoidHigh ? 7 : 1;
      raw[5] = avoidHigh ? 7 : 1;
      for (let i = 6; i < 9; i++) raw[i] = anxHigh ? 7 : 1;
      return s.score(raw);
    };
    for (const [a, b, want] of [
      [false, false, "安全型"],
      [false, true, "焦虑型（专注型）"],
      [true, false, "回避型（疏离型）"],
      [true, true, "恐惧型（矛盾型）"],
    ]) {
      const got = mk(a, b).typeName;
      check(got === want, `ECR-RS(回避=${a},焦虑=${b}) 期望 ${want} 实得 ${got}`);
    }
  }

  // 16 型：无区分度作答应为 50%，定向作答必须给出正确类型（历史回归点）
  if (s.slug === "jung16") {
    for (const v of [1, 3, 5]) {
      const r = s.score(new Array(n).fill(v));
      check(
        r.breakdown.every((b) => b.percent === 50),
        `jung16 全选 ${v} 应各维度 50%，实得 ${r.breakdown.map((b) => b.percent).join(",")}`
      );
    }
    const rawFor = (poles) =>
      s.questions.map((q) => (poles.includes(q.dim.split(":")[1]) ? 5 : 1));
    check(s.score(rawFor(["I", "N", "F", "P"])).typeCode === "INFP", "jung16 定向应为 INFP");
    check(s.score(rawFor(["E", "S", "T", "J"])).typeCode === "ESTJ", "jung16 定向应为 ESTJ");
    check(s.score(rawFor(["I", "N", "F", "P"])).typeDesc.length > 10, "jung16 缺少类型描述");
  }
}

try {
  fs.rmSync(path.resolve(outDir), { recursive: true, force: true });
} catch {
  /* 清理失败忽略 */
}

console.log(fail === 0 ? "\n✅ 全部量表评分自检通过" : `\n❌ 失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);
