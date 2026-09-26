/* eslint-disable @typescript-eslint/no-require-imports -- Node 开发脚本，使用 CommonJS */
/**
 * 旧浏览器选择器降级插件的单元自检：npm run test:legacy-css
 * 直接调用插件内部的展开逻辑（通过 postcss 跑一遍真实规则），断言输出。
 */
const postcss = require("postcss");
const path = require("path");

const plugin = require(path.join(
  __dirname,
  "..",
  "packages",
  "postcss-legacy-pseudo-classes",
  "index.js"
));
const { splitTopLevel } = plugin.__internals;

/** 用插件处理一段 CSS，返回单条规则的 selector 列表 */
async function run(css) {
  const result = await postcss([plugin()]).process(css, { from: undefined });
  return result.css;
}

const cases = [
  [
    ".dark\\:x:where(.dark,.dark *){color:red}",
    [".dark\\:x.dark", ".dark .dark\\:x"],
  ],
  [
    ".style-geek .kratos-card:where(.dark *){color:red}",
    [".dark .style-geek .kratos-card"],
  ],
  [
    ".dark\\:group-hover\\:text-blue-400:where(.group:hover *){color:red}",
    [".group:hover .dark\\:group-hover\\:text-blue-400"],
  ],
  ["select:is([multiple],[size]){color:red}", ["select[multiple]", "select[size]"]],
  [":where([title]){color:red}", ["[title]"]],
  // :not() 内的 :is 保持原样（旧内核 :not 只接受简单选择器）
  [
    "option:not(:is(:lang(ae),:lang(ar))){color:red}",
    ["option:not(:is(:lang(ae),:lang(ar)))"],
  ],
];

(async () => {
  let fail = 0;
  for (const [input, expected] of cases) {
    const out = await run(input);
    const selectorPart = out.replace(/\{[^}]*\}/, "").trim();
    // 用插件自己的顶层切分，避免把 :is(a,b) 内部的逗号当成分隔符
    const got = splitTopLevel(selectorPart, ",");
    const ok =
      got.length === expected.length && expected.every((e) => got.includes(e));
    console.log(`${ok ? "✅" : "❌"} ${input}`);
    if (!ok) {
      fail++;
      console.log(`   期望: ${expected.join(" | ")}`);
      console.log(`   实得: ${got.join(" | ")}`);
    }
  }
  console.log(fail === 0 ? "\n✅ 选择器降级自检通过" : `\n❌ 失败 ${fail} 项`);
  process.exit(fail === 0 ? 0 : 1);
})();
