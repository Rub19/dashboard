"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Coins,
  Trophy,
  Gift,
  ShoppingBag,
  Settings,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  History,
  Wallet as WalletIcon,
  ArrowLeft,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import RolePicker from "@/components/discord/RolePicker";
import { formatApiError } from "@/lib/format-error";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

interface Wallet {
  userId: string;
  guildId: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
  lastDailyClaimAt: string | null;
  dailyStreak?: number;
  totalEarned: number;
  totalSpent: number;
  rank: number;
}

interface EconomyConfig {
  enabled: boolean;
  currencyName: string;
  currencySymbol: string;
  startingBalance: number;
  dailyAmountMin: number;
  dailyAmountMax: number;
  dailyCooldownHours: number;
  gambleMinBet: number;
  gambleMaxBet: number;
  gambleWinMultiplier: number;
  transfersEnabled: boolean;
  leaderboardSize: number;
  dailyStreakBonus: number;
  dailyStreakMaxBonus: number;
  passiveEarnEnabled: boolean;
  passiveEarnMin: number;
  passiveEarnMax: number;
  passiveEarnCooldownSeconds: number;
  workEnabled: boolean;
  workAmountMin: number;
  workAmountMax: number;
  workCooldownMinutes: number;
  robEnabled: boolean;
  robSuccessRate: number;
  robMaxStealPercent: number;
  robFailPenaltyPercent: number;
  robCooldownMinutes: number;
}

type TransactionType =
  | "daily" | "passive" | "work" | "rob_gain" | "rob_loss" | "rob_fine"
  | "transfer_in" | "transfer_out" | "gamble_win" | "gamble_loss" | "purchase" | "admin";

interface Transaction {
  id: string;
  guildId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  counterpartyId: string | null;
  note: string | null;
  createdAt: string;
}

interface Activity {
  transactions24h: number;
  volume24h: number;
  totalCirculating: number;
}

const TX_META: Record<TransactionType, { label: string; icon: string }> = {
  daily: { label: "Quotidien", icon: "🎁" },
  passive: { label: "Activité chat", icon: "💬" },
  work: { label: "Travail", icon: "💼" },
  rob_gain: { label: "Vol réussi", icon: "🕵️" },
  rob_loss: { label: "Volé", icon: "😱" },
  rob_fine: { label: "Amende (vol raté)", icon: "🚔" },
  transfer_in: { label: "Reçu", icon: "📥" },
  transfer_out: { label: "Envoyé", icon: "📤" },
  gamble_win: { label: "Pari gagné", icon: "🪙" },
  gamble_loss: { label: "Pari perdu", icon: "🎲" },
  purchase: { label: "Achat boutique", icon: "🛍️" },
  admin: { label: "Ajustement staff", icon: "🛠️" },
};

interface ShopItem {
  id: string;
  roleId: string;
  roleName: string;
  label: string;
  description: string;
  price: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: EconomyConfig = {
  enabled: true,
  currencyName: "Crédits ETHONE",
  currencySymbol: "🪙",
  startingBalance: 0,
  dailyAmountMin: 50,
  dailyAmountMax: 150,
  dailyCooldownHours: 24,
  gambleMinBet: 10,
  gambleMaxBet: 5000,
  gambleWinMultiplier: 1.9,
  transfersEnabled: true,
  leaderboardSize: 10,
  dailyStreakBonus: 10,
  dailyStreakMaxBonus: 100,
  passiveEarnEnabled: true,
  passiveEarnMin: 1,
  passiveEarnMax: 4,
  passiveEarnCooldownSeconds: 60,
  workEnabled: true,
  workAmountMin: 20,
  workAmountMax: 60,
  workCooldownMinutes: 30,
  robEnabled: true,
  robSuccessRate: 0.35,
  robMaxStealPercent: 20,
  robFailPenaltyPercent: 10,
  robCooldownMinutes: 120,
};

const DEMO_TRANSACTIONS: Transaction[] = [];

const DEMO_LEADERBOARD: Wallet[] = [];

const DEMO_SHOP: ShopItem[] = [];

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
      />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded text-indigo-500" />
    </div>
  );
}

export default function EconomyCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);

  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (rawGuildId && appliedQueryGuild.current !== rawGuildId) {
      const match = manageableGuilds.find((g) => g.id === rawGuildId);
      if (match) {
        appliedQueryGuild.current = rawGuildId;
        userSelectedRef.current = true;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && botGuildIds !== null) {
      const picked = pickBotGuild(manageableGuilds, botGuildIds);
      if (picked) setSelectedGuild(picked);
    } else if (!selectedGuild) {
      setSelectedGuild(manageableGuilds[0]);
    }
  }, [manageableGuilds, rawGuildId, selectedGuild, botGuildIds]);

  const currentGuildId = selectedGuild?.id || rawGuildId || "";
  const isBotPresent = Boolean(currentGuildId && botGuildIds && botGuildIds.includes(currentGuildId));
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/economy`;

  const [config, setConfig] = useState<EconomyConfig>(DEFAULT_CONFIG);
  const [leaderboard, setLeaderboard] = useState<Wallet[]>(DEMO_LEADERBOARD);
  const [shopItems, setShopItems] = useState<ShopItem[]>(DEMO_SHOP);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [activity, setActivity] = useState<Activity>({ transactions24h: 0, volume24h: 0, totalCirculating: 0 });
  const [txFilter, setTxFilter] = useState<"ALL" | TransactionType>("ALL");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [newItem, setNewItem] = useState({ roleId: "", label: "", price: 100, description: "" });
  const [myWallet, setMyWallet] = useState<Wallet | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!BOT_API_URL || !currentGuildId || !isBotPresent) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const fetches: Promise<any>[] = [
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/leaderboard`, { credentials: "include" }),
        fetch(`${base}/shop`, { credentials: "include" }),
        fetch(`${base}/transactions?limit=100`, { credentials: "include" }),
        fetch(`${base}/activity`, { credentials: "include" }),
      ];
      if (profile?.user?.id) {
        fetches.push(fetch(`${base}/wallets/${profile.user.id}`, { credentials: "include" }));
      }

      const [overviewRes, leaderboardRes, shopRes, txRes, activityRes, walletRes] = await Promise.all(fetches);
      const overviewData = await overviewRes.json().catch(() => null);
      const leaderboardData = await leaderboardRes.json().catch(() => null);
      const shopData = await shopRes.json().catch(() => null);
      const txData = await txRes.json().catch(() => null);
      const activityData = await activityRes.json().catch(() => null);
      const walletData = walletRes ? await walletRes.json().catch(() => null) : null;

      if (overviewRes.ok && overviewData?.config) {
        setConfig({ ...DEFAULT_CONFIG, ...overviewData.config });
        setIsDemo(false);
      } else {
        setIsDemo(true);
        return;
      }
      if (leaderboardRes.ok && Array.isArray(leaderboardData?.leaderboard)) {
        setLeaderboard(leaderboardData.leaderboard);
      }
      if (shopRes.ok && Array.isArray(shopData?.items)) {
        setShopItems(shopData.items);
      }
      if (txRes.ok && Array.isArray(txData?.transactions)) {
        setTransactions(txData.transactions);
      } else {
        setTransactions([]);
      }
      if (activityRes.ok && activityData?.activity) {
        setActivity(activityData.activity);
      }
      if (walletData?.wallet) {
        setMyWallet(walletData.wallet);
      }
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, currentGuildId, profile?.user?.id, isBotPresent]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaimDaily = async () => {
    if (!profile?.user?.id || isDemo || !BOT_API_URL) {
      toastError("Action impossible", "Connexion au bot requise.");
      return;
    }
    setClaimingDaily(true);
    try {
      const res = await fetch(`${base}/daily`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      success("Bonus quotidien réclamé !", `+${data.amount} ${config.currencySymbol} ajoutés à votre solde.`);
      load();
    } catch (err: unknown) {
      toastError("Erreur", formatApiError(err, "Échec de la réclamation du bonus."));
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleBuyShopItem = async (itemId: string, itemLabel: string, price: number) => {
    if (!profile?.user?.id || isDemo || !BOT_API_URL) {
      toastError("Action impossible", "Connexion au bot requise.");
      return;
    }
    if (myWallet && myWallet.balance < price) {
      toastError("Fonds insuffisants", `Il vous manque ${(price - myWallet.balance).toLocaleString("fr-FR")} ${config.currencySymbol}.`);
      return;
    }
    setPurchasingItemId(itemId);
    try {
      const res = await fetch(`${base}/shop/${itemId}/buy`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      success("Rôle acheté avec succès !", `Vous avez obtenu le rôle "${itemLabel}".`);
      load();
    } catch (err: unknown) {
      toastError("Échec de l'achat", formatApiError(err, "Une erreur est survenue lors de l'achat."));
    } finally {
      setPurchasingItemId(null);
    }
  };

  const saveConfig = async () => {
    if (isDemo || !BOT_API_URL) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch(`${base}/config`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data?.config) setConfig(data.config);
      success("Configuration de l'économie enregistrée.");
    } catch (err: unknown) {
      toastError("Échec de la sauvegarde", formatApiError(err, "Échec de l'enregistrement de la configuration."));
    } finally {
      setSavingConfig(false);
    }
  };

  const addShopItem = async () => {
    if (!newItem.roleId.trim() || !newItem.label.trim()) {
      toastError("Champs requis", "ID de rôle et libellé requis.");
      return;
    }
    if (isDemo || !BOT_API_URL) {
      toastError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${base}/shop`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data?.item) setShopItems((prev) => [...prev, data.item]);
      setNewItem({ roleId: "", label: "", price: 100, description: "" });
      success("Article ajouté à la boutique.");
    } catch (err: unknown) {
      toastError("Échec de l'ajout", formatApiError(err, "Échec de l'ajout de l'article."));
    }
  };

  const removeShopItem = async (id: string) => {
    const previous = shopItems;
    setShopItems((prev) => prev.filter((i) => i.id !== id));
    if (isDemo || !BOT_API_URL) return;
    try {
      const res = await fetch(`${base}/shop/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    } catch (err: unknown) {
      setShopItems(previous);
      toastError("Échec de la suppression", formatApiError(err, "Échec de la suppression de l'article."));
    }
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-slate-100 pb-44">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${currentGuildId ? `?guildId=${currentGuildId}` : ""}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Coins className="w-7 h-7 text-amber-400" />
              Économie — {config.currencyName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Soldes, classement et boutique de rôles.
              {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {manageableGuilds.length > 0 && selectedGuild && (
              <GuildSelector
                guilds={manageableGuilds}
                value={selectedGuild.id}
                onChange={(g: DiscordGuild) => {
                  userSelectedRef.current = true;
                  setSelectedGuild(g);
                }}
              />
            )}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 self-start rounded-lg border border-[var(--panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Bot non installé banner */}
        {selectedGuild && !isBotPresent && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Bot non installé sur ce serveur</p>
                <p className="text-xs text-amber-300/80">
                  Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour activer le système d'économie et la boutique de rôles.
                </p>
              </div>
            </div>
            <a
              href={BOT_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
            >
              Inviter le bot
            </a>
          </div>
        )}

        {/* Activité (réelle) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Masse en circulation", value: `${activity.totalCirculating.toLocaleString("fr-FR")} ${config.currencySymbol}`, cls: "text-amber-300", sub: "Somme de tous les soldes" },
            { label: "Volume 24h", value: `${activity.volume24h.toLocaleString("fr-FR")} ${config.currencySymbol}`, cls: "text-emerald-400", sub: "Montants échangés" },
            { label: "Mouvements 24h", value: activity.transactions24h.toLocaleString("fr-FR"), cls: "text-indigo-400", sub: "Transactions enregistrées" },
            { label: "Membres actifs", value: leaderboard.length.toLocaleString("fr-FR"), cls: "text-white", sub: "Avec un portefeuille" },
          ].map((k) => (
            <div key={k.label} className="p-4 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">{k.label}</span>
              <p className={cn("text-xl font-bold truncate", k.cls)}>{k.value}</p>
              <span className="text-[11px] text-slate-500">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* Mon portefeuille personnel */}
        {profile?.user?.id && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black/40 border border-indigo-500/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <WalletIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Mon Portefeuille</h3>
                  {myWallet && myWallet.rank > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Rang #{myWallet.rank}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  <span>
                    Solde : <strong className="text-amber-300 font-mono text-sm">{myWallet ? myWallet.balance.toLocaleString("fr-FR") : "0"} {config.currencySymbol}</strong>
                  </span>
                  {myWallet && (myWallet.dailyStreak || 0) > 0 && (
                    <span>
                      🔥 Série : <strong className="text-orange-400">{myWallet.dailyStreak} j</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimDaily}
              disabled={claimingDaily}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition shrink-0"
            >
              <Gift className={cn("w-4 h-4", claimingDaily && "animate-bounce")} />
              {claimingDaily ? "Réclamation..." : "Réclamer mon quotidien"}
            </button>
          </div>
        )}

        {/* Leaderboard */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Classement
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Aucun membre n'a encore de solde sur ce serveur.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((w) => (
                <div key={w.userId} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-[var(--panel-border)]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-6 text-center">
                      {w.rank <= 3 ? ["🥇", "🥈", "🥉"][w.rank - 1] : `#${w.rank}`}
                    </span>
                    <span className="text-sm font-semibold text-white">{w.username}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-300">{w.balance.toLocaleString("fr-FR")} {config.currencySymbol}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique des transactions */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Historique des transactions
              <span className="text-[11px] font-normal text-slate-500">({transactions.length} dernières)</span>
            </h2>
            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value as typeof txFilter)}
              className="h-8 px-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
            >
              <option value="ALL">Tous les types</option>
              {(Object.keys(TX_META) as TransactionType[]).map((t) => (
                <option key={t} value={t}>{TX_META[t].icon} {TX_META[t].label}</option>
              ))}
            </select>
          </div>
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Aucune transaction enregistrée pour l'instant — elles apparaissent dès qu'un membre utilise /economy.</p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {transactions
                .filter((t) => txFilter === "ALL" || t.type === txFilter)
                .map((t) => {
                  const meta = TX_META[t.type] || { label: t.type, icon: "•" };
                  const who = leaderboard.find((w) => w.userId === t.userId)?.username || t.userId;
                  const other = t.counterpartyId ? leaderboard.find((w) => w.userId === t.counterpartyId)?.username || t.counterpartyId : null;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 border border-[var(--panel-border)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base w-6 text-center shrink-0">{meta.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {who} <span className="text-slate-500 font-normal">· {meta.label}{other ? ` ↔ ${other}` : ""}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {new Date(t.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                            {t.note ? ` · ${t.note}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-xs font-bold font-mono", t.amount >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString("fr-FR")} {config.currencySymbol}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">solde {t.balanceAfter.toLocaleString("fr-FR")}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Shop */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            Boutique de rôles
          </h2>

          <div className="space-y-2">
            {shopItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-[var(--panel-border)]">
                <div>
                  <span className="text-sm font-semibold text-white block">{item.label}</span>
                  <span className="text-[11px] text-slate-500">{item.description || `Rôle #${item.roleId}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300 mr-1">{item.price.toLocaleString("fr-FR")} {config.currencySymbol}</span>
                  {profile?.user?.id && (
                    <button
                      type="button"
                      onClick={() => handleBuyShopItem(item.id, item.label, item.price)}
                      disabled={purchasingItemId === item.id || (myWallet !== null && myWallet.balance < item.price)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {purchasingItemId === item.id ? "Achat..." : "Acheter"}
                    </button>
                  )}
                  <button type="button" onClick={() => removeShopItem(item.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-3 border-t border-[var(--panel-border)]">
            <RolePicker
              guildId={currentGuildId}
              value={newItem.roleId}
              onChange={(roleId) => setNewItem((p) => ({ ...p, roleId }))}
              placeholder="Choisir un rôle ou ID..."
              size="sm"
              allowClear
            />
            <input
              type="text"
              placeholder="Libellé"
              value={newItem.label}
              onChange={(e) => setNewItem((p) => ({ ...p, label: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
            />
            <input
              type="number"
              placeholder="Prix"
              value={newItem.price}
              onChange={(e) => setNewItem((p) => ({ ...p, price: parseInt(e.target.value, 10) || 0 }))}
              className="px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
            />
            <button
              type="button"
              onClick={addShopItem}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-[var(--panel-border)] backdrop-blur-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Configuration
          </h2>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Économie activée</span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((p) => ({ ...p, enabled: e.target.checked }))}
              className="w-4 h-4 rounded text-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nom de la monnaie</label>
              <input
                type="text"
                value={config.currencyName}
                onChange={(e) => setConfig((p) => ({ ...p, currencyName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Symbole</label>
              <input
                type="text"
                value={config.currencySymbol}
                onChange={(e) => setConfig((p) => ({ ...p, currencySymbol: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bonus quotidien (min)</label>
              <input
                type="number"
                value={config.dailyAmountMin}
                onChange={(e) => setConfig((p) => ({ ...p, dailyAmountMin: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bonus quotidien (max)</label>
              <input
                type="number"
                value={config.dailyAmountMax}
                onChange={(e) => setConfig((p) => ({ ...p, dailyAmountMax: parseInt(e.target.value, 10) || 0 }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
              />
            </div>
          </div>

          {/* Gains & jeux — mêmes champs que economyConfig.ts côté bot */}
          <div className="pt-3 border-t border-[var(--panel-border)] space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Bonus série quotidienne (/jour)" value={config.dailyStreakBonus} onChange={(v) => setConfig((p) => ({ ...p, dailyStreakBonus: v }))} />
              <NumberField label="Bonus série max" value={config.dailyStreakMaxBonus} onChange={(v) => setConfig((p) => ({ ...p, dailyStreakMaxBonus: v }))} />
            </div>

            <ToggleRow label="Gains passifs en discutant" checked={config.passiveEarnEnabled} onChange={(v) => setConfig((p) => ({ ...p, passiveEarnEnabled: v }))} />
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Gain min / message" value={config.passiveEarnMin} onChange={(v) => setConfig((p) => ({ ...p, passiveEarnMin: v }))} />
              <NumberField label="Gain max / message" value={config.passiveEarnMax} onChange={(v) => setConfig((p) => ({ ...p, passiveEarnMax: v }))} />
              <NumberField label="Cooldown (s)" value={config.passiveEarnCooldownSeconds} onChange={(v) => setConfig((p) => ({ ...p, passiveEarnCooldownSeconds: v }))} />
            </div>

            <ToggleRow label="Commande /economy work" checked={config.workEnabled} onChange={(v) => setConfig((p) => ({ ...p, workEnabled: v }))} />
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Salaire min" value={config.workAmountMin} onChange={(v) => setConfig((p) => ({ ...p, workAmountMin: v }))} />
              <NumberField label="Salaire max" value={config.workAmountMax} onChange={(v) => setConfig((p) => ({ ...p, workAmountMax: v }))} />
              <NumberField label="Cooldown (min)" value={config.workCooldownMinutes} onChange={(v) => setConfig((p) => ({ ...p, workCooldownMinutes: v }))} />
            </div>

            <ToggleRow label="Commande /economy rob (vol entre membres)" checked={config.robEnabled} onChange={(v) => setConfig((p) => ({ ...p, robEnabled: v }))} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NumberField label="Taux de réussite (%)" value={Math.round(config.robSuccessRate * 100)} onChange={(v) => setConfig((p) => ({ ...p, robSuccessRate: Math.min(100, Math.max(0, v)) / 100 }))} />
              <NumberField label="Vol max (% du solde)" value={config.robMaxStealPercent} onChange={(v) => setConfig((p) => ({ ...p, robMaxStealPercent: v }))} />
              <NumberField label="Amende échec (%)" value={config.robFailPenaltyPercent} onChange={(v) => setConfig((p) => ({ ...p, robFailPenaltyPercent: v }))} />
              <NumberField label="Cooldown (min)" value={config.robCooldownMinutes} onChange={(v) => setConfig((p) => ({ ...p, robCooldownMinutes: v }))} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-slate-300">Transferts entre membres (/pay)</span>
            <input
              type="checkbox"
              checked={config.transfersEnabled}
              onChange={(e) => setConfig((p) => ({ ...p, transfersEnabled: e.target.checked }))}
              className="w-4 h-4 rounded text-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={saveConfig}
            disabled={savingConfig}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:brightness-110 text-white shadow-sm disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {savingConfig ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
