"use client";

import { useState } from "react";
import GameFrame from "@/components/games/GameFrame";
import { useI18n } from "@/lib/hooks/useI18n";

type GameOption = {
  id: string;
  label: string;
  src: string;
};

export default function GameSelector({ games }: { games: GameOption[] }) {
  const i18n = useI18n();
  const [selectedId, setSelectedId] = useState(games[0]?.id);
  const selected = games.find((game) => game.id === selectedId) ?? games[0];

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2">
      <div
        role="tablist"
        aria-label={i18n("gamesSwitcherLabel", "Choisir un jeu")}
        className="flex shrink-0 gap-1.5 overflow-x-auto"
      >
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            role="tab"
            aria-selected={game.id === selected?.id}
            onClick={() => setSelectedId(game.id)}
            className={`whitespace-nowrap rounded-[var(--inset-radius)] border px-3 py-1.5 text-sm font-medium transition-colors ${
              game.id === selected?.id
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                : "border-[var(--panel-border)] bg-black/20 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {game.label}
          </button>
        ))}
      </div>
      {selected ? <GameFrame src={selected.src} title={selected.label} /> : null}
    </div>
  );
}
