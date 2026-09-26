/* eslint-disable @typescript-eslint/no-require-imports -- Node 构建脚本，使用 CommonJS */
/**
 * 旧内核 JS 后处理：npm run build:cf / deploy:cf 会自动执行
 *
 * 为什么需要它
 * ----------
 * Next.js 只按 browserslist 转译**应用代码**，node_modules 里的预编译产物（Next/React 的
 * 客户端运行时）不参与降级。实测其中含 `for await (... of ...)`（ES2018，需要 Chrome 63+），
 * 而 Android 8 内置 WebView ≈ Chrome 58 会在解析该 chunk 时直接抛语法错误，整个 chunk 失效。
 *
 * 做法
 * ----
 * 逐个客户端 chunk 用 acorn 按 ES2017（Chrome 58 的语法级别）试解析：
 *   - 通过 → 原样保留（最小改动原则，绝大多数文件不受影响）
 *   - 失败 → 用 esbuild 按 target=chrome58 转译后写回，并再次校验
 * 任一文件转译后仍不合法则**让构建失败**，避免把坏包发上线。
 *
 * 注意：只处理客户端静态 chunk；Cloudflare Workers 服务端运行在现代 V8 上，无需降级。
 */
const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

let esbuild = null;
try {
  esbuild = require("esbuild");
} catch {
  esbuild = null;
}

const root = path.resolve(__dirname, "..");
const chunksDir = path.join(root, ".open-next", "assets", "_next", "static", "chunks");

/** 目标语法级别：Chrome 58 ≈ ES2017（async/await 可用，异步迭代不可用） */
const TARGET_ECMA = 2017;
const ESBUILD_TARGET = "chrome58";

function parses(code) {
  try {
    acorn.parse(code, { ecmaVersion: TARGET_ECMA, sourceType: "module", allowHashBang: true });
    return { ok: true };
  } catch (err) {
    try {
      acorn.parse(code, { ecmaVersion: TARGET_ECMA, sourceType: "script", allowHashBang: true });
      return { ok: true };
    } catch {
      return { ok: false, message: err.message };
    }
  }
}

async function main() {
  if (!fs.existsSync(chunksDir)) {
    console.log("⚠️  未找到 .open-next/assets/_next/static/chunks，跳过旧内核 JS 后处理");
    return;
  }

  const files = fs
    .readdirSync(chunksDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(chunksDir, f));

  const legacy = [];
  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const res = parses(code);
    if (!res.ok) legacy.push({ file, message: res.message });
  }

  console.log(`扫描 ${files.length} 个客户端 chunk，其中 ${legacy.length} 个需要旧内核降级`);
  if (legacy.length === 0) return;

  if (!esbuild) {
    console.error("❌ 需要 esbuild 才能降级这些 chunk，但未安装");
    process.exit(1);
  }

  let failed = 0;
  for (const item of legacy) {
    const original = fs.readFileSync(item.file, "utf8");
    const before = original.length;
    try {
      const result = await esbuild.transform(original, {
        target: ESBUILD_TARGET,
        loader: "js",
        minify: true,
        charset: "utf8",
        legalComments: "none",
        sourcemap: false,
      });
      const check = parses(result.code);
      if (!check.ok) {
        failed++;
        console.error(`❌ ${path.basename(item.file)} 降级后仍不合法：${check.message}`);
        continue;
      }
      fs.writeFileSync(item.file, result.code);
      console.log(
        `✅ ${path.basename(item.file)} 已降级（${Math.round(before / 1024)}KB → ${Math.round(
          result.code.length / 1024
        )}KB）：${item.message}`
      );
    } catch (err) {
      failed++;
      console.error(`❌ ${path.basename(item.file)} 降级失败：${err.message}`);
    }
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} 个 chunk 降级失败，终止构建`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("旧内核 JS 后处理异常：", err);
  process.exit(1);
});
