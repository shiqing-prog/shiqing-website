"use client";

import { useEffect, useRef, useState } from "react";

const GRID = 20;
const CELL = 20;
const SPEED = 120;

type Point = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "over">("idle");
  const gameRef = useRef<{
    snake: Point[];
    dir: Point;
    food: Point;
    timer: ReturnType<typeof setInterval> | null;
  }>({ snake: [], dir: { x: 1, y: 0 }, food: { x: 0, y: 0 }, timer: null });

  function randFood(snake: Point[]): Point {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
    }
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);
    const g = gameRef.current;
    // 食物
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(
      g.food.x * CELL + CELL / 2,
      g.food.y * CELL + CELL / 2,
      CELL / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    // 蛇
    g.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#007cba" : "#33a4dd";
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function step() {
    const g = gameRef.current;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    // 撞墙
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return gameOver();
    // 撞自己
    if (g.snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
    g.snake.unshift(head);
    if (head.x === g.food.x && head.y === g.food.y) {
      setScore((s) => s + 10);
      g.food = randFood(g.snake);
    } else {
      g.snake.pop();
    }
    draw();
  }

  function gameOver() {
    const g = gameRef.current;
    if (g.timer) clearInterval(g.timer);
    g.timer = null;
    setStatus("over");
  }

  function start() {
    const g = gameRef.current;
    if (g.timer) clearInterval(g.timer);
    g.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    g.dir = { x: 1, y: 0 };
    g.food = randFood(g.snake);
    setScore(0);
    setStatus("playing");
    g.timer = setInterval(step, SPEED);
    draw();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const g = gameRef.current;
      const map: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      // 禁止反向
      if (g.snake.length > 1 && g.dir.x + d.x === 0 && g.dir.y + d.y === 0) return;
      g.dir = d;
      if (status === "idle") start();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const g = gameRef.current;
    draw();
    return () => {
      if (g.timer) clearInterval(g.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span>
          分数：<b className="text-blue-600">{score}</b>
        </span>
        {status === "over" && <span className="text-red-500">游戏结束</span>}
        <button
          onClick={start}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {status === "playing" ? "重新开始" : "开始游戏"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        className="rounded-lg border border-gray-200 shadow-sm dark:border-gray-700"
      />
      <p className="mt-3 text-xs text-gray-500">
        方向键 / WASD 控制，吃到红色食物加分
      </p>
    </div>
  );
}
