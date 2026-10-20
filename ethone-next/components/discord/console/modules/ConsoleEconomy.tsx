"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, Trash2, Upload } from "@/components/icons/ph";
import EthoCoin from "@/components/icons/EthoCoin";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ToastProvider";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleAdder, Row, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";
import { tx } from "@/lib/tx";

type EcoConfig = {
  enabled: boolean;
  currencyName: string;
  currencySymbol: string;
  currencyCustomIconUrl?: string | null;
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

const POPULAR_COINS = [
  { symbol: "🪙", label: "Pièce d'or" },
  { symbol: "🟡", label: "Jeton doré" },
  { symbol: "💎", label: "Diamant" },
  { symbol: "💰", label: "Bourse" },
  { symbol: "⭐", label: "Étoile" },
  { symbol: "🍪", label: "Cookie" },
  { symbol: "⚡", label: "Éclair" },
  { symbol: "👑", label: "Couronne" },
  { symbol: "🍀", label: "Trèfle" },
  { symbol: "🔥", label: "Flamme" },
  { symbol: "🎮", label: "Gaming" },
  { symbol: "⚔️", label: "Combat" },
];

const isEthoCoin = (sym?: string, url?: string | null) => {
  return (!url && (!sym || sym === "🪙" || sym === "etho")) || url === "etho";
};

export function CoinBadge({
  sym,
  iconUrl,
  size = 16,
  className,
}: {
  sym?: string;
  iconUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => {
    setImgErr(false);
  }, [iconUrl]);

  if (iconUrl && iconUrl !== "etho" && !imgErr) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        onError={() => setImgErr(true)}
        className={cn("inline-block shrink-0 rounded-full object-cover align-middle border border-[var(--panel-border)]/60 shadow-xs", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  if (isEthoCoin(sym, iconUrl)) {
    return <EthoCoin size={size} className={cn("inline-block shrink-0 align-middle", className)} />;
  }
  return <span className={cn("inline-block font-normal align-middle leading-none", className)}>{sym || "🪙"}</span>;
}

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
const Amount = ({ n, sym, iconUrl }: { n: number; sym: string; iconUrl?: string | null }) => (
  <span className="inline-flex items-center gap-1.5">
    <span>{fmt(n)}</span>
    <CoinBadge sym={sym} iconUrl={iconUrl} size={18} />
  </span>
);

/** Économie (format Keeper) : monnaie, gains, paris et vols, boutique de rôles, classement et mouvements. */
export default function ConsoleEconomy({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [cfg, setCfg] = useState<EcoConfig | null>(null);
  const [shop, setShop] = useState<ShopItem[]>([]);
  const [top, setTop] = useState<Wallet[] | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [coinTab, setCoinTab] = useState<"etho" | "emoji" | "custom">("etho");
  const [adjustingUser, setAdjustingUser] = useState<Wallet | null>(null);
  const [manualUserId, setManualUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustMode, setAdjustMode] = useState<"credit" | "debit">("credit");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const hasCfg = Boolean(cfg);
  const customIconUrl = cfg?.currencyCustomIconUrl;
  const currencySymbol = cfg?.currencySymbol;
  useEffect(() => {
    if (!hasCfg) return;
    if (customIconUrl && customIconUrl !== "etho") {
      setCoinTab("custom");
    } else if (currencySymbol && currencySymbol !== "🪙" && currencySymbol !== "etho") {
      setCoinTab("emoji");
    } else {
      setCoinTab("etho");
    }
  }, [hasCfg, customIconUrl, currencySymbol]);

  const handleSelectEtho = () => {
    setCoinTab("etho");
    void save({ currencySymbol: "🪙", currencyCustomIconUrl: null });
    toastSuccess("Économie", "Pièce officielle Etho activée.");
  };

  const handleSelectEmoji = (emoji: string) => {
    setCoinTab("emoji");
    void save({ currencySymbol: emoji, currencyCustomIconUrl: null });
    toastSuccess("Économie", `Pièce mise à jour : ${emoji}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Économie", "Le fichier doit être une image valide (PNG, SVG, WebP, JPG).");
      return;
    }
    if (file.size > 1024 * 1024) {
      toastError("Économie", "L'image ne doit pas dépasser 1 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setCoinTab("custom");
        void save({ currencyCustomIconUrl: dataUrl });
        toastSuccess("Économie", "Pièce personnalisée importée avec succès !");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setCoinTab("custom");
    void save({ currencyCustomIconUrl: trimmed });
    setCustomUrlInput("");
    toastSuccess("Économie", "URL de la pièce personnalisée enregistrée.");
  };

  const handleAdjust = async (targetUser: { userId: string; username?: string }) => {
    if (!targetUser.userId || adjustAmount <= 0) return;
    setAdjustBusy(true);
    const delta = adjustMode === "credit" ? adjustAmount : -adjustAmount;
    const res = await api<{ success: boolean; wallet: Wallet }>(`/economy/wallets/${targetUser.userId}/adjust`, {
      method: "POST",
      json: { amount: delta, note: adjustNote.trim() || undefined, username: targetUser.username },
    });
    setAdjustBusy(false);
    if (res?.success) {
      toastSuccess("Économie", `Solde de ${targetUser.username || targetUser.userId} mis à jour : ${fmt(res.wallet.balance)} ${cfg?.currencySymbol ?? ""}`);
      setAdjustingUser(null);
      setShowManualInput(false);
      setManualUserId("");
      setAdjustNote("");
      void load();
    }
  };

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
      <ConsolePage title={tx("Économie")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }
  const sym = cfg.currencySymbol;

  return (
    <ConsolePage title={tx("Économie")}>
      {!cfg.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">{tx("Module désactivé : les commandes et les gains sont en pause. Active-le avec l'interrupteur en haut de la page.")}</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={tx("En circulation")} value={activity ? <Amount n={activity.totalCirculating} sym={sym} iconUrl={cfg.currencyCustomIconUrl} /> : "—"} hint={tx("Somme de tous les soldes")} />
        <StatTile label={tx("Volume 24 h")} value={activity ? <Amount n={activity.volume24h} sym={sym} iconUrl={cfg.currencyCustomIconUrl} /> : "—"} hint={activity ? tx("{transactions24h} mouvement{v1}", { transactions24h: activity.transactions24h, v1: activity.transactions24h > 1 ? "s" : "" }) : undefined} />
        <StatTile label={tx("Plus gros solde")} value={top?.[0] ? <Amount n={top[0].balance} sym={sym} iconUrl={cfg.currencyCustomIconUrl} /> : "—"} hint={top?.[0]?.username} />
        <StatTile label={tx("Boutique")} value={shop.length} hint={tx("article{v0} en vente", { v0: shop.length > 1 ? "s" : "" })} />
      </motion.div>

      <Panel title={tx("Monnaie")} subtitle={tx("Configuration de la devise, choix de la pièce et règles d'émission.")}>
        <Row label={tx("Nom de la monnaie")} hint={tx("Le nom complet affiché dans les commandes et soldes.")}>
          <TextField value={cfg.currencyName} maxLength={32} onCommit={(v) => save({ currencyName: v })} />
        </Row>

        <Row label={tx("Pièce du serveur")} hint={tx("Choisis la pièce officielle Etho, un emoji populaire ou importe un fichier personnalisé.")}>
          <div className="w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCoinTab("etho")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  coinTab === "etho"
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <EthoCoin size={16} />
                <span>{tx("Pièce Etho (Défaut)")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCoinTab("emoji")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  coinTab === "emoji"
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Sparkles className="h-4 w-4" />
                <span>{tx("Emojis & Symboles")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCoinTab("custom")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  coinTab === "custom"
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                <Upload className="h-4 w-4" />
                <span>{tx("Importer un fichier / URL")}</span>
              </button>
            </div>

            {coinTab === "etho" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-950/20 shadow-inner">
                    <EthoCoin size={36} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{tx("Pièce Officielle Etho")}</p>
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        {tx("Par défaut")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {tx("Pièce métallique dorée frappée du monogramme Etho avec reflets et sillons gravés.")}
                    </p>
                    <div className="mt-2 flex items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
                      <span className="text-[var(--text-muted)]">{tx("Aperçu en direct :")}</span>
                      <span className="font-semibold text-amber-400">1 500</span>
                      <EthoCoin size={16} />
                    </div>
                  </div>
                </div>
                {isEthoCoin(cfg.currencySymbol, cfg.currencyCustomIconUrl) ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-1.5 text-xs font-medium text-[var(--success)] self-start sm:self-auto">
                    <Check className="h-3.5 w-3.5" />
                    <span>{tx("Active")}</span>
                  </div>
                ) : (
                  <div className="self-start sm:self-auto">
                    <GhostButton onClick={handleSelectEtho}>
                      {tx("Activer la pièce Etho")}
                    </GhostButton>
                  </div>
                )}
              </div>
            )}

            {coinTab === "emoji" && (
              <div className="space-y-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{tx("Pièces et devises populaires")}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{tx("Clique sur une pièce pour l'appliquer instantanément.")}</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {POPULAR_COINS.map((c) => {
                    const isSelected = !cfg.currencyCustomIconUrl && cfg.currencySymbol === c.symbol;
                    return (
                      <button
                        key={c.symbol}
                        type="button"
                        onClick={() => handleSelectEmoji(c.symbol)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border py-2 px-2 text-xs transition-all",
                          isSelected
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 font-semibold text-[var(--text-primary)]"
                            : "border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]"
                        )}
                      >
                        <span className="text-base">{c.symbol}</span>
                        <span className="truncate text-[11px]">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-[var(--panel-border)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">{tx("Emoji ou code personnalisé")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={cfg.currencySymbol}
                      maxLength={32}
                      onChange={(e) => save({ currencySymbol: e.target.value, currencyCustomIconUrl: null })}
                      placeholder={tx("Ex: 💎, 🍪, <:monnaie:123> ou ETH")}
                      className="h-9 w-48 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)] px-3 py-1.5 font-mono text-xs">
                      <span className="text-[var(--text-muted)]">{tx("Aperçu :")}</span>
                      <span className="font-semibold text-[var(--text-primary)]">1 500 {cfg.currencySymbol}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {coinTab === "custom" && (
              <div className="space-y-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-5 text-center transition-colors hover:border-[var(--accent-primary)]/60 cursor-pointer"
                >
                  <Upload className="h-6 w-6 text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {tx("Glisse une image ici ou clique pour parcourir")}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {tx("PNG, SVG, WebP ou JPG (recommandé : transparent, ratio 1:1, max 1 Mo)")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder={tx("Ou colle une URL directe (https://.../coin.png)")}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                  />
                  <GhostButton onClick={handleApplyCustomUrl} disabled={!customUrlInput.trim()}>
                    {tx("Appliquer l'URL")}
                  </GhostButton>
                </div>

                {cfg.currencyCustomIconUrl && cfg.currencyCustomIconUrl !== "etho" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)]/60 p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={cfg.currencyCustomIconUrl}
                        alt={tx("Pièce personnalisée")}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover border border-[var(--panel-border)] shadow-xs"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{tx("Pièce personnalisée active")}</p>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)] mt-0.5">
                          <span>{tx("Aperçu :")}</span>
                          <span className="font-semibold text-[var(--text-primary)]">1 500</span>
                          <img
                            src={cfg.currencyCustomIconUrl}
                            alt=""
                            width={16}
                            height={16}
                            className="inline-block h-4 w-4 rounded-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="self-start sm:self-auto">
                      <GhostButton onClick={handleSelectEtho}>
                        {tx("Rétablir la pièce Etho")}
                      </GhostButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Row>

        <Row label={tx("Solde de départ")} hint={tx("Donné à chaque nouveau membre.")}>
          <Stepper
            value={cfg.startingBalance}
            min={0}
            max={100000}
            step={10}
            unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />}
            onCommit={(n) => save({ startingBalance: n })}
          />
        </Row>
        <Row label={tx("Virements entre membres")} hint={tx("Commande /pay.")}>
          <Switch checked={cfg.transfersEnabled} onChange={(v) => save({ transfersEnabled: v })} label={tx("Virements entre membres")} />
        </Row>
      </Panel>

      <Panel title={tx("Bonus quotidien")} subtitle={tx("Commande /daily.")}>
        <Row label={tx("Montant")}>
          <Range
            min={cfg.dailyAmountMin}
            max={cfg.dailyAmountMax}
            limit={100000}
            unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />}
            onMin={(n) => save({ dailyAmountMin: n })}
            onMax={(n) => save({ dailyAmountMax: n })}
          />
        </Row>
        <Row label={tx("Délai")}>
          <Stepper value={cfg.dailyCooldownHours} min={1} max={72} unit="h" onCommit={(n) => save({ dailyCooldownHours: n })} />
        </Row>
        <Row label={tx("Bonus de série")} hint={tx("Ajouté par jour consécutif, jusqu'au plafond.")}>
          <div className="flex flex-wrap items-center gap-3">
            <Stepper
              value={cfg.dailyStreakBonus}
              min={0}
              max={10000}
              step={5}
              unit={<span className="inline-flex items-center gap-1"><CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} /> {" "}{tx("/ jour")}</span>}
              onCommit={(n) => save({ dailyStreakBonus: n })}
            />
            <span className="text-xs text-[var(--text-muted)]">{tx("plafond")}</span>
            <Stepper
              value={cfg.dailyStreakMaxBonus}
              min={0}
              max={100000}
              step={10}
              unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />}
              onCommit={(n) => save({ dailyStreakMaxBonus: n })}
            />
          </div>
        </Row>
      </Panel>

      <Panel title={tx("Gains")} subtitle={tx("Ce que rapporte l'activité.")}>
        <Row label={tx("Par message")} hint={tx("Un petit montant au hasard, avec un délai pour que le spam ne rapporte rien.")}>
          <Switch checked={cfg.passiveEarnEnabled} onChange={(v) => save({ passiveEarnEnabled: v })} label={tx("Gain par message")} />
        </Row>
        <Collapse open={cfg.passiveEarnEnabled}>
          <Row label={tx("Montant par message")}>
            <Range min={cfg.passiveEarnMin} max={cfg.passiveEarnMax} limit={1000} unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />} onMin={(n) => save({ passiveEarnMin: n })} onMax={(n) => save({ passiveEarnMax: n })} />
          </Row>
          <Row label={tx("Délai entre deux gains")}>
            <Stepper value={cfg.passiveEarnCooldownSeconds} min={5} max={600} step={5} unit="s" onCommit={(n) => save({ passiveEarnCooldownSeconds: n })} />
          </Row>
          <Row label={tx("Longueur minimale")} hint={tx("Les messages plus courts ne rapportent rien.")}>
            <Stepper value={cfg.passiveEarnMinMessageLength} min={0} max={50} unit={tx("caractères")} onCommit={(n) => save({ passiveEarnMinMessageLength: n })} />
          </Row>
        </Collapse>
        <Row label={tx("Petit boulot")} hint={tx("Commande /work : un gain modeste mais sûr.")}>
          <Switch checked={cfg.workEnabled} onChange={(v) => save({ workEnabled: v })} label={tx("Petit boulot")} />
        </Row>
        <Collapse open={cfg.workEnabled}>
          <Row label={tx("Montant")}>
            <Range min={cfg.workAmountMin} max={cfg.workAmountMax} limit={100000} unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />} onMin={(n) => save({ workAmountMin: n })} onMax={(n) => save({ workAmountMax: n })} />
          </Row>
          <Row label={tx("Délai")}>
            <Stepper value={cfg.workCooldownMinutes} min={1} max={1440} step={5} unit="min" onCommit={(n) => save({ workCooldownMinutes: n })} />
          </Row>
        </Collapse>
      </Panel>

      <Panel title={tx("Paris et vols")}>
        <Row label={tx("Mise au pari")} hint={tx("Commande /gamble.")}>
          <Range min={cfg.gambleMinBet} max={cfg.gambleMaxBet} limit={1000000} unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />} onMin={(n) => save({ gambleMinBet: n })} onMax={(n) => save({ gambleMaxBet: n })} />
        </Row>
        <Row label={tx("Gain d'un pari réussi")} hint={tx("La mise est multipliée par ce nombre.")}>
          <Stepper value={cfg.gambleWinMultiplier} min={1} max={5} step={0.1} unit="×" onCommit={(n) => save({ gambleWinMultiplier: n })} />
        </Row>
        <Row label={tx("Vol")} hint={tx("Commande /rob : risqué pour le voleur.")}>
          <Switch checked={cfg.robEnabled} onChange={(v) => save({ robEnabled: v })} label={tx("Vol")} />
        </Row>
        <Collapse open={cfg.robEnabled}>
          <Row label={tx("Chance de réussite")}>
            <Stepper value={Math.round(cfg.robSuccessRate * 100)} min={0} max={100} step={5} unit="%" onCommit={(n) => save({ robSuccessRate: n / 100 })} />
          </Row>
          <Row label={tx("Part volée au maximum")}>
            <Stepper value={cfg.robMaxStealPercent} min={1} max={100} unit={tx("% du solde")} onCommit={(n) => save({ robMaxStealPercent: n })} />
          </Row>
          <Row label={tx("Amende en cas d'échec")}>
            <Stepper value={cfg.robFailPenaltyPercent} min={0} max={100} unit={tx("% du solde")} onCommit={(n) => save({ robFailPenaltyPercent: n })} />
          </Row>
          <Row label={tx("Délai")}>
            <Stepper value={cfg.robCooldownMinutes} min={1} max={1440} step={5} unit="min" onCommit={(n) => save({ robCooldownMinutes: n })} />
          </Row>
          <Row label={tx("Solde minimum de la cible")} hint={tx("Les membres plus pauvres ne peuvent pas être volés.")}>
            <Stepper value={cfg.robMinTargetBalance} min={0} max={1000000} step={50} unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />} onCommit={(n) => save({ robMinTargetBalance: n })} />
          </Row>
        </Collapse>
      </Panel>

      <Panel title={tx("Boutique")} subtitle={tx("Des rôles à acheter avec la monnaie du serveur.")} actions={<RoleAdder guildId={guildId} label={tx("Article")} excludeIds={shop.map((i) => i.roleId)} onPick={(r) => saveItem({ roleId: r.id, roleName: r.name, label: r.name, price: 100, enabled: true })} />}>
        {shop.length === 0 ? (
          <EmptyLine>{tx("Aucun article. Ajoute un rôle à vendre.")}</EmptyLine>
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
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">{tx("Rôle @")}{item.roleName}</p>
                  </div>
                  <Stepper value={item.price} min={0} max={10000000} step={50} unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />} onCommit={(n) => saveItem({ ...item, price: n })} />
                  <Switch checked={item.enabled} onChange={(v) => saveItem({ ...item, enabled: v })} label={item.enabled ? tx("Retirer {label} de la vente", { label: item.label }) : tx("Mettre {label} en vente", { label: item.label })} />
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    aria-label={tx("Supprimer {label}", { label: item.label })}
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
        <Panel
          title={tx("Classement")}
          actions={
            <GhostButton onClick={() => { setAdjustingUser(null); setShowManualInput((prev) => !prev); }}>
              {showManualInput ? tx("Fermer") : tx("Ajuster un solde")}
            </GhostButton>
          }
        >
          <AnimatePresence initial={false}>
            {(adjustingUser || showManualInput) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRING_LAYOUT}
                className="overflow-hidden border-b border-[var(--panel-border)] bg-[var(--surface-hover)]/40 p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {adjustingUser ? tx("Ajuster le solde de @{username}", { username: adjustingUser.username }) : tx("Ajuster un membre par identifiant")}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setAdjustingUser(null); setShowManualInput(false); }}
                      aria-label={tx("Fermer")}
                      className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <Trash2 className="h-3.5 w-3.5 rotate-45" />
                    </button>
                  </div>
                  {!adjustingUser && (
                    <input
                      type="text"
                      value={manualUserId}
                      onChange={(e) => setManualUserId(e.target.value.trim())}
                      placeholder={tx("Identifiant Discord (ex: 123456789012345678)")}
                      className="h-8 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                    />
                  )}
                  {adjustingUser && (
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      {tx("Solde actuel :")}{" "} <span className="text-[var(--text-primary)] inline-flex items-center gap-1">{fmt(adjustingUser.balance)} <CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} /></span>
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-0.5">
                      <button
                        type="button"
                        onClick={() => setAdjustMode("credit")}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                          adjustMode === "credit" ? "bg-[var(--success)]/20 text-[var(--success)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {tx("+ Créditer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustMode("debit")}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                          adjustMode === "debit" ? "bg-[var(--danger)]/20 text-[var(--danger)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {tx("− Débiter")}
                      </button>
                    </div>
                    <Stepper value={adjustAmount} min={1} max={1000000} step={50} unit={<CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />} onCommit={(n) => setAdjustAmount(n)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[50, 100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdjustAmount(preset)}
                        className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                      >
                        {preset} <CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={12} />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder={tx("Motif facultatif (ex: Récompense, Concours, Régularisation)")}
                    maxLength={100}
                    className="h-8 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <GhostButton onClick={() => { setAdjustingUser(null); setShowManualInput(false); }}>
                      {tx("Annuler")}
                    </GhostButton>
                    <button
                      type="button"
                      disabled={adjustBusy || (!adjustingUser && !manualUserId)}
                      onClick={() => handleAdjust(adjustingUser || { userId: manualUserId })}
                      className="rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {adjustBusy ? tx("En cours…") : tx("Confirmer")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!top ? (
            <EmptyLine>{tx("Chargement…")}</EmptyLine>
          ) : top.length === 0 ? (
            <EmptyLine>{tx("Personne n'a encore de solde.")}</EmptyLine>
          ) : (
            <ol>
              {top.map((w) => (
                <li key={w.userId} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">{w.rank}</span>
                  {w.avatarUrl ? (
                    <img src={w.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full" />
                  ) : (
                    <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--surface-hover)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{w.username}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-primary)] inline-flex items-center gap-1">
                    {fmt(w.balance)} <CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={14} />
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAdjustingUser(w); setShowManualInput(false); }}
                    className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)]"
                  >
                    {tx("Ajuster")}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={tx("Derniers mouvements")}>
          {!txs ? (
            <EmptyLine>{tx("Chargement…")}</EmptyLine>
          ) : txs.length === 0 ? (
            <EmptyLine>{tx("Aucun mouvement pour l'instant.")}</EmptyLine>
          ) : (
            <ul>
              {txs.map((t) => {
                const who = top?.find((w) => w.userId === t.userId)?.username;
                return (
                  <li key={t.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[13px] first:border-t-0">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--text-primary)]">{TX_LABEL[t.type] ?? t.type}</span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">
                        {who ?? tx("Membre {v0}", { v0: t.userId.slice(-4) })} · {sinceLabel(t.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums inline-flex items-center gap-1" style={{ color: t.amount >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {t.amount >= 0 ? "+" : ""}
                      {fmt(t.amount)}
                      <CoinBadge sym={sym} iconUrl={cfg.currencyCustomIconUrl} size={13} />
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

function Range({ min, max, limit, unit, onMin, onMax }: { min: number; max: number; limit: number; unit: ReactNode; onMin: (n: number) => void; onMax: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-[var(--text-muted)]">{tx("de")}</span>
      <Stepper value={min} min={0} max={max} step={limit >= 10000 ? 10 : 1} onCommit={onMin} />
      <span className="text-xs text-[var(--text-muted)]">à</span>
      <Stepper value={max} min={min} max={limit} step={limit >= 10000 ? 10 : 1} unit={unit} onCommit={onMax} />
    </div>
  );
}

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
