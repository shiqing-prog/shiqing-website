/*!
 * 旧 WebView 兼容补丁（目标：Android 8 内置 WebView ≈ Chrome 58 / Android 8.1 ≈ Chrome 61）
 *
 * 通过 <script nomodule> 加载：只有**不支持 ES modules 的老内核**会下载并执行，
 * 现代浏览器（Chrome 61+ / Safari 10.1+ 等）直接跳过，不影响正常用户。
 *
 * 必须保持 ES5 语法（不能用箭头函数 / let / const / 模板字符串 / 可选链 / 展开运算符），
 * 因为这个文件本身就是给不认识这些语法的内核准备的。
 */
(function () {
  "use strict";

  var w = window;
  var d = document;
  var el = d.documentElement;
  var P = w.Promise;

  /* ============================================================
   * 一、能力探测：给 <html> 打标记，供 CSS 做降级
   * ============================================================ */
  function addFlag(name) {
    if ((" " + el.className + " ").indexOf(" " + name + " ") === -1) {
      el.className = (el.className + " " + name).replace(/^\s+/, "");
    }
  }

  function supports(prop, value) {
    try {
      if (w.CSS && CSS.supports) return !!CSS.supports(prop, value);
    } catch (e) {}
    return false;
  }

  // flex 布局的 gap：Chrome < 84 / iOS Safari < 14.1 不支持（grid gap 支持得更早）
  try {
    var probe = d.createElement("div");
    probe.style.cssText =
      "display:flex;flex-direction:column;row-gap:1px;position:absolute;top:-9999px;left:-9999px;width:1px;height:auto;";
    probe.appendChild(d.createElement("div"));
    probe.appendChild(d.createElement("div"));
    var host = d.body || el;
    host.appendChild(probe);
    var flexGapOk = probe.scrollHeight === 1;
    host.removeChild(probe);
    if (!flexGapOk) addFlag("noflexgap");
  } catch (e) {
    addFlag("noflexgap");
  }

  // backdrop-filter（毛玻璃）：Chrome < 76
  if (
    !supports("backdrop-filter", "blur(1px)") &&
    !supports("-webkit-backdrop-filter", "blur(1px)")
  ) {
    addFlag("nobackdrop");
  }

  // 栅格 / 弹性子元素动画等使用的 gap 之外的现代单位
  if (!supports("position", "sticky")) addFlag("nosticky");

  // :focus-visible（Chrome 86）：不支持时用 :focus 兜底焦点样式
  try {
    d.querySelector(":focus-visible");
  } catch (e) {
    addFlag("legacy-focus");
  }

  /* ============================================================
   * 二、语法相关 API polyfill（补齐即可，语法降级由 browserslist 交给 SWC）
   * ============================================================ */

  // globalThis（Chrome 71）
  if (typeof w.globalThis === "undefined") w.globalThis = w;

  // queueMicrotask（Chrome 71）
  if (typeof w.queueMicrotask !== "function") {
    w.queueMicrotask = function (cb) {
      if (P) {
        P.resolve().then(cb);
      } else {
        setTimeout(cb, 0);
      }
    };
  }

  // Promise.finally（Chrome 63）
  if (P && !P.prototype["finally"]) {
    P.prototype["finally"] = function (cb) {
      var C = this.constructor || P;
      return this.then(
        function (v) {
          return C.resolve(cb()).then(function () {
            return v;
          });
        },
        function (e) {
          return C.resolve(cb()).then(function () {
            throw e;
          });
        }
      );
    };
  }

  // Promise.allSettled（Chrome 76）
  if (P && !P.allSettled) {
    P.allSettled = function (list) {
      return P.all(
        Array.prototype.map.call(list, function (p) {
          return P.resolve(p).then(
            function (value) {
              return { status: "fulfilled", value: value };
            },
            function (reason) {
              return { status: "rejected", reason: reason };
            }
          );
        })
      );
    };
  }

  // Object.fromEntries（Chrome 73）
  if (!Object.fromEntries) {
    Object.fromEntries = function (iterable) {
      var out = {};
      var list = Array.isArray(iterable) ? iterable : Array.from(iterable);
      for (var i = 0; i < list.length; i++) out[list[i][0]] = list[i][1];
      return out;
    };
  }

  // Object.hasOwn（Chrome 93）
  if (!Object.hasOwn) {
    Object.hasOwn = function (obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };
  }

  // Array.prototype.flat / flatMap（Chrome 69）
  if (!Array.prototype.flat) {
    Array.prototype.flat = function (depth) {
      var d0 = depth === undefined ? 1 : Math.floor(depth);
      if (d0 < 1) return Array.prototype.slice.call(this);
      return Array.prototype.reduce.call(
        this,
        function (acc, v) {
          return acc.concat(
            Array.isArray(v) ? Array.prototype.flat.call(v, d0 - 1) : v
          );
        },
        []
      );
    };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (fn, thisArg) {
      return Array.prototype.flat.call(
        Array.prototype.map.call(this, fn, thisArg),
        1
      );
    };
  }

  // Array.prototype.at（Chrome 92）
  if (!Array.prototype.at) {
    Array.prototype.at = function (n) {
      var i = Math.trunc(n) || 0;
      if (i < 0) i += this.length;
      return i < 0 || i >= this.length ? undefined : this[i];
    };
  }

  // Array.prototype.findLast / findLastIndex（Chrome 97）
  if (!Array.prototype.findLast) {
    Array.prototype.findLast = function (fn, thisArg) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (fn.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }

  // String.prototype.trimStart / trimEnd（Chrome 66）
  if (!String.prototype.trimStart) {
    String.prototype.trimStart = function () {
      return String(this).replace(/^[\s\uFEFF\xA0]+/, "");
    };
  }
  if (!String.prototype.trimEnd) {
    String.prototype.trimEnd = function () {
      return String(this).replace(/[\s\uFEFF\xA0]+$/, "");
    };
  }

  // String.prototype.at（Chrome 92）
  if (!String.prototype.at) {
    String.prototype.at = function (n) {
      var str = String(this);
      var i = Math.trunc(n) || 0;
      if (i < 0) i += str.length;
      return i < 0 || i >= str.length ? undefined : str.charAt(i);
    };
  }

  // String.prototype.replaceAll（Chrome 85）
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, repl) {
      if (search instanceof RegExp) {
        if (!search.global) {
          throw new TypeError("replaceAll must be called with a global RegExp");
        }
        return String(this).replace(search, repl);
      }
      var s = String(this);
      var needle = String(search);
      var replacement =
        typeof repl === "function" ? repl(needle) : String(repl);
      return s.split(needle).join(replacement);
    };
  }

  // String.prototype.matchAll（Chrome 73）
  if (!String.prototype.matchAll) {
    String.prototype.matchAll = function (re) {
      var flags = re.flags || (re.global ? "g" : "");
      if (flags.indexOf("g") === -1) {
        throw new TypeError("matchAll must be called with a global RegExp");
      }
      var str = String(this);
      var rx = new RegExp(re.source, flags);
      var out = [];
      var m;
      while ((m = rx.exec(str)) !== null) {
        out.push(m);
        if (m[0] === "") rx.lastIndex++;
      }
      return out;
    };
  }

  /* ============================================================
   * 三、Web API polyfill
   * ============================================================ */

  // AbortController / AbortSignal（Chrome 66）
  // 说明：polyfill 无法让原生 fetch 真正中断请求（fetch 只认原生 signal），
  // 但可以保证 new AbortController() 不抛错；配合业务侧的 Promise.race 超时兜底。
  if (typeof w.AbortController === "undefined") {
    function SimpleSignal() {
      this.aborted = false;
      this.onabort = null;
      this.reason = undefined;
      this._listeners = [];
    }
    SimpleSignal.prototype.addEventListener = function (type, fn) {
      if (type === "abort" && typeof fn === "function") this._listeners.push(fn);
    };
    SimpleSignal.prototype.removeEventListener = function (type, fn) {
      if (type !== "abort") return;
      var i = this._listeners.indexOf(fn);
      if (i >= 0) this._listeners.splice(i, 1);
    };
    SimpleSignal.prototype.dispatchEvent = function () {
      return true;
    };
    SimpleSignal.prototype._fire = function (reason) {
      if (this.aborted) return;
      this.aborted = true;
      this.reason = reason;
      var ev = { type: "abort", target: this };
      try {
        if (typeof this.onabort === "function") this.onabort(ev);
      } catch (e) {}
      var list = this._listeners.slice();
      for (var i = 0; i < list.length; i++) {
        try {
          list[i].call(this, ev);
        } catch (e) {}
      }
    };
    function SimpleController() {
      this.signal = new SimpleSignal();
    }
    SimpleController.prototype.abort = function (reason) {
      this.signal._fire(reason);
    };
    w.AbortController = SimpleController;
    w.AbortSignal = SimpleSignal;
  }

  // crypto.randomUUID（Chrome 92）
  (function () {
    var c = w.crypto || w.msCrypto;
    if (!c) return;
    if (typeof c.randomUUID !== "function") {
      var uuid = function () {
        if (typeof c.getRandomValues === "function") {
          var b = new Uint8Array(16);
          c.getRandomValues(b);
          b[6] = (b[6] & 15) | 64;
          b[8] = (b[8] & 63) | 128;
          var hex = "";
          for (var i = 0; i < 16; i++) {
            hex += (b[i] + 256).toString(16).slice(1);
          }
          return (
            hex.slice(0, 8) +
            "-" +
            hex.slice(8, 12) +
            "-" +
            hex.slice(12, 16) +
            "-" +
            hex.slice(16, 20) +
            "-" +
            hex.slice(20)
          );
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (ch) {
          var r = (Math.random() * 16) | 0;
          var v = ch === "x" ? r : (r & 3) | 8;
          return v.toString(16);
        });
      };
      try {
        c.randomUUID = uuid;
      } catch (e) {
        try {
          Object.defineProperty(c, "randomUUID", { value: uuid });
        } catch (e2) {}
      }
    }
    // 老 WebKit 的 SubtleCrypto 挂在 webkitSubtle 上
    if (!c.subtle && c.webkitSubtle) {
      try {
        c.subtle = c.webkitSubtle;
      } catch (e) {}
    }
  })();

  // structuredClone（Chrome 98）
  if (typeof w.structuredClone !== "function") {
    w.structuredClone = function (value) {
      return JSON.parse(JSON.stringify(value));
    };
  }

  // navigator.clipboard（Chrome 66）：用 execCommand 兜底
  (function () {
    if (!w.navigator || w.navigator.clipboard) return;
    var copy = function (text) {
      return new P(function (resolve, reject) {
        try {
          var ta = d.createElement("textarea");
          ta.value = String(text);
          ta.setAttribute("readonly", "");
          ta.style.cssText =
            "position:fixed;top:0;left:-9999px;opacity:0;";
          var host = d.body || el;
          host.appendChild(ta);
          ta.focus();
          ta.select();
          if (ta.setSelectionRange) ta.setSelectionRange(0, ta.value.length);
          var ok = false;
          try {
            ok = d.execCommand("copy");
          } catch (e) {
            ok = false;
          }
          host.removeChild(ta);
          if (ok) resolve();
          else reject(new Error("copy not supported"));
        } catch (err) {
          reject(err);
        }
      });
    };
    var clipboard = { writeText: copy };
    try {
      w.navigator.clipboard = clipboard;
    } catch (e) {
      try {
        Object.defineProperty(w.navigator, "clipboard", { value: clipboard });
      } catch (e2) {}
    }
  })();

  // ResizeObserver（Chrome 64）：极简实现，够用于布局回调
  if (typeof w.ResizeObserver === "undefined") {
    w.ResizeObserver = function (cb) {
      this._cb = cb;
      this._targets = [];
    };
    w.ResizeObserver.prototype.observe = function (target) {
      var self = this;
      if (this._targets.indexOf(target) >= 0) return;
      this._targets.push(target);
      var lastW = -1;
      var lastH = -1;
      var check = function () {
        if (self._targets.indexOf(target) < 0) return;
        var w0 = target.offsetWidth;
        var h0 = target.offsetHeight;
        if (w0 !== lastW || h0 !== lastH) {
          lastW = w0;
          lastH = h0;
          try {
            self._cb([{ target: target, contentRect: target.getBoundingClientRect() }], self);
          } catch (e) {}
        }
        setTimeout(check, 250);
      };
      setTimeout(check, 250);
    };
    w.ResizeObserver.prototype.unobserve = function (target) {
      var i = this._targets.indexOf(target);
      if (i >= 0) this._targets.splice(i, 1);
    };
    w.ResizeObserver.prototype.disconnect = function () {
      this._targets = [];
    };
  }

  /* ============================================================
   * 四、CSS 变量兜底：极老内核（无 CSS 自定义属性）时强制浅色纯色主题
   * ============================================================ */
  if (!supports("--x", "1")) {
    var style = d.createElement("style");
    style.textContent =
      "body{background:#f7f8fe !important;color:#1e2433 !important}" +
      ".kratos-card{background:#fff !important;border:1px solid #e5e7eb !important}" +
      "header{background:#fff !important}" +
      ".btn-grad,.nav-active{background:#4f46e5 !important}" +
      ".text-grad{color:#4f46e5 !important;-webkit-text-fill-color:#4f46e5 !important}";
    (d.head || el).appendChild(style);
  }
})();
