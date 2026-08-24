"use client";

import { useEffect, useRef, useState } from "react";

const COLS = 10;
const ROWS = 20;
const SHAPES: { cells: number[][]; color: string }[] = [
  { cells: [[1, 1, 1, 1]], color: "bg-cyan-500" }, // I
  { cells: [[1, 1], [1, 1]], color: "bg-yellow-400" }, // O
  { cells: [[0, 1, 0], [1, 1, 1]], color: "bg-purple-500" }, // T
  { cells: [[1, 0], [1, 1], [0, 1]], color: "bg-green-500" }, // S
  { cells: [[0, 1], [1, 1], [1, 0]], color: "bg-red-500" }, // Z
  { cells: [[1, 0, 0], [1, 1, 1]], color: "bg-blue-500" }, // J
  { cells: [[0, 0, 1], [1, 1, 1]], color: "bg-orange-500" }, // L
];

type Piece = { shape: number[][]; color: string; x: number; y: number };

function randomPiece(): Piece {
  const p = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { shape: p.cells, color: p.color, x: Math.floor((COLS - p.cells[0].length) / 2), y: 0 };
}

function rotate(shape: number[][]): number[][] {
  const h = shape.length;
  const w = shape[0].length;
  const out: number[][] = Array.from({ length: w }, () => Array(h).fill(0));
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out[c][h - 1 - r] = shape[r][c];
  return out;
}

function collides(grid: (string | 0)[][], piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const gx = piece.x + c;
      const gy = piece.y + r;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx] !== 0) return true;
    }
  return false;
}

export default function Tetris() {
  const [grid, setGrid] = useState<(string | 0)[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [piece, setPiece] = useState<Piece>(() => randomPiece());
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const speedRef = useRef(600);
  const pieceRef = useRef(piece);
  const gridRef = useRef(grid);
  const scoreRef = useRef(score);

  // 渲染后同步 ref（供定时器回调读取最新状态）
  useEffect(() => {
    pieceRef.current = piece;
    gridRef.current = grid;
    scoreRef.current = score;
  });

  function merge(g: (string | 0)[][], p: Piece): (string | 0)[][] {
    const next = g.map((row) => [...row]);
    for (let r = 0; r < p.shape.length; r++)
      for (let c = 0; c < p.shape[r].length; c++)
        if (p.shape[r][c]) {
          const gy = p.y + r;
          if (gy < 0) continue;
          next[gy][p.x + c] = p.color;
        }
    return next;
  }

  function spawn() {
    const p = randomPiece();
    if (collides(gridRef.current, p)) {
      setOver(true);
      return;
    }
    setPiece(p);
  }

  function drop() {
    const g = gridRef.current;
    const p = pieceRef.current;
    const moved = { ...p, y: p.y + 1 };
    if (collides(g, moved)) {
      // 固定当前方块
      const merged = merge(g, p);
      // 消行
      const kept = merged.filter((row) => row.some((v) => v === 0));
      const cleared = ROWS - kept.length;
      while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0));
      const newGrid = kept;
      gridRef.current = newGrid;
      setGrid(newGrid);
      if (cleared > 0) {
        const add = [0, 100, 300, 500, 800][cleared] ?? 1000;
        scoreRef.current += add;
        setScore(scoreRef.current);
        speedRef.current = Math.max(150, speedRef.current - cleared * 20);
      }
      spawn();
    } else {
      setPiece(moved);
    }
  }

  function move(dx: number) {
    if (over || paused) return;
    const p = pieceRef.current;
    const moved = { ...p, x: p.x + dx };
    if (!collides(gridRef.current, moved)) setPiece(moved);
  }

  function hardDrop() {
    let p = pieceRef.current;
    while (!collides(gridRef.current, { ...p, y: p.y + 1 })) {
      p = { ...p, y: p.y + 1 };
    }
    setPiece(p);
    drop();
  }

  function rot() {
    if (over || paused) return;
    const p = pieceRef.current;
    const moved = { ...p, shape: rotate(p.shape) };
    if (!collides(gridRef.current, moved)) setPiece(moved);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (!over && !paused) drop();
    }, speedRef.current);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, paused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, () => void> = {
        ArrowLeft: () => move(-1),
        ArrowRight: () => move(1),
        ArrowDown: () => drop(),
        ArrowUp: () => rot(),
        " ": () => hardDrop(),
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, paused]);

  // 渲染：网格 + 当前方块
  const display = grid.map((row) => [...row]);
  const p = piece;
  for (let r = 0; r < p.shape.length; r++)
    for (let c = 0; c < p.shape[r].length; c++)
      if (p.shape[r][c] && p.y + r >= 0) display[p.y + r][p.x + c] = p.color;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div
        className="grid gap-px rounded-lg bg-gray-200 p-1 dark:bg-gray-800"
        style={{ gridTemplateColumns: `repeat(${COLS}, 20px)` }}
      >
        {display.flatMap((row, r) =>
          row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className={`h-5 w-5 rounded-sm ${v === 0 ? "bg-white/70 dark:bg-gray-900/70" : v}`}
            />
          ))
        )}
      </div>
      <div className="flex flex-col items-center gap-2 text-sm">
        <div>
          分数：<b className="text-blue-600">{score}</b>
        </div>
        {over && <span className="text-red-500">游戏结束</span>}
        {paused && <span className="text-gray-500">已暂停</span>}
        <button
          onClick={() => setPaused((p) => !p)}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {paused ? "继续" : "暂停"}
        </button>
        <button
          onClick={() => {
            setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
            setScore(0);
            setOver(false);
            speedRef.current = 600;
            spawn();
          }}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重新开始
        </button>
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => move(-1)} className="btn-tool px-3 py-1">←</button>
          <button onClick={rot} className="btn-tool px-3 py-1">↻</button>
          <button onClick={() => move(1)} className="btn-tool px-3 py-1">→</button>
          <button onClick={hardDrop} className="btn-tool px-3 py-1">↓</button>
        </div>
        <p className="text-xs text-gray-400">方向键移动/旋转，空格下落</p>
      </div>
    </div>
  );
}
