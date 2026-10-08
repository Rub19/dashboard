"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { sinceLabel } from "@/lib/discord/security-scan";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, StatTile, Stepper, Switch, useGuildApi } from "../kit";

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
const Amount = ({ n, sym }: { n: number; sym: string }) => (
  <>
    {fmt(n)}
    <span className="ml-1.5 text-sm font-medium text-[var(--text-muted)]">{sym}</span>
  </>
);

/** Jeux et casino (format Keeper) : jeux actifs, mises, cagnotte, meilleurs joueurs et dernières parties. */
export default function ConsoleGames({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<GamesConfig | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [history, setHistory] = useState<GameRecord[] | null>(null);
  const [seed, setSeed] = useState(500);

  const load = useCallback(async () => {
    const [c, o, h] = await Promise.all([
      api<GamesConfig>("/games/config"),
      api<Overview>("/games/overview", { silent: true }),
      api<{ history: GameRecord[] }>("/games/history?limit=15", { silent: true }),
    ]);
    if (c) setCfg(c);
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
      <ConsolePage title="Jeux et casino">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const sym = cfg.currencySymbol ?? ov?.currencySymbol ?? "🪙";

  return (
    <ConsolePage
      title="Jeux et casino"
      actions={
        <Link
          href={`/discord/games?guildId=${guildId}`}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Jouer depuis le site
        </Link>
      }
    >
      {cfg.economyEnabled === false && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Les jeux se misent avec la monnaie du module Économie, qui est désactivé : personne ne peut jouer tant qu&apos;il est coupé.</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Cagnotte" value={<Amount n={ov?.jackpotPool ?? cfg.jackpotPool} sym={sym} />} hint={`${cfg.jackpotContributionPercent} % de chaque mise`} />
        <StatTile label="Parties jouées" value={ov ? fmt(ov.totalGamesPlayed) : "—"} />
        <StatTile label="Misé / redistribué" value={ov ? `${fmt(ov.totalBets)}` : "—"} hint={ov ? `${fmt(ov.totalPayouts)} ${sym} redistribués` : undefined} />
        <StatTile label="Plus gros gain" value={ov?.biggestWin ? <Amount n={ov.biggestWin.amount} sym={sym} /> : "—"} hint={ov?.biggestWin ? `${ov.biggestWin.username} · ${GAME_LABEL[ov.biggestWin.game] ?? ov.biggestWin.game}` : "Aucune partie"} />
      </motion.div>

      <Panel title="Jeux">
        {GAMES.map((g) => (
          <Row key={g.key} label={g.label} hint={g.hint}>
            <div className="flex justify-end">
              <Switch checked={Boolean(cfg[g.key])} onChange={(v) => save({ [g.key]: v })} label={g.label} />
            </div>
          </Row>
        ))}
      </Panel>

      <Panel title="Mises et cagnotte">
        <Row label="Mise">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">de</span>
            <Stepper value={cfg.minBet} min={1} max={cfg.maxBet} step={10} onCommit={(n) => save({ minBet: n })} />
            <span className="text-xs text-[var(--text-muted)]">à</span>
            <Stepper value={cfg.maxBet} min={Math.max(10, cfg.minBet)} max={10000000} step={100} unit={sym} onCommit={(n) => save({ maxBet: n })} />
          </div>
        </Row>
        <Row label="Part versée à la cagnotte" hint="Prélevée sur chaque mise ; la cagnotte tombe sur un Blackjack naturel ou un 777.">
          <Stepper value={cfg.jackpotContributionPercent} min={0} max={10} step={0.5} unit="%" onCommit={(n) => save({ jackpotContributionPercent: n })} />
        </Row>
        <Row label="Alimenter la cagnotte" hint="Ajoute un montant à la cagnotte actuelle.">
          <div className="flex flex-wrap items-center gap-2">
            <Stepper value={seed} min={1} max={1000000} step={100} unit={sym} onCommit={setSeed} />
            <GhostButton onClick={addToJackpot}>Ajouter</GhostButton>
          </div>
        </Row>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Meilleurs joueurs">
          {!ov ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : ov.topWinners.length === 0 ? (
            <EmptyLine>Aucune partie jouée pour l&apos;instant.</EmptyLine>
          ) : (
            <ol>
              {ov.topWinners.slice(0, 10).map((w, i) => (
                <li key={w.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{w.username}</span>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{w.gamesPlayed} parties</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--success)]">+{fmt(w.totalWon)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Dernières parties">
          {!history ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : history.length === 0 ? (
            <EmptyLine>Aucune partie jouée pour l&apos;instant.</EmptyLine>
          ) : (
            <ul>
              {history.map((g) => (
                <li key={g.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[var(--text-primary)]">
                      {g.username} · {GAME_LABEL[g.gameType] ?? g.gameType}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      Mise {fmt(g.bet)} · {sinceLabel(g.timestamp)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: g.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {g.net >= 0 ? "+" : ""}
                    {fmt(g.net)}
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
