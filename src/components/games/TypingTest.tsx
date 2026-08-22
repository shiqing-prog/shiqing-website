"use client";

import { useEffect, useRef, useState } from "react";

const SENTENCES = [
  "生活不止眼前的苟且，还有诗和远方的田野。",
  "编程是门艺术，代码即诗篇。",
  "今天也是元气满满的一天。",
  "不积跬步，无以至千里；不积小流，无以成江海。",
  "代码如人生，一次只做好一件事。",
  "路漫漫其修远兮，吾将上下而求索。",
  "把复杂的事情简单化，把简单的事情重复化。",
  "世界那么大，我想去看看。",
];

export default function TypingTest() {
  const [sentence, setSentence] = useState(SENTENCES[0]);
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<{ wpm: number; acc: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function restart() {
    setSentence(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    setInput("");
    setStartTime(null);
    setFinished(false);
    setResults(null);
    inputRef.current?.focus();
  }

  function onChange(v: string) {
    setInput(v);
    if (!startTime && v.length > 0) setStartTime(Date.now());
    if (v.length === sentence.length) {
      const elapsed = (Date.now() - (startTime ?? Date.now())) / 1000 / 60;
      const correct = sentence.split("").filter((ch, i) => ch === v[i]).length;
      const acc = Math.round((correct / sentence.length) * 100);
      const wpm = elapsed > 0 ? Math.round(correct / 5 / elapsed) : 0;
      setResults({ wpm, acc });
      setFinished(true);
    }
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex w-full max-w-xl flex-col items-center">
      {!finished ? (
        <>
          <p className="mb-4 text-center text-lg leading-relaxed text-gray-700 dark:text-gray-200">
            {sentence.split("").map((ch, i) => {
              if (i >= input.length) return <span key={i}>{ch}</span>;
              const ok = ch === input[i];
              return (
                <span key={i} className={ok ? "text-blue-600 dark:text-blue-400" : "text-red-500"}>
                  {ch}
                </span>
              );
            })}
          </p>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            placeholder="开始输入…"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500">输入速度：{input.length} / {sentence.length}</p>
        </>
      ) : (
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{results?.wpm} WPM</p>
          <p className="mt-1 text-sm text-gray-500">正确率 {results?.acc}%</p>
          <button
            onClick={restart}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            再来一次
          </button>
        </div>
      )}
    </div>
  );
}
