"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "@/components/icons/ph";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, Panel, RoleAdder, Row, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";

type EcoConfig = {
  enabled: boolean;
  currencyName: string;
  currencySymbol: string;
  startingBalance: number;
  dailyAmountMin: number;
  dailyAmountMax: number;
  dailyCooldownHours: number;
  dailyStreakBonus: number;
  dailyStreakMaxBonus: number;
  gambleMinBet: number;
  gambleMaxBet: number;
  gambleWinMultiplier: number;
  transfersEnabled: boolean;
  leaderboardSize: number;
  passiveEarnEnabled: boolean;
  passiveEarnMin: number;
  passiveEarnMax: number;
  passiveEarnCooldownSeconds: number;
  passiveEarnMinMessageLength: number;
  workEnabled: boolean;
  workAmountMin: number;
  workAmountMax: number;
  workCooldownMinutes: number;
  robEnabled: boolean;
  robSuccessRate: number;
  robMaxStealPercent: number;
  robFailPenaltyPercent: number;
  robCooldownMinutes: number;
  robMinTargetBalance: number;
};
type ShopItem = { id: string; roleId: string; roleName: string; label: string; description: string; price: number; enabled: boolean };
type Wallet = { userId: string; username: string; avatarUrl: string | null; balance: number; rank: number };
type Tx = { id: string; userId: string; type: string; amount: number; createdAt: string; note: string | null };
type Activity = { transactions24h: number; volume24h: number; totalCirculating: number };

const TX_LABEL: Record<string, string> = {
  daily: "Bonus quotidien",
  passive: "Gain par message",
  work: "Petit boulot",
  rob_gain: "Vol réussi",
  rob_loss: "Volé",
  rob_fine: "Amende de vol",
  transfer_in: "Virement reçu",
  transfer_out: "Virement envoyé",
  gamble_win: "Pari gagné",
  gamble_loss: "Pari perdu",
  purchase: "Achat boutique",
  admin: "Ajustement",
};
const fmt = (n: number) => n.toLocaleString("fr-FR");
const Amount = ({ n, sym }: { n: number; sym: string }) => (
  <>
    {fmt(n)}
    <span className="ml-1.5 text-sm font-medium text-[var(--text-muted)]">{sym}</span>
  </>
);

/** Économie (format Keeper) : monnaie, gains, paris et vols, boutique de rôles, classement et mouvements. */
export default function ConsoleEconomy({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<EcoConfig | null>(null);
  const [shop, setShop] = useState<ShopItem[]>([]);
  const [top, setTop] = useState<Wallet[] | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    const [c, s, l, t, a] = await Promise.all([
      api<{ config: EcoConfig }>("/economy/config"),
      api<{ items: ShopItem[] }>("/economy/shop", { silent: true }),
      api<{ leaderboard: Wallet[] }>("/economy/leaderboard?limit=10", { silent: true }),
      api<{ transactions: Tx[] }>("/economy/transactions?limit=15", { silent: true }),
      api<{ activity: Activity }>("/economy/activity", { silent: true }),
    ]);
    if (c) setCfg(c.config);
    setShop(s?.items ?? []);
    setTop(l?.leaderboard ?? []);
    setTxs(t?.transactions ?? []);
    if (a) setActivity(a.activity);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<EcoConfig>) => {
    setCfg((c) => (c ? { ...c, ...patch } : c));
    const r = await api<{ config: EcoConfig }>("/economy/config", { method: "PATCH", json: patch });
    if (r) setCfg(r.config);
    else void load();
  };
  const saveItem = async (item: Partial<ShopItem> & { roleId: string }) => {
    const r = await api<{ item: ShopItem }>("/economy/shop", { method: "POST", json: item });
    if (r) setShop((list) => (list.some((i) => i.id === r.item.id) ? list.map((i) => (i.id === r.item.id ? r.item : i)) : [...list, r.item]));
  };
  const deleteItem = async (id: string) => {
    if (await api(`/economy/shop/${id}`, { method: "DELETE" })) setShop((list) => list.filter((i) => i.id !== id));
  };

  if (!cfg) {
    return (
      <ConsolePage title="Économie">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const sym = cfg.currencySymbol;

  return (
    <ConsolePage title="Économie">
      {!cfg.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : les commandes et les gains sont en pause. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="En circulation" value={activity ? <Amount n={activity.totalCirculating} sym={sym} /> : "—"} hint="Somme de tous les soldes" />
        <StatTile label="Volume 24 h" value={activity ? <Amount n={activity.volume24h} sym={sym} /> : "—"} hint={activity ? `${activity.transactions24h} mouvement${activity.transactions24h > 1 ? "s" : ""}` : undefined} />
        <StatTile label="Plus gros solde" value={top?.[0] ? <Amount n={top[0].balance} sym={sym} /> : "—"} hint={top?.[0]?.username} />
        <StatTile label="Boutique" value={shop.length} hint={`article${shop.length > 1 ? "s" : ""} en vente`} />
      </motion.div>

      <Panel title="Monnaie">
        <Row label="Nom">
          <TextField value={cfg.currencyName} maxLength={32} onCommit={(v) => save({ currencyName: v })} />
        </Row>
        <Row label="Symbole" hint="Un emoji ou quelques caractères.">
          <TextField value={cfg.currencySymbol} maxLength={8} width="w-24" onCommit={(v) => save({ currencySymbol: v })} />
        </Row>
        <Row label="Solde de départ" hint="Donné à chaque nouveau membre.">
          <Stepper value={cfg.startingBalance} min={0} max={100000} step={10} unit={sym} onCommit={(n) => save({ startingBalance: n })} />
        </Row>
        <Row label="Virements entre membres" hint="Commande /pay.">
          <Switch checked={cfg.transfersEnabled} onChange={(v) => save({ transfersEnabled: v })} label="Virements entre membres" />
        </Row>
      </Panel>

      <Panel title="Bonus quotidien" subtitle="Commande /daily.">
        <Row label="Montant">
          <Range min={cfg.dailyAmountMin} max={cfg.dailyAmountMax} limit={100000} unit={sym} onMin={(n) => save({ dailyAmountMin: n })} onMax={(n) => save({ dailyAmountMax: n })} />
        </Row>
        <Row label="Délai">
          <Stepper value={cfg.dailyCooldownHours} min={1} max={72} unit="h" onCommit={(n) => save({ dailyCooldownHours: n })} />
        </Row>
        <Row label="Bonus de série" hint="Ajouté par jour consécutif, jusqu'au plafond.">
          <div className="flex flex-wrap items-center gap-3">
            <Stepper value={cfg.dailyStreakBonus} min={0} max={10000} step={5} unit={`${sym} / jour`} onCommit={(n) => save({ dailyStreakBonus: n })} />
            <span className="text-xs text-[var(--text-muted)]">plafond</span>
            <Stepper value={cfg.dailyStreakMaxBonus} min={0} max={100000} step={10} unit={sym} onCommit={(n) => save({ dailyStreakMaxBonus: n })} />
          </div>
        </Row>
      </Panel>

      <Panel title="Gains" subtitle="Ce que rapporte l'activité.">
        <Row label="Par message" hint="Un petit montant au hasard, avec un délai pour que le spam ne rapporte rien.">
          <Switch checked={cfg.passiveEarnEnabled} onChange={(v) => save({ passiveEarnEnabled: v })} label="Gain par message" />
        </Row>
        <Collapse open={cfg.passiveEarnEnabled}>
          <Row label="Montant par message">
            <Range min={cfg.passiveEarnMin} max={cfg.passiveEarnMax} limit={1000} unit={sym} onMin={(n) => save({ passiveEarnMin: n })} onMax={(n) => save({ passiveEarnMax: n })} />
          </Row>
          <Row label="Délai entre deux gains">
            <Stepper value={cfg.passiveEarnCooldownSeconds} min={5} max={600} step={5} unit="s" onCommit={(n) => save({ passiveEarnCooldownSeconds: n })} />
          </Row>
          <Row label="Longueur minimale" hint="Les messages plus courts ne rapportent rien.">
            <Stepper value={cfg.passiveEarnMinMessageLength} min={0} max={50} unit="caractères" onCommit={(n) => save({ passiveEarnMinMessageLength: n })} />
          </Row>
        </Collapse>
        <Row label="Petit boulot" hint="Commande /work : un gain modeste mais sûr.">
          <Switch checked={cfg.workEnabled} onChange={(v) => save({ workEnabled: v })} label="Petit boulot" />
        </Row>
        <Collapse open={cfg.workEnabled}>
          <Row label="Montant">
            <Range min={cfg.workAmountMin} max={cfg.workAmountMax} limit={100000} unit={sym} onMin={(n) => save({ workAmountMin: n })} onMax={(n) => save({ workAmountMax: n })} />
          </Row>
          <Row label="Délai">
            <Stepper value={cfg.workCooldownMinutes} min={1} max={1440} step={5} unit="min" onCommit={(n) => save({ workCooldownMinutes: n })} />
          </Row>
        </Collapse>
      </Panel>

      <Panel title="Paris et vols">
        <Row label="Mise au pari" hint="Commande /gamble.">
          <Range min={cfg.gambleMinBet} max={cfg.gambleMaxBet} limit={1000000} unit={sym} onMin={(n) => save({ gambleMinBet: n })} onMax={(n) => save({ gambleMaxBet: n })} />
        </Row>
        <Row label="Gain d'un pari réussi" hint="La mise est multipliée par ce nombre.">
          <Stepper value={cfg.gambleWinMultiplier} min={1} max={5} step={0.1} unit="×" onCommit={(n) => save({ gambleWinMultiplier: n })} />
        </Row>
        <Row label="Vol" hint="Commande /rob : risqué pour le voleur.">
          <Switch checked={cfg.robEnabled} onChange={(v) => save({ robEnabled: v })} label="Vol" />
        </Row>
        <Collapse open={cfg.robEnabled}>
          <Row label="Chance de réussite">
            <Stepper value={Math.round(cfg.robSuccessRate * 100)} min={0} max={100} step={5} unit="%" onCommit={(n) => save({ robSuccessRate: n / 100 })} />
          </Row>
          <Row label="Part volée au maximum">
            <Stepper value={cfg.robMaxStealPercent} min={1} max={100} unit="% du solde" onCommit={(n) => save({ robMaxStealPercent: n })} />
          </Row>
          <Row label="Amende en cas d'échec">
            <Stepper value={cfg.robFailPenaltyPercent} min={0} max={100} unit="% du solde" onCommit={(n) => save({ robFailPenaltyPercent: n })} />
          </Row>
          <Row label="Délai">
            <Stepper value={cfg.robCooldownMinutes} min={1} max={1440} step={5} unit="min" onCommit={(n) => save({ robCooldownMinutes: n })} />
          </Row>
          <Row label="Solde minimum de la cible" hint="Les membres plus pauvres ne peuvent pas être volés.">
            <Stepper value={cfg.robMinTargetBalance} min={0} max={1000000} step={50} unit={sym} onCommit={(n) => save({ robMinTargetBalance: n })} />
          </Row>
        </Collapse>
      </Panel>

      <Panel title="Boutique" subtitle="Des rôles à acheter avec la monnaie du serveur." actions={<RoleAdder guildId={guildId} label="Article" excludeIds={shop.map((i) => i.roleId)} onPick={(r) => saveItem({ roleId: r.id, roleName: r.name, label: r.name, price: 100, enabled: true })} />}>
        {shop.length === 0 ? (
          <EmptyLine>Aucun article. Ajoute un rôle à vendre.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {shop.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING_LAYOUT}
                  className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <TextField value={item.label} maxLength={60} width="w-full max-w-xs" onCommit={(v) => saveItem({ ...item, label: v })} />
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">Rôle @{item.roleName}</p>
                  </div>
                  <Stepper value={item.price} min={0} max={10000000} step={50} unit={sym} onCommit={(n) => saveItem({ ...item, price: n })} />
                  <Switch checked={item.enabled} onChange={(v) => saveItem({ ...item, enabled: v })} label={item.enabled ? `Retirer ${item.label} de la vente` : `Mettre ${item.label} en vente`} />
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    aria-label={`Supprimer ${item.label}`}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Classement">
          {!top ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : top.length === 0 ? (
            <EmptyLine>Personne n&apos;a encore de solde.</EmptyLine>
          ) : (
            <ol>
              {top.map((w) => (
                <li key={w.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{w.rank}</span>
                  {w.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full" />
                  ) : (
                    <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--surface-hover)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{w.username}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-primary)]">
                    {fmt(w.balance)} {sym}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Derniers mouvements">
          {!txs ? (
            <EmptyLine>Chargement…</EmptyLine>
          ) : txs.length === 0 ? (
            <EmptyLine>Aucun mouvement pour l&apos;instant.</EmptyLine>
          ) : (
            <ul>
              {txs.map((t) => {
                const who = top?.find((w) => w.userId === t.userId)?.username;
                return (
                  <li key={t.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--text-primary)]">{TX_LABEL[t.type] ?? t.type}</span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">
                        {who ?? `Membre ${t.userId.slice(-4)}`} · {sinceLabel(t.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: t.amount >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {t.amount >= 0 ? "+" : ""}
                      {fmt(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </ConsolePage>
  );
}

/** Deux compteurs « de … à … » ; le minimum ne peut pas dépasser le maximum. */
function Range({ min, max, limit, unit, onMin, onMax }: { min: number; max: number; limit: number; unit: string; onMin: (n: number) => void; onMax: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-[var(--text-muted)]">de</span>
      <Stepper value={min} min={0} max={max} step={limit >= 10000 ? 10 : 1} onCommit={onMin} />
      <span className="text-xs text-[var(--text-muted)]">à</span>
      <Stepper value={max} min={min} max={limit} step={limit >= 10000 ? 10 : 1} unit={unit} onCommit={onMax} />
    </div>
  );
}

/** Lignes de détail qui se déplient quand l'option est activée. */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
