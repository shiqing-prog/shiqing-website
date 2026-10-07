"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import UserAvatar from "./UserAvatar";

interface MentionUser {
  id: string;
  nickname: string;
  avatar?: string | null;
}

interface Props
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
  > {
  value: string;
  onValueChange: (next: string) => void;
}

/**
 * 检测光标前是否正在输入 "@昵称"，返回 "@" 的起始位置与查询串。
 * 允许 @ 出现在行首或空白/标点之后。
 */
function detectMention(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|[\s(（[【,，。;；!！?？])@([A-Za-z0-9_\-\u4e00-\u9fa5]{0,20})$/.exec(
    before
  );
  if (!m) return null;
  const query = m[2];
  return { start: caret - query.length - 1, query };
}

/**
 * 带 @提及自动补全的 textarea。
 * 受控用法：value + onValueChange；可通过 ref 拿到内部 textarea（兼容 MarkdownToolbar 等）。
 */
const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function MentionTextarea(
    { value, onValueChange, onKeyDown: externalKeyDown, ...rest },
    ref
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current!, []);

    const [mention, setMention] = useState<{ start: number; query: string } | null>(
      null
    );
    const [users, setUsers] = useState<MentionUser[]>([]);
    const [active, setActive] = useState(0);
    const queryRef = useRef("");

    const close = useCallback(() => {
      queryRef.current = "";
      setMention(null);
      setUsers([]);
      setActive(0);
    }, []);

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const next = e.target.value;
      onValueChange(next);
      const det = detectMention(next, e.target.selectionStart ?? next.length);
      if (!det || !det.query) {
        close();
        return;
      }
      setMention(det);
      queryRef.current = det.query;
      const q = det.query;
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : { users: [] }))
        .then((d: { users?: MentionUser[] }) => {
          if (queryRef.current !== q) return;
          setUsers(d.users ?? []);
          setActive(0);
        })
        .catch(() => {
          /* 网络失败时静默，不影响输入 */
        });
    }

    function insert(u: MentionUser) {
      if (!mention) return;
      const el = innerRef.current;
      const caret = el?.selectionStart ?? value.length;
      const before = value.slice(0, mention.start);
      const after = value.slice(caret);
      const next = `${before}@${u.nickname} ${after}`;
      onValueChange(next);
      close();
      requestAnimationFrame(() => {
        const pos = before.length + u.nickname.length + 2;
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (mention && users.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((a) => (a + 1) % users.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((a) => (a - 1 + users.length) % users.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insert(users[active]);
          return;
        }
        if (e.key === "Escape") {
          close();
          return;
        }
      }
      externalKeyDown?.(e);
    }

    return (
      <div className="relative">
        <textarea
          {...rest}
          ref={innerRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {mention && users.length > 0 && (
          <ul className="absolute left-0 z-30 mt-1 max-h-56 w-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {users.map((u, i) => (
              <li key={u.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insert(u);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition ${
                    i === active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <UserAvatar
                    nickname={u.nickname}
                    avatar={u.avatar ?? null}
                    size={20}
                  />
                  <span className="truncate">{u.nickname}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

export default MentionTextarea;
