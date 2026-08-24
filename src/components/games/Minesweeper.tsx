"use client";

import { useEffect, useRef, useState } from "react";

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type Cell = { mine: boolean; adjacent: number; revealed: boolean; flagged: boolean };

function initBoard(first: { r: number; c: number }): Cell[][] {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
    }))
  );
  // 布雷（避开首点）
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if ((r === first.r && c === first.c) || board[r][c].mine) continue;
    board[r][c].mine = true;
    placed++;
  }
  // 计算相邻雷数
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) n++;
        }
      board[r][c].adjacent = n;
    }
  }
  return board;
}

export default function Minesweeper() {
  const [board, setBoard] = useState<Cell[][]>(() => initBoard({ r: 0, c: 0 }));
  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [time, setTime] = useState(0);
  const startedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flags = board.flat().filter((c) => c.flagged).length;

  useEffect(() => {
    if (status === "won" || status === "lost") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (status === "playing" && !timerRef.current) {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [status]);

  function reset() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startedRef.current = false;
    setTime(0);
    setStatus("ready");
    setBoard(initBoard({ r: 0, c: 0 }));
  }

  function reveal(r: number, c: number) {
    if (status === "won" || status === "lost") return;
    if (board[r][c].revealed || board[r][c].flagged) return;
    let b = board;
    if (!startedRef.current) {
      startedRef.current = true;
      b = initBoard({ r, c });
      setBoard(b);
      setStatus("playing");
    } else if (status === "ready") {
      setStatus("playing");
    }
    // 展开（BFS）
    const next = b.map((row) => row.map((cell) => ({ ...cell })));
    const queue: [number, number][] = [[r, c]];
    while (queue.length) {
      const [cr, cc] = queue.pop()!;
      const cell = next[cr][cc];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      if (cell.mine) {
        setStatus("lost");
        return;
      }
      if (cell.adjacent === 0) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !next[nr][nc].revealed) {
              queue.push([nr, nc]);
            }
          }
      }
    }
    setBoard(next);
    // 胜利判定
    const revealedCount = next.flat().filter((x) => x.revealed && !x.mine).length;
    if (revealedCount === ROWS * COLS - MINES) setStatus("won");
  }

  function toggleFlag(e: React.MouseEvent, r: number, c: number) {
    e.preventDefault();
    if (status === "won" || status === "lost" || board[r][c].revealed) return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    next[r][c].flagged = !next[r][c].flagged;
    setBoard(next);
  }

  const numColor = (n: number) =>
    ["", "text-blue-600", "text-green-600", "text-red-600", "text-purple-600", "text-orange-600"][n] ?? "text-gray-700";

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span>💣 {MINES - flags}</span>
        <span>
          时间：<b className="text-blue-600">{time}s</b>
        </span>
        {status === "won" && <span className="text-green-600">🎉 获胜！</span>}
        {status === "lost" && <span className="text-red-500">💥 踩雷了</span>}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重新开始
        </button>
      </div>
      <div
        className="grid gap-0.5 rounded-lg bg-gray-200 p-1.5 dark:bg-gray-800"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {board.flatMap((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => reveal(r, c)}
              onContextMenu={(e) => toggleFlag(e, r, c)}
              className={`flex h-8 w-8 items-center justify-center rounded text-sm font-bold transition ${
                cell.revealed
                  ? cell.mine
                    ? "bg-red-100 text-red-600 dark:bg-red-950"
                    : "bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600"
              } ${numColor(cell.adjacent)}`}
            >
              {cell.revealed
                ? cell.mine
                  ? "💣"
                  : cell.adjacent || ""
                : cell.flagged
                ? "🚩"
                : ""}
            </button>
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        左键揭开，右键插旗，首次点击必安全
      </p>
    </div>
  );
}
