"use client";

import { useCallback, useState } from "react";

type Cell = "" | "X" | "O";

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOf(b: Cell[]): Cell | "draw" | null {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every((x) => x) ? "draw" : null;
}

/** 极小化极大：AI 执 O，玩家执 X */
function minimax(
  b: Cell[],
  player: Cell,
  depth: number
): { score: number; move: number } {
  const w = winnerOf(b);
  if (w === "O") return { score: 10 - depth, move: -1 };
  if (w === "X") return { score: depth - 10, move: -1 };
  if (w === "draw") return { score: 0, move: -1 };

  const results: { score: number; move: number }[] = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = player;
    const r = minimax(b, player === "O" ? "X" : "O", depth + 1);
    results.push({ score: r.score, move: i });
    b[i] = "";
  }
  return player === "O"
    ? results.reduce((a, c) => (c.score > a.score ? c : a))
    : results.reduce((a, c) => (c.score < a.score ? c : a));
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(""));
  const [msg, setMsg] = useState("你先手（X），点击格子落子");
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(""));
    setMsg("你先手（X），点击格子落子");
    setBusy(false);
  }, []);

  function place(i: number) {
    if (busy || board[i]) return;
    const next = [...board];
    next[i] = "X";
    const w = winnerOf(next);
    if (w) {
      setBoard(next);
      setMsg(w === "X" ? "🎉 你赢了！" : w === "draw" ? "平局" : "AI 获胜");
      return;
    }
    setBoard(next);
    setBusy(true);
    setMsg("AI 思考中…");
    setTimeout(() => {
      const work = [...next];
      const { move } = minimax(work, "O", 0);
      if (move >= 0) work[move] = "O";
      const w2 = winnerOf(work);
      setBoard(work);
      setBusy(false);
      setMsg(
        w2 === "O" ? "AI 获胜，再来一局？" : w2 === "draw" ? "平局，势均力敌" : "轮到你了（X）"
      );
    }, 260);
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{msg}</p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => place(i)}
            disabled={busy || Boolean(c)}
            className={`flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold transition sm:h-20 sm:w-20 ${
              c === "X"
                ? "bg-indigo-500 text-white"
                : c === "O"
                  ? "bg-rose-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white"
      >
        重新开始
      </button>
    </div>
  );
}
