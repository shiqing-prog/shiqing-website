import type { Metadata } from "next";
import Link from "next/link";
import SnakeGame from "@/components/games/SnakeGame";
import Game2048 from "@/components/games/Game2048";
import Minesweeper from "@/components/games/Minesweeper";
import TypingTest from "@/components/games/TypingTest";
import Gomoku from "@/components/games/Gomoku";
import Tetris from "@/components/games/Tetris";

export const metadata: Metadata = {
  title: "游戏",
  description: "在线小游戏：贪吃蛇、2048、扫雷、打字测速、五子棋、俄罗斯方块。",
};

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="border-l-4 border-blue-600 pl-3 text-2xl font-bold">🎮 游戏</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        在线小游戏，全部在浏览器本地运行。
      </p>

      <section className="mt-8">
        <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          ⚫⚪ 五子棋（人机）
        </h2>
        <div className="kratos-card p-6">
          <Gomoku />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          🧱 俄罗斯方块
        </h2>
        <div className="kratos-card p-6">
          <Tetris />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          💣 扫雷
        </h2>
        <div className="kratos-card p-6">
          <Minesweeper />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          ⌨️ 打字测速
        </h2>
        <div className="kratos-card p-6">
          <TypingTest />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          🐍 贪吃蛇
        </h2>
        <div className="kratos-card p-6">
          <SnakeGame />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 border-l-4 border-blue-600 pl-3 text-lg font-bold">
          2048
        </h2>
        <div className="kratos-card p-6">
          <Game2048 />
        </div>
      </section>

      <p className="mt-10 text-center text-xs text-gray-400">
        <Link href="/" className="hover:underline">← 返回首页</Link>
      </p>
    </div>
  );
}
