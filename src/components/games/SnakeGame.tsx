"use client";

import { useEffect, useRef, useState } from "react";
import { useHighScore } from "@/lib/useHighScore";

const GRID = 20;
const CELL = 20;
const SPEED = 120;

type Point = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "playing" | "over" | "win">("idle");
  const { best, submit } = useHighScore("snake");

  // 分数变化时更新本地最高分
  useEffect(() => {
    const t = setTimeout(() => submit(score), 0);
    return () => clearTimeout(t);
  }, [score, submit]);
  const gameRef = useRef<{
    snake: Point[];
    dir: Point;
    food: Point;
    timer: ReturnType<typeof setInterval> | null;
  }>({ snake: [], dir: { x: 1, y: 0 }, food: { x: 0, y: 0 }, timer: null });

  function randFood(snake: Point[]): Point | null {
    // 先枚举所有空格再随机取一个：原来的「随机试到不撞为止」在蛇快占满棋盘时
    // 会长时间空转，蛇占满 20×20 时更是死循环
    const free: Point[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    if (free.length === 0) return null;
    return free[Math.floor(Math.random() * free.length)];
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
      const next = randFood(g.snake);
      if (!next) {
        // 蛇占满整个棋盘：通关
        if (g.timer) clearInterval(g.timer);
        g.timer = null;
        setStatus("win");
        draw();
        return;
      }
      g.food = next;
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
    // 刚开局只有 3 节，一定有空格
    g.food = randFood(g.snake) ?? { x: 0, y: 0 };
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
      if (status === "idle") {
        // start() 内部会把方向重置成向右，所以启动后要把这次的方向写回去，
        // 否则第一下方向键等于没按
        start();
        g.dir = d;
        return;
      }
      // 禁止反向
      if (g.snake.length > 1 && g.dir.x + d.x === 0 && g.dir.y + d.y === 0) return;
      g.dir = d;
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
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span>
          分数：<b className="text-blue-600">{score}</b>
        </span>
        <span className="text-gray-500">
          🏆 最高：<b>{best ?? 0}</b>
        </span>
        {status === "over" && <span className="text-red-500">游戏结束</span>}
        {status === "win" && <span className="text-green-600">通关！🎉</span>}
        <button
          onClick={start}
          className="rounded-[2px] bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {status === "playing" ? "重新开始" : "开始游戏"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        className="rounded-[2px] border border-gray-200 shadow-sm dark:border-gray-700"
      />
      <p className="mt-3 text-xs text-gray-500">
        方向键 / WASD 控制，吃到红色食物加分
      </p>
    </div>
  );
}
