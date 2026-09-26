/**
 * PostCSS 插件：把 `:where(...)` / `:is(...)` 展开成旧内核可解析的普通选择器。
 *
 * 背景
 * ----
 * Tailwind v4 大量使用 `:where()` 做优先级隔离（dark 变体、group/peer 变体等），
 * 而既有的 `@csstools/postcss-is-pseudo-class` 只处理 `:is()`、会原样保留 `:where()`，
 * 于是 Android 8 内置 WebView（≈ Chrome 58，不支持 :is/:where）里这些规则整条失效，
 * 表现为**深色模式完全不生效**。
 *
 * 转换规则
 * ----
 * 对形如 `PRE:where(ALT1, ALT2)POST` 的选择器，对每个候选做「祖先/主体」拆分后拼接：
 *
 *   `.dark\:x:where(.dark, .dark *)`  →  `.dark\:x.dark, .dark .dark\:x`
 *   `.style-geek .kratos-card:where(.dark *)` → `.dark .style-geek .kratos-card`
 *   `.dark\:group-hover\:text-x:where(.group:hover *)`
 *                                     →  `.group:hover .dark\:group-hover\:text-x`
 *
 * 说明：:where() 的语义是「匹配其中任一候选」，展开后语义一致，只是特异性从 0 变为
 * 实际值——这在旧内核上没有替代方案，且方向上是「工具类更容易覆盖基础样式」，安全。
 *
 * 不处理的情况（保持原样，交给后续插件或直接降级）：
 *   - 位于 `:not(...)` 内部的 :is/:where（旧内核的 :not 只接受简单选择器，
 *     且这些规则来自 Tailwind preflight 的按语言字体设置，影响可忽略）
 *   - 无法定位配对括号等异常输入
 *
 * 安装方式：本项目 packages/ 下的 file: 依赖（Turbopack 只从 node_modules 解析插件名）。
 */

/** 按顶层分隔符切分（忽略括号 / 属性选择器 / 引号内部的字符） */
function splitTopLevel(input, sep) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      cur += ch;
      if (ch === quote && input[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** 找到与下标 pos 处的 '(' 配对的 ')' */
function matchParen(input, pos) {
  let depth = 0;
  let quote = null;
  for (let i = pos; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote && input[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * 把一个候选选择器拆成「祖先部分 + 主体部分」
 * 例：`.dark *` → { ancestor: '.dark ', subject: '*' }；`[title]` → { ancestor: '', subject: '[title]' }
 */
function splitCompound(selector) {
  let depth = 0;
  let quote = null;
  let lastComb = -1;
  let lastCombEnd = -1;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      if (ch === quote && selector[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0) {
      if (ch === ">" || ch === "+" || ch === "~") {
        lastComb = i;
        lastCombEnd = i + 1;
      } else if (/\s/.test(ch)) {
        // 空白只有在两侧都有内容时才算组合符
        const before = selector.slice(0, i).trim();
        const after = selector.slice(i).trim();
        if (before && after) {
          lastComb = i;
          lastCombEnd = i;
        }
      }
    }
  }
  if (lastComb < 0) return { ancestor: "", subject: selector.trim() };
  // 组合符之后若还有空白（`a > b`），一并归入祖先部分，保证拼接后不粘连
  let end = lastCombEnd;
  while (end < selector.length && /\s/.test(selector[end])) end++;
  return {
    ancestor: selector.slice(0, end),
    subject: selector.slice(end).trim(),
  };
}

/** 判断下标 pos 是否位于某个 `:not(` 的括号内 */
function insideNot(selector, pos) {
  let depth = 0;
  let notDepth = 0;
  for (let i = 0; i < pos; i++) {
    const ch = selector[i];
    if (ch === "(") {
      depth++;
      if (/:not$/i.test(selector.slice(0, i))) notDepth = depth;
    } else if (ch === ")") {
      if (depth === notDepth) notDepth = 0;
      depth--;
    }
  }
  return notDepth > 0;
}

/**
 * 展开单个选择器中的 :where()/:is()（可能多个，做笛卡尔积）
 * @returns {string[] | null} 展开后的选择器列表；null 表示无需/无法展开
 */
function expandSelector(selector) {
  /** 逐层展开：每次处理最左边一个可展开的 :is/:where */
  let selectors = [selector];

  for (let round = 0; round < 8; round++) {
    const next = [];
    let changed = false;

    for (const sel of selectors) {
      const m = /(:where|:is)\(/i.exec(sel);
      if (!m) {
        next.push(sel);
        continue;
      }
      const nameStart = m.index;
      const parenStart = nameStart + m[0].length - 1;
      const parenEnd = matchParen(sel, parenStart);
      if (parenEnd < 0) {
        next.push(sel);
        continue;
      }
      // `:not()` 内部的 :is/:where 保持原样（旧内核的 :not 只接受简单选择器）
      if (insideNot(sel, nameStart)) {
        // 原样保留这一段，继续在其余部分查找
        const head = sel.slice(0, parenEnd + 1);
        const tail = sel.slice(parenEnd + 1);
        const tailHas = /(:where|:is)\(/i.test(tail);
        if (tailHas) {
          // 先把尾部展开，再接回头部
          const tailExpanded = expandSelector(tail);
          next.push(...(tailExpanded ?? [tail]).map((t) => head + t));
        } else {
          next.push(sel);
        }
        continue;
      }

      const pre = sel.slice(0, nameStart);
      const post = sel.slice(parenEnd + 1);
      const inner = sel.slice(parenStart + 1, parenEnd);
      const alts = splitTopLevel(inner, ",");
      if (alts.length === 0) {
        next.push(sel);
        continue;
      }

      for (const alt of alts) {
        const { ancestor, subject } = splitCompound(alt);
        let subjectPart = subject;
        // 主体是裸 * 时与前面的复合选择器重复，可直接省略
        if (subjectPart === "*" && pre.trim() !== "") subjectPart = "";
        if (subjectPart === "*" && pre.trim() === "" && ancestor === "") subjectPart = "*";
        const combined = `${ancestor}${pre}${subjectPart}${post}`.trim();
        next.push(combined.length > 0 ? combined : "*");
      }
      changed = true;
    }

    selectors = next;
    if (!changed) break;
  }

  return selectors.length === 1 && selectors[0] === selector ? null : selectors;
}

module.exports = () => ({
  postcssPlugin: "shiqing-legacy-pseudo-classes",
  Rule(rule) {
    if (!rule.selector) return;
    if (!/:where\(|:is\(/i.test(rule.selector)) return;

    // 选择器列表本身也按顶层逗号切分后逐个展开
    const parts = splitTopLevel(rule.selector, ",");
    const out = [];
    let anyExpanded = false;
    for (const part of parts) {
      const expanded = expandSelector(part);
      if (expanded) {
        anyExpanded = true;
        out.push(...expanded);
      } else {
        out.push(part);
      }
    }
    if (anyExpanded) rule.selector = out.join(", ");
  },
});
module.exports.postcss = true;
// 供 scripts/legacy-css-selftest.js 复用（测试时不重复实现选择器解析）
module.exports.__internals = { splitTopLevel, splitCompound, expandSelector, insideNot };
