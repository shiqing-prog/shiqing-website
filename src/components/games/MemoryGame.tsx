"use client";

import { useState } from "react";

const EMOJIS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🥝", "🍉"];

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function initCards(): Card[] {
  const pairs = [...EMOJIS, ...EMOJIS];
  // Fisher-Yates 洗牌
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>(initCards);
  const [first, setFirst] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const finished = cards.every((c) => c.matched);

  function flip(id: number) {
    if (lock) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;
    const next = cards.map((c, i) => (i === id ? { ...c, flipped: true } : c));
    setCards(next);

    if (first === null) {
      setFirst(id);
    } else {
      setMoves((m) => m + 1);
      setLock(true);
      if (next[first].emoji === next[id].emoji) {
        // 配对成功
        setCards(
          next.map((c, i) =>
            i === first || i === id ? { ...c, matched: true, flipped: true } : c
          )
        );
        setFirst(null);
        setLock(false);
      } else {
        // 翻转回去
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === first || i === id ? { ...c, flipped: false } : c))
          );
          setFirst(null);
          setLock(false);
        }, 700);
      }
    }
  }

  function reset() {
    setCards(initCards());
    setFirst(null);
    setMoves(0);
    setLock(false);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span>
          步数：<b className="text-blue-600">{moves}</b>
        </span>
        {finished && <span className="text-green-600">🎉 全部配对成功！</span>}
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          重新开始
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => flip(c.id)}
            className={`flex h-16 w-16 items-center justify-center rounded-lg text-3xl transition sm:h-20 sm:w-20 ${
              c.flipped || c.matched
                ? c.matched
                  ? "bg-green-100 dark:bg-green-950"
                  : "bg-white shadow dark:bg-gray-800"
                : "bg-blue-500 text-transparent hover:bg-blue-600 dark:bg-blue-700"
            }`}
          >
            {c.flipped || c.matched ? c.emoji : "?"}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">翻牌配对相同图案（8 对 16 张）</p>
    </div>
  );
}
