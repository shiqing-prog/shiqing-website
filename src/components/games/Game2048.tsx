"use client";

import { useCallback, useEffect, useState } from "react";

const SIZE = 4;
const EMPTY: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

function newTile(board: number[][]): number[][] {
  const empty: [number, number][] = [];
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function moveRow(row: number[], dir: "left" | "right"): { row: number[]; gained: number } {
  const cells = dir === "left" ? [...row] : [...row].reverse();
  const filtered = cells.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      gained += filtered[i] * 2;
      i++;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  if (dir === "right") merged.reverse();
  return { row: merged, gained };
}

function moveBoard(board: number[][], dir: "up" | "down" | "left" | "right"): { board: number[][]; gained: number } {
  let next = board.map((r) => [...r]);
  let gained = 0;
  if (dir === "left" || dir === "right") {
    next = next.map((r) => {
      const { row, gained: g } = moveRow(r, dir);
      gained += g;
      return row;
    });
  } else {
    for (let c = 0; c < SIZE; c++) {
      const col = next.map((r) => r[c]);
      const { row, gained: g } = moveRow(col, dir === "up" ? "left" : "right");
      gained += g;
      for (let r = 0; r < SIZE; r++) next[r][c] = row[r];
    }
  }
  return { board: next, gained };
}

export default function Game2048() {
  const [board, setBoard] = useState<number[][]>(EMPTY);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  const start = useCallback(() => {
    setScore(0);
    setOver(false);
    setBoard(newTile(newTile(EMPTY)));
  }, []);

  useEffect(() => {
    // 初始化棋盘
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
  }, [start]);

  const keyMove = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (over) return;
    setBoard((prev) => {
      const { board: moved, gained } = moveBoard(prev, dir);
      const changed = JSON.stringify(moved) !== JSON.stringify(prev);
      const next = changed ? newTile(moved) : moved;
      setScore((s) => s + gained);
      // 检查是否还有可移动
      const canMove =
        next.some((r) => r.some((v) => v === 0)) ||
        next.some((r, i) =>
          r.some((v, j) => (j + 1 < SIZE && r[j + 1] === v) || (i + 1 < SIZE && next[i + 1][j] === v))
        );
      if (!canMove) setOver(true);
      return next;
    });
  }, [over]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        keyMove(dir);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyMove]);

  const tileColor = (v: number) => {
    const map: Record<number, string> = {
      2: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
      4: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      8: "bg-blue-300 text-white",
      16: "bg-blue-500 text-white",
      32: "bg-blue-600 text-white",
      64: "bg-cyan-600 text-white",
      128: "bg-cyan-700 text-white",
      256: "bg-emerald-600 text-white",
      512: "bg-emerald-700 text-white",
      1024: "bg-amber-500 text-white",
      2048: "bg-amber-600 text-white",
    };
    return map[v] ?? "bg-gray-700 text-white";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span>
          分数：<b className="text-blue-600">{score}</b>
        </span>
        {over && <span className="text-red-500">没有可移动的了</span>}
        <button
          onClick={start}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重新开始
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 rounded-lg bg-gray-200 p-2 dark:bg-gray-800">
        {board.flat().map((v, i) => (
          <div
            key={i}
            className={`flex h-16 w-16 items-center justify-center rounded-md text-xl font-bold transition sm:h-20 sm:w-20 ${
              v ? tileColor(v) : "bg-gray-100/60 dark:bg-gray-700/40"
            }`}
          >
            {v || ""}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">方向键移动，相同数字合并</p>
    </div>
  );
}
