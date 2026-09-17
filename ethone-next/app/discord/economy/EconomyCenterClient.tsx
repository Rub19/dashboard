"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface Wallet {
  userId: string;
  guildId: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
  lastDailyClaimAt: string | null;
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
}

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
};

const DEMO_LEADERBOARD: Wallet[] = [
  { userId: "demo-1", guildId: "demo", username: "Nocturne", avatarUrl: null, balance: 8420, lastDailyClaimAt: null, totalEarned: 9200, totalSpent: 780, rank: 1 },
  { userId: "demo-2", guildId: "demo", username: "AlexDev", avatarUrl: null, balance: 5310, lastDailyClaimAt: null, totalEarned: 6000, totalSpent: 690, rank: 2 },
  { userId: "demo-3", guildId: "demo", username: "Shadow", avatarUrl: null, balance: 2140, lastDailyClaimAt: null, totalEarned: 2500, totalSpent: 360, rank: 3 },
];

const DEMO_SHOP: ShopItem[] = [
  { id: "demo-shop-1", roleId: "0", roleName: "VIP", label: "Rôle VIP", description: "Accès aux salons exclusifs", price: 2500, enabled: true },
];

export default function EconomyCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = activeGuild?.id || "123456789012345678";
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/economy`;

  const [config, setConfig] = useState<EconomyConfig>(DEFAULT_CONFIG);
  const [leaderboard, setLeaderboard] = useState<Wallet[]>(DEMO_LEADERBOARD);
  const [shopItems, setShopItems] = useState<ShopItem[]>(DEMO_SHOP);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [newItem, setNewItem] = useState({ roleId: "", label: "", price: 100, description: "" });

  const load = useCallback(async () => {
    if (!BOT_API_URL || !currentGuildId || currentGuildId === "123456789012345678") {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const [overviewRes, leaderboardRes, shopRes] = await Promise.all([
        fetch(`${base}/overview`, { credentials: "include" }),
        fetch(`${base}/leaderboard`, { credentials: "include" }),
        fetch(`${base}/shop`, { credentials: "include" }),
      ]);
      const overviewData = await overviewRes.json().catch(() => null);
      const leaderboardData = await leaderboardRes.json().catch(() => null);
      const shopData = await shopRes.json().catch(() => null);

      if (overviewRes.ok && overviewData?.config) {
        setConfig(overviewData.config);
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
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, currentGuildId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    if (isDemo || !BOT_API_URL) {
      success("Configuration enregistrée (démo).");
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
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setConfig(data.config);
      success("Configuration de l'économie enregistrée.");
    } catch {
      toastError("Échec de l'enregistrement de la configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const addShopItem = async () => {
    if (!newItem.roleId.trim() || !newItem.label.trim()) {
      toastError("ID de rôle et libellé requis.");
      return;
    }
    if (isDemo || !BOT_API_URL) {
      setShopItems((prev) => [
        ...prev,
        { id: `demo-${Date.now()}`, roleId: newItem.roleId, roleName: newItem.label, label: newItem.label, description: newItem.description, price: newItem.price, enabled: true },
      ]);
      setNewItem({ roleId: "", label: "", price: 100, description: "" });
      success("Article ajouté (démo).");
      return;
    }
    try {
      const res = await fetch(`${base}/shop`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setShopItems((prev) => [...prev, data.item]);
      setNewItem({ roleId: "", label: "", price: 100, description: "" });
      success("Article ajouté à la boutique.");
    } catch {
      toastError("Échec de l'ajout de l'article.");
    }
  };

  const removeShopItem = async (id: string) => {
    setShopItems((prev) => prev.filter((i) => i.id !== id));
    if (isDemo || !BOT_API_URL) return;
    try {
      await fetch(`${base}/shop/${id}`, { method: "DELETE", credentials: "include" });
    } catch {
      toastError("Échec de la suppression — rechargez la page.");
    }
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-slate-100 pb-20">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Coins className="w-7 h-7 text-amber-400" />
              Économie — {config.currencyName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Soldes, classement et boutique de rôles.
              {isDemo && <span className="text-amber-400"> (données de démonstration)</span>}
            </p>
          </div>
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
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-300">{item.price.toLocaleString("fr-FR")} {config.currencySymbol}</span>
                  <button type="button" onClick={() => removeShopItem(item.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-3 border-t border-[var(--panel-border)]">
            <input
              type="text"
              placeholder="ID du rôle Discord"
              value={newItem.roleId}
              onChange={(e) => setNewItem((p) => ({ ...p, roleId: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-black/40 border border-[var(--panel-border)] text-xs text-white"
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
