"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
            className={`relative isolate whitespace-nowrap rounded-[var(--inset-radius)] border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 active:scale-[0.97] ${
              game.id === selected?.id
                ? "border-transparent text-[var(--accent-contrast)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {game.id === selected?.id && (
              <motion.span
                layoutId="game-tab"
                transition={{ type: "spring", stiffness: 450, damping: 43 }}
                className="absolute -inset-px -z-10 rounded-[inherit] bg-[var(--accent-primary)] shadow-sm"
              />
            )}
            {game.label}
          </button>
        ))}
      </div>
      {selected ? (
        <div key={selected.id} className="rise-in flex min-h-0 flex-1 flex-col">
          <GameFrame src={selected.src} title={selected.label} />
        </div>
      ) : null}
    </div>
  );
}
