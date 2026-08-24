"use client";

import { useState } from "react";

const N = 15;
type Board = (0 | 1 | 2)[][]; // 0空 1黑(玩家) 2白(AI)

function init(): Board {
  return Array.from({ length: N }, () => Array(N).fill(0) as (0 | 1 | 2)[]);
}

function checkWin(board: Board, r: number, c: number, player: 1 | 2): boolean {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (const s of [1, -1]) {
      let nr = r + dr * s;
      let nc = c + dc * s;
      while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === player) {
        count++;
        nr += dr * s;
        nc += dc * s;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

function evalPoint(board: Board, r: number, c: number, player: 1 | 2): number {
  // 沿四个方向统计连子 + 两端空位
  let score = 0;
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    let open = 0;
    for (const s of [1, -1]) {
      let nr = r + dr * s;
      let nc = c + dc * s;
      while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === player) {
        count++;
        nr += dr * s;
        nc += dc * s;
      }
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === 0) open++;
    }
    if (count >= 5) score += 100000;
    else if (count === 4 && open === 2) score += 10000;
    else if (count === 4 && open === 1) score += 5000;
    else if (count === 3 && open === 2) score += 1000;
    else if (count === 3 && open === 1) score += 300;
    else if (count === 2 && open === 2) score += 100;
  }
  return score;
}

function aiMove(board: Board): [number, number] {
  let best: [number, number] | null = null;
  let bestScore = -Infinity;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] !== 0) continue;
      // 只考虑已有棋子附近的空位
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++)
        for (let dc = -2; dc <= 2 && !near; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] !== 0) near = true;
        }
      if (!near) continue;
      const offense = evalPoint(board, r, c, 2); // AI 进攻
      const defense = evalPoint(board, r, c, 1); // 防守玩家
      const score = offense * 1.05 + defense;
      if (score > bestScore) {
        bestScore = score;
        best = [r, c];
      }
    }
  }
  return best ?? [Math.floor(N / 2), Math.floor(N / 2)];
}

export default function Gomoku() {
  const [board, setBoard] = useState<Board>(init);
  const [winner, setWinner] = useState<0 | 1 | 2 | null>(null);
  const [thinking, setThinking] = useState(false);

  function place(r: number, c: number) {
    if (winner || thinking || board[r][c] !== 0) return;
    const next = board.map((row) => [...row]);
    next[r][c] = 1;
    if (checkWin(next, r, c, 1)) {
      setBoard(next);
      setWinner(1);
      return;
    }
    setBoard(next);
    setThinking(true);
    setTimeout(() => {
      const [ar, ac] = aiMove(next);
      const after = next.map((row) => [...row]);
      after[ar][ac] = 2;
      setBoard(after);
      setThinking(false);
      if (checkWin(after, ar, ac, 2)) setWinner(2);
    }, 60);
  }

  function reset() {
    setBoard(init());
    setWinner(null);
    setThinking(false);
  }

  const stone = (v: 0 | 1 | 2) =>
    v === 1
      ? "bg-gray-900 dark:bg-gray-100"
      : v === 2
      ? "bg-white border-2 border-gray-400"
      : "hover:bg-blue-100 dark:hover:bg-blue-950";

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span>⚫ 你（先手）</span>
        <span>⚪ AI</span>
        {winner === 1 && <span className="text-green-600">🎉 你赢了！</span>}
        {winner === 2 && <span className="text-red-500">AI 获胜</span>}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重新开始
        </button>
      </div>
      <div
        className="grid gap-0.5 rounded-lg bg-amber-700/60 p-1.5 dark:bg-amber-900/50"
        style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}
      >
        {board.flatMap((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => place(r, c)}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition sm:h-7 sm:w-7 ${stone(v)}`}
            />
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">点击棋盘落子，五子连珠获胜</p>
    </div>
  );
}
