"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { CoinBadge } from "./ConsoleEconomy";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Stepper, Switch, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type GamesConfig = {
  enabled: boolean;
  minBet: number;
  maxBet: number;
  blackjackEnabled: boolean;
  rouletteEnabled: boolean;
  diceEnabled: boolean;
  dailySpinEnabled: boolean;
  jackpotPool: number;
  jackpotContributionPercent: number;
  currencySymbol?: string;
  economyEnabled?: boolean;
};
type GameRecord = { id: string; username: string; gameType: string; bet: number; net: number; won: boolean; detail: string; timestamp: string };
type Overview = {
  jackpotPool: number;
  totalGamesPlayed: number;
  totalBets: number;
  totalPayouts: number;
  biggestWin: { username: string; amount: number; game: string } | null;
  topWinners: Array<{ userId: string; username: string; totalWon: number; gamesPlayed: number }>;
  currencySymbol?: string;
  economyEnabled?: boolean;
};

const GAME_LABEL: Record<string, string> = { blackjack: "Blackjack", roulette: "Roulette", dice: "Dés", spin: "Roue" };
const GAMES: Array<{ key: keyof GamesConfig; label: string; hint: string }> = [
  { key: "blackjackEnabled", label: "Blackjack", hint: "Commande /blackjack contre le croupier." },
  { key: "rouletteEnabled", label: "Roulette", hint: "Commande /roulette : couleur, parité ou numéro." },
  { key: "diceEnabled", label: "Dés", hint: "Commande /dice, seul ou en duel." },
  { key: "dailySpinEnabled", label: "Roue quotidienne", hint: "Un tour gratuit par jour avec /casino daily." },
];
const fmt = (n: number) => n.toLocaleString("fr-FR");
type Coin = { sym: string; iconUrl: string | null };
const Amount = ({ n, coin, size = 16 }: { n: number; coin: Coin; size?: number }) => (
  <span className="inline-flex items-center gap-1.5">
    <span>{fmt(n)}</span>
    <CoinBadge sym={coin.sym} iconUrl={coin.iconUrl} size={size} />
  </span>
);

/** Jeux et casino (format Keeper) : jeux actifs, mises, cagnotte, meilleurs joueurs et dernières parties. */
export default function ConsoleGames({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<GamesConfig | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [history, setHistory] = useState<GameRecord[] | null>(null);
  const [seed, setSeed] = useState(500);
  const [eco, setEco] = useState<{ currencySymbol?: string; currencyCustomIconUrl?: string | null } | null>(null);

  const load = useCallback(async () => {
    const [c, o, h, e] = await Promise.all([
      api<GamesConfig>("/games/config"),
      api<Overview>("/games/overview", { silent: true }),
      api<{ history: GameRecord[] }>("/games/history?limit=15", { silent: true }),
      api<{ config: { currencySymbol?: string; currencyCustomIconUrl?: string | null } }>("/economy/config", { silent: true }),
    ]);
    if (c) setCfg(c);
    if (e) setEco(e.config);
    if (o) setOv(o);
    setHistory(h?.history ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<GamesConfig>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: GamesConfig }>("/games/config", { method: "PATCH", json: patch });
    if (r) setCfg((c) => (c ? { ...c, ...r.config } : r.config));
    else void load();
  };
  const addToJackpot = async () => {
    const r = await api<{ jackpotPool: number }>("/games/jackpot/seed", { method: "POST", json: { amount: seed } });
    if (r) {
      setCfg((c) => (c ? { ...c, jackpotPool: r.jackpotPool } : c));
      setOv((o) => (o ? { ...o, jackpotPool: r.jackpotPool } : o));
    }
  };

  if (!cfg) {
    return (
      <ConsolePage title={tx("Jeux et casino")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const coin: Coin = { sym: eco?.currencySymbol ?? cfg.currencySymbol ?? ov?.currencySymbol ?? "🪙", iconUrl: eco?.currencyCustomIconUrl ?? null };
  const coinIcon = <CoinBadge sym={coin.sym} iconUrl={coin.iconUrl} size={14} />;

  return (
    <ConsolePage
      title={tx("Jeux et casino")}
      actions={
        <Link
          href={`/discord/games?guildId=${guildId}`}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          {tx("Jouer depuis le site")}
        </Link>
      }
    >
      {cfg.economyEnabled === false && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Les jeux se misent avec la monnaie du module Économie, qui est désactivé : personne ne peut jouer tant qu'il est coupé.")}</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("Cagnotte")} value={<Amount n={ov?.jackpotPool ?? cfg.jackpotPool} coin={coin} />} hint={tx("{jackpotContributionPercent} % de chaque mise", { jackpotContributionPercent: cfg.jackpotContributionPercent })} />
        <StatTile label={tx("Parties jouées")} value={ov ? fmt(ov.totalGamesPlayed) : "—"} />
        <StatTile label={tx("Misé / redistribué")} value={ov ? `${fmt(ov.totalBets)}` : "—"} hint={ov ? <span className="inline-flex items-center gap-1"><Amount n={ov.totalPayouts} coin={coin} size={13} /> {tx("redistribués")}</span> : undefined} />
        <StatTile label={tx("Plus gros gain")} value={ov?.biggestWin ? <Amount n={ov.biggestWin.amount} coin={coin} /> : "—"} hint={ov?.biggestWin ? `${ov.biggestWin.username} · ${GAME_LABEL[ov.biggestWin.game] ?? ov.biggestWin.game}` : tx("Aucune partie")} />
      </motion.div>

      <Panel title={tx("Jeux")}>
        {GAMES.map((g) => (
          <Row key={g.key} label={g.label} hint={g.hint}>
            <div className="flex justify-end">
              <Switch checked={Boolean(cfg[g.key])} onChange={(v) => save({ [g.key]: v })} label={g.label} />
            </div>
          </Row>
        ))}
      </Panel>

      <Panel title={tx("Mises et cagnotte")}>
        <Row label={tx("Mise")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">{tx("de")}</span>
            <Stepper value={cfg.minBet} min={1} max={cfg.maxBet} step={10} onCommit={(n) => save({ minBet: n })} />
            <span className="text-xs text-[var(--text-muted)]">à</span>
            <Stepper value={cfg.maxBet} min={Math.max(10, cfg.minBet)} max={10000000} step={100} unit={coinIcon} onCommit={(n) => save({ maxBet: n })} />
          </div>
        </Row>
        <Row label={tx("Part versée à la cagnotte")} hint={tx("Prélevée sur chaque mise ; la cagnotte tombe sur un Blackjack naturel ou un 777.")}>
          <Stepper value={cfg.jackpotContributionPercent} min={0} max={10} step={0.5} unit="%" onCommit={(n) => save({ jackpotContributionPercent: n })} />
        </Row>
        <Row label={tx("Alimenter la cagnotte")} hint={cfg.enabled && cfg.economyEnabled !== false ? tx("Ajoute un montant à la cagnotte actuelle (plafond : 10 000 000).") : tx("Active le casino et l'économie pour alimenter la cagnotte.")}>
          <div className="flex flex-wrap items-center gap-2">
            <Stepper value={seed} min={1} max={1000000} step={100} unit={coinIcon} onCommit={setSeed} disabled={!cfg.enabled || cfg.economyEnabled === false} />
            <GhostButton onClick={addToJackpot} disabled={!cfg.enabled || cfg.economyEnabled === false}>
              {tx("Ajouter")}
            </GhostButton>
          </div>
        </Row>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={tx("Meilleurs joueurs")}>
          {!ov ? (
            <EmptyLine>{tx("Chargement…")}</EmptyLine>
          ) : ov.topWinners.length === 0 ? (
            <EmptyLine>{tx("Aucune partie jouée pour l'instant.")}</EmptyLine>
          ) : (
            <ol>
              {ov.topWinners.slice(0, 10).map((w, i) => (
                <li key={w.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{w.username}</span>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{w.gamesPlayed} {" "}{tx("parties")}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--success)]">+<Amount n={w.totalWon} coin={coin} size={13} /></span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={tx("Dernières parties")}>
          {!history ? (
            <EmptyLine>{tx("Chargement…")}</EmptyLine>
          ) : history.length === 0 ? (
            <EmptyLine>{tx("Aucune partie jouée pour l'instant.")}</EmptyLine>
          ) : (
            <ul>
              {history.map((g) => (
                <li key={g.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[var(--text-primary)]">
                      {g.username} · {GAME_LABEL[g.gameType] ?? g.gameType}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {tx("Mise")}{" "} {fmt(g.bet)} · {sinceLabel(g.timestamp)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: g.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {g.net >= 0 ? "+" : ""}
                    <Amount n={g.net} coin={coin} size={13} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </ConsolePage>
  );
}
