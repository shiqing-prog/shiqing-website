"use client";

import { useState } from "react";
import { useHighScore } from "@/lib/useHighScore";

const inputCls =
  "w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900";

export default function GuessNumber() {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState("");
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState("猜一个 1-100 的数字");
  const [done, setDone] = useState(false);
  // 次数越少越好
  const { best, submit } = useHighScore("guess", { lowIsBetter: true });

  function restart() {
    setTarget(Math.floor(Math.random() * 100) + 1);
    setGuess("");
    setTries(0);
    setHint("猜一个 1-100 的数字");
    setDone(false);
  }

  function check(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(guess);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      setHint("请输入 1-100 的整数");
      return;
    }
    const t = tries + 1;
    setTries(t);
    setGuess("");
    if (n === target) {
      setHint(`🎉 猜中了！共 ${t} 次`);
      setDone(true);
      submit(t);
    } else if (n < target) {
      setHint(`📈 ${n} 小了`);
    } else {
      setHint(`📉 ${n} 大了`);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-gray-600 dark:text-gray-300">{hint}</p>
      <p className="mt-2 text-xs text-gray-400">
        已猜 {tries} 次 · 🏆 最佳 {best !== null ? `${best} 次` : "—"}
      </p>
      <form onSubmit={check} className="mt-4 flex items-center gap-2">
        <input
          className={inputCls}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="输入数字"
          disabled={done}
          inputMode="numeric"
        />
        <button
          type="submit"
          disabled={done}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          猜！
        </button>
      </form>
      <button
        type="button"
        onClick={restart}
        className="mt-4 rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        换一个数字
      </button>
    </div>
  );
}
