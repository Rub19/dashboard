"use client";

import { useState } from "react";
import Link from "next/link";
import { useAnimatedSidebar } from "@/components/motion/animated-sidebar";
import { Icon } from "@/lib/icons";
import { Sparkles, Key } from "@/components/icons/ph";
import GameBrandIcon from "@/components/GameBrandIcon";
import RiotTrackerConnectModal from "./RiotTrackerConnectModal";
import { cn } from "@/lib/utils";

export interface RiotTrackerHeaderProps {
  activeGame?: "valorant" | "lol" | "tft";
  onSelectGame?: (game: "valorant" | "lol" | "tft") => void;
  onOpenCoach?: () => void;
  onRiotIdChanged?: (name: string, tag: string) => void;
  currentProfileName?: string;
  currentProfileTag?: string;
}

export default function RiotTrackerHeader({
  activeGame = "valorant",
  onSelectGame,
  onOpenCoach,
  onRiotIdChanged,
  currentProfileName,
  currentProfileTag,
}: RiotTrackerHeaderProps) {
  const { open, setOpen } = useAnimatedSidebar();
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  return (
    <>
      <header
        data-v8-riot-header
        className="w-full shrink-0 border-b border-[var(--panel-border)]/60 bg-[var(--panel-bg)]/85 px-3 py-2.5 sm:px-5 backdrop-blur-xl transition-all"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-rose-500/40 hover:text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shadow-sm"
              title={open ? "Réduire le menu" : "Ouvrir le menu"}
              aria-label="Basculer la barre latérale"
            >
              <Icon name={open ? "sidebar-simple" : "sidebar"} className="h-4 w-4" />
            </button>

            <Link
              href="/"
              className="flex items-center gap-2 outline-none group cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-md">
                <GameBrandIcon name="Valorant" className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wider text-[var(--text-primary)] group-hover:text-rose-400 transition-colors uppercase">
                    #RIOT TRACKER
                  </span>
                  <span className="hidden sm:inline-flex rounded-full border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.2 text-[9px] font-bold text-rose-300">
                    HUB #1
                  </span>
                </div>
                <span className="hidden md:inline text-[10px] font-mono text-[var(--text-muted)]">
                  Serveurs EUW · Live 18ms
                </span>
              </div>
            </Link>
          </div>

          {onSelectGame && (
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-1">
              <button
                type="button"
                onClick={() => onSelectGame("valorant")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                  activeGame === "valorant"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <GameBrandIcon name="Valorant" className="h-3.5 w-3.5" />
                <span>VALORANT</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectGame("lol")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                  activeGame === "lol"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <GameBrandIcon name="League of Legends" className="h-3.5 w-3.5" />
                <span>LoL</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectGame("tft")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                  activeGame === "tft"
                    ? "bg-yellow-600 text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <GameBrandIcon name="Teamfight Tactics" className="h-3.5 w-3.5" />
                <span>TFT</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {currentProfileName && currentProfileTag && (
              <span className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-2.5 py-1 text-xs font-mono font-bold text-[var(--text-primary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{currentProfileName}#{currentProfileTag}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setConnectModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/25 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Gérer l'authentification RSO et les clés API Riot"
            >
              <Key className="h-3.5 w-3.5 text-rose-400" />
              <span>Connexion & APIs</span>
            </button>

            {onOpenCoach && (
              <button
                type="button"
                onClick={onOpenCoach}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Coach IA</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <RiotTrackerConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onRiotIdChanged={onRiotIdChanged}
      />
    </>
  );
}
