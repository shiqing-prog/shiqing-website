/* eslint-disable @typescript-eslint/no-require-imports -- Node 开发脚本，使用 CommonJS */
/**
 * 旧内核兼容性静态校验：npm run test:legacy-build
 *
 * 1. 用 acorn 把 public/legacy-polyfills.js 按 ES5 解析（它必须能被 Chrome 58 解析）
 * 2. 把构建产物里的客户端 JS chunk 按 ES2017 解析（Chrome 58 ≈ ES2017）
 * 3. 检查 CSS 里是否还有旧内核会整块丢弃 / 解析失败的写法（@layer、:where 等）
 *
 * 注意：只做保守的解析校验，不等于真机验证；真机请用 Android 8 设备打开 /psych 冒烟。
 */
const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const root = path.resolve(__dirname, "..");
const openNextAssets = path.join(root, ".open-next", "assets");

let fail = 0;
const report = (ok, msg) => {
  console.log(`${ok ? "✅" : "❌"} ${msg}`);
  if (!ok) fail++;
};

function parseCode(code, ecmaVersion) {
  try {
    acorn.parse(code, { ecmaVersion, sourceType: "module", allowHashBang: true });
    return { ok: true, message: "" };
  } catch (err) {
    // module 解析失败时再按 script 试一次（有些 chunk 是 UMD/IIFE）
    try {
      acorn.parse(code, { ecmaVersion, sourceType: "script", allowHashBang: true });
      return { ok: true, message: "" };
    } catch {
      return { ok: false, message: err.message };
    }
  }
}

/* ---------- 1. legacy-polyfills.js 必须是 ES5 ---------- */
const polyPath = path.join(root, "public", "legacy-polyfills.js");
if (!fs.existsSync(polyPath)) {
  report(false, "缺少 public/legacy-polyfills.js");
} else {
  const src = fs.readFileSync(polyPath, "utf8");
  let ok = true;
  let msg = "";
  try {
    acorn.parse(src, { ecmaVersion: 5, sourceType: "script" });
  } catch (err) {
    ok = false;
    msg = err.message;
  }
  report(ok, `public/legacy-polyfills.js 是纯 ES5${ok ? "" : " —— " + msg}`);
}

/* ---------- 2. 客户端 chunk 必须能在 ES2017 解析 ---------- */
const chunksDir = path.join(openNextAssets, "_next", "static", "chunks");
if (!fs.existsSync(chunksDir)) {
  report(false, `未找到构建产物 ${chunksDir}（请先 npm run build:cf）`);
} else {
  const chunks = fs
    .readdirSync(chunksDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => ({ f, size: fs.statSync(path.join(chunksDir, f)).size }))
    .sort((a, b) => b.size - a.size);

  let bad = 0;
  let checked = 0;
  for (const { f } of chunks) {
    const src = fs.readFileSync(path.join(chunksDir, f), "utf8");
    const res = parseCode(src, 2017);
    checked++;
    if (!res.ok) {
      bad++;
      if (bad <= 3) console.log(`   ❌ ${f}: ${res.message}`);
    }
  }
  report(bad === 0, `${checked} 个客户端 chunk 均可在 ES2017 解析（不合格 ${bad} 个）`);
}

/* ---------- 3. CSS 检查 ---------- */
const cssFiles = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".css")) cssFiles.push(full);
  }
})(openNextAssets);

if (cssFiles.length === 0) {
  report(false, "未找到构建产物 CSS");
} else {
  // :is() 允许残留在 :not() 内（Tailwind preflight 的按语言字体规则，影响可忽略）
  const checks = [
    ["@layer", /@layer\b/g, 0],
    [":where(", /:where\(/g, 0],
    ["oklab(", /oklab\(/g, 0],
    ["oklch(", /oklch\(/g, 0],
  ];
  for (const [label, re, limit] of checks) {
    let count = 0;
    for (const file of cssFiles) {
      const css = fs.readFileSync(file, "utf8");
      count += (css.match(re) ?? []).length;
    }
    report(count <= limit, `CSS 中 ${label} 出现 ${count} 次（期望 ≤ ${limit}）`);
  }

  // :is( 只允许出现在 :not( 内，或 preflight 的按语言选择器规则里
  // （`:lang(...)` 列表由 lightningcss 在 postcss 之后引入，作用于 RTL 语言的 select 内边距，
  //   对中文站点无功能影响；详见 README「旧浏览器兼容」一节）
  let strayIs = 0;
  let exemptIs = 0;
  for (const file of cssFiles) {
    const css = fs.readFileSync(file, "utf8");
    const matches = css.match(/.{0,60}:is\(.{0,160}/g) ?? [];
    for (const m of matches) {
      const at = m.indexOf(":is(");
      const head = at >= 0 ? m.slice(0, at) : m;
      const body = at >= 0 ? m.slice(at) : "";
      const inNot = /:not\($/i.test(head);
      // preflight 的按语言规则：option:is(:lang(ae), :lang(ar), …)
      const langList = /:lang\(/.test(body) && body.includes(",");
      if (inNot || langList) exemptIs++;
      else {
        strayIs++;
        if (strayIs <= 2) console.log(`   ❌ 裸露 :is() 片段：${m}`);
      }
    }
  }
  report(strayIs === 0, `CSS 中裸露的 :is() 有 ${strayIs} 处（期望 0；已豁免 ${exemptIs} 处 :not()/语言选择器）`);
}

console.log(fail === 0 ? "\n✅ 旧内核兼容性静态校验通过" : `\n❌ 失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);
