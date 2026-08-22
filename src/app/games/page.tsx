import type { Metadata } from "next";
import Link from "next/link";
import SnakeGame from "@/components/games/SnakeGame";
import Game2048 from "@/components/games/Game2048";

export const metadata: Metadata = {
  title: "游戏",
  description: "在线小游戏：贪吃蛇、2048。",
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
