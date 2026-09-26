/**
 * PostCSS 配置
 *
 * 目标：让 Tailwind v4 的输出能在旧 WebView（Android 8 内置 ≈ Chrome 58）上运行。
 * Tailwind v4 默认面向 Chrome 111+ / Safari 16.4+，会输出旧内核不支持、且**整块失效**的特性：
 *
 *   @layer            → Chrome 99+，旧浏览器会丢弃整个块（全站工具类消失，最致命）
 *   :where()/:is()    → Chrome 88+，选择器解析失败（深色模式等整条规则失效）
 *   color-mix()       → Chrome 111+（Tailwind 已带 hex fallback，这里补我们自己 CSS 的用法）
 *   oklab()/oklch()   → Chrome 111+
 *   @media (width>=x) → Chrome 104+
 *   渐变插值 in oklab → Chrome 111+
 *
 * 插件顺序：Tailwind 展开 → 选择器展开（:where/:is）→ @layer 展平 → 颜色/媒体查询降级。
 *
 * 为什么不用 @csstools/postcss-is-pseudo-class：
 * 它只降级 `:is()`、会原样保留 `:where()`，且对无法展开的选择器用 `:not(#\#)` 堆特异性
 * —— 对旧内核毫无帮助（仍然不认 :is）却让 CSS 体积 +55%。改为自己完整展开，见
 * packages/postcss-legacy-pseudo-classes（自检：npm run test:legacy-css）。
 *
 * 注意：这里必须用「对象 + 字符串键」形式。改成 ESM import 会让 Turbopack 把插件包
 * （含 lightningcss 原生依赖）一起打包，构建直接失败；插件包必须以 file: 依赖装在
 * node_modules 里（相对路径或本地自定义名都会报 Cannot find module）。
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // :where()/:is() → 展开为普通选择器（旧内核可用）
    "postcss-legacy-pseudo-classes": {},
    // 展平 @layer 为普通规则
    "@csstools/postcss-cascade-layers": {},
    // color-mix() → 静态 RGB 混合降级
    "@csstools/postcss-color-mix-function": {},
    // oklab()/oklch() → rgb()
    "@csstools/postcss-oklab-function": { preserve: false },
    // linear-gradient(90deg in oklab, …) → 去掉插值方法
    "@csstools/postcss-gradients-interpolation-method": {},
    // @media (width >= 64rem) → @media (min-width: 64rem)
    "@csstools/postcss-media-minmax": {},
  },
};

export default config;
