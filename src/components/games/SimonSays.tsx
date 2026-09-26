"use client";

import { useCallback, useRef, useState } from "react";
import { useHighScore } from "@/lib/useHighScore";

const COLORS = [
  { key: 0, cls: "bg-emerald-500", active: "bg-emerald-300", tone: 329.63 },
  { key: 1, cls: "bg-rose-500", active: "bg-rose-300", tone: 440 },
  { key: 2, cls: "bg-amber-500", active: "bg-amber-300", tone: 554.37 },
  { key: 3, cls: "bg-sky-500", active: "bg-sky-300", tone: 659.25 },
];

type Phase = "idle" | "showing" | "input";

export default function SimonSays() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("点击「开始」后记住闪烁顺序，再依次点击");
  // 分数：完成的回合数（越大越好）
  const { best, submit } = useHighScore("simon");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** 简短的按键音（WebAudio，无需资源文件） */
  const beep = useCallback((freq: number, ms = 260) => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.06;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
      setTimeout(() => void ctx.close(), ms + 60);
    } catch {
      /* 无音频环境忽略 */
    }
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** 播放序列 */
  const play = useCallback(
    (seq: number[]) => {
      clearTimers();
      setPhase("showing");
      setStep(0);
      const gap = Math.max(620 - seq.length * 25, 300);
      seq.forEach((val, i) => {
        timers.current.push(
          setTimeout(() => {
            setLit(val);
            beep(COLORS[val].tone);
          }, i * gap)
        );
        timers.current.push(
          setTimeout(() => setLit(null),
            i * gap + gap * 0.6)
        );
      });
      timers.current.push(
        setTimeout(
          () => {
            setPhase("input");
            setMsg(`第 ${seq.length} 回合：请按顺序点击 ${seq.length} 个颜色`);
          },
          seq.length * gap + 120
        )
      );
    },
    [beep]
  );

  const nextRound = useCallback(() => {
    const next = [...sequence, Math.floor(Math.random() * 4)];
    setSequence(next);
    play(next);
  }, [sequence, play]);

  function start() {
    clearTimers();
    setSequence([]);
    setStep(0);
    setMsg("准备…");
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    timers.current.push(setTimeout(() => play(first), 350));
  }

  function press(idx: number) {
    if (phase !== "input") return;
    beep(COLORS[idx].tone, 180);
    setLit(idx);
    setTimeout(() => setLit(null), 160);

    if (sequence[step] !== idx) {
      submit(Math.max(sequence.length - 1, 0));
      setPhase("idle");
      setMsg(
        `❌ 顺序错误！你完成了 ${Math.max(sequence.length - 1, 0)} 个回合，再来一次？`
      );
      setSequence([]);
      return;
    }
    if (step + 1 === sequence.length) {
      // 本回合通过
      submit(sequence.length);
      setMsg(`✅ 第 ${sequence.length} 回合通过！准备下一回合…`);
      setPhase("showing");
      timers.current.push(setTimeout(() => nextRound(), 700));
      return;
    }
    setStep(step + 1);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-4 text-sm">
        <span>
          回合：<b className="text-blue-600">{sequence.length}</b>
        </span>
        {best !== null && (
          <span className="text-gray-500">
            最佳：<b className="text-amber-600">{best}</b> 回合
          </span>
        )}
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {phase === "idle" ? "开始" : "重新开始"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-label={`颜色 ${c.key + 1}`}
            onClick={() => press(c.key)}
            disabled={phase !== "input"}
            className={`h-24 w-24 rounded-2xl transition duration-150 disabled:cursor-not-allowed sm:h-28 sm:w-28 ${
              lit === c.key ? c.active : c.cls
            } ${phase === "input" ? "hover:opacity-90 active:scale-95" : "opacity-90"}`}
          />
        ))}
      </div>

      <p className="mt-4 max-w-sm text-center text-xs text-gray-500 dark:text-gray-400">
        {msg}
      </p>
      <p className="mt-2 text-xs text-gray-400">每通过一回合序列加长一个，顺序记错即结束</p>
    </div>
  );
}
