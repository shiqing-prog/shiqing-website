/**
 * 复制文本到剪贴板（兼容旧 WebView）
 *
 * - 优先用异步剪贴板 API（Chrome 66+，需 HTTPS）
 * - 失败或不存在时退化为隐藏 textarea + execCommand("copy")
 *   （旧 WebView 上 navigator.clipboard 不存在，execCommand 仍可用）
 */
export async function copyText(text: string): Promise<boolean> {
  const value = String(text ?? "");

  // 1) 现代异步 API
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* 继续走兜底方案（无权限 / 非安全上下文等） */
  }

  // 2) execCommand 兜底
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
    const host = document.body ?? document.documentElement;
    host.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange?.(0, ta.value.length);
    const ok = document.execCommand("copy");
    host.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
