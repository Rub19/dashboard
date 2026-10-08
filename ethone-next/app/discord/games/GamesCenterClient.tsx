"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Coins,
  Trophy,
  Sparkles,
  Dice5,
  Gamepad2,
  Crown,
  Flame,
  RefreshCw,
  Sliders,
  Save,
  Clock,
  ArrowLeft,
  ArrowRight,
  Bot,
  Volume2,
  VolumeX,
  Eye,
  Gift,
  Briefcase,
  Wallet as WalletIcon,
  AlertTriangle,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import { formatApiError } from "@/lib/format-error";

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export type GameType = "blackjack" | "roulette" | "dice" | "spin";

export interface GamesConfig {
  enabled: boolean;
  allowedChannelIds: string[];
  minBet: number;
  maxBet: number;
  blackjackEnabled: boolean;
  rouletteEnabled: boolean;
  diceEnabled: boolean;
  dailySpinEnabled: boolean;
  jackpotPool: number;
  jackpotContributionPercent: number;
  cooldownSeconds: number;
  houseEdgePercent: number;
}

export interface GameRecord {
  id: string;
  guildId: string;
  userId: string;
  username: string;
  gameType: GameType;
  bet: number;
  payout: number;
  net: number;
  won: boolean;
  detail: string;
  timestamp: string;
}

export interface GamesOverview {
  enabled: boolean;
  jackpotPool: number;
  totalGamesPlayed: number;
  totalBets: number;
  totalPayouts: number;
  biggestWin: { username: string; amount: number; game: string; timestamp: string } | null;
  recentGames: GameRecord[];
  topWinners: Array<{ userId: string; username: string; totalWon: number; gamesPlayed: number }>;
}

const DEFAULT_CONFIG: GamesConfig = {
  enabled: true,
  allowedChannelIds: [],
  minBet: 10,
  maxBet: 50000,
  blackjackEnabled: true,
  rouletteEnabled: true,
  diceEnabled: true,
  dailySpinEnabled: true,
  jackpotPool: 5000,
  jackpotContributionPercent: 2,
  cooldownSeconds: 3,
  houseEdgePercent: 1,
};

// Vide tant que le bot n'a pas répondu : aucune partie, aucun joueur inventé.
const EMPTY_OVERVIEW: GamesOverview = {
  enabled: true,
  jackpotPool: 0,
  totalGamesPlayed: 0,
  totalBets: 0,
  totalPayouts: 0,
  biggestWin: null,
  recentGames: [],
  topWinners: [],
};

// Synthétiseur audio Web Audio API (aucun fichier externe requis, ultra réactif)
function playProceduralSound(type: "card" | "chip" | "win" | "spin" | "dice") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "card") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "chip") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.5, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "spin") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "dice") {
      osc.type = "square";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(200, now + 0.05);
      osc.frequency.setValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Audio désactivé silencieusement si bloqué par le navigateur
  }
}

interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  num: number;
}

function calculateHandScore(cards: Card[]): number {
  let score = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.value === "A") {
      aces++;
      score += 11;
    } else {
      score += c.num;
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

export default function GamesCenterClient() {
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

  const selectedGuildId = selectedGuild?.id || rawGuildId || "";
  const isBotPresent = botGuildIds === null ? true : selectedGuild ? botGuildIds.includes(selectedGuild.id) : true;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [offline, setOffline] = useState(false);

  // Données du Casino
  const [config, setConfig] = useState<GamesConfig>(DEFAULT_CONFIG);
  const [overview, setOverview] = useState<GamesOverview>(EMPTY_OVERVIEW);

  // Onglet actif : overview | blackjack | roulette | dice | settings | preview
  const [activeTab, setActiveTab] = useState<"overview" | "blackjack" | "roulette" | "dice" | "settings" | "preview">("overview");

  // Blackjack : la main est tenue par le bot, le site n'affiche que ce qu'il renvoie.
  const [bjBet, setBjBet] = useState(100);
  const [bjGameId, setBjGameId] = useState<string | null>(null);
  const [bjPlayerCards, setBjPlayerCards] = useState<Card[]>([]);
  const [bjDealerCards, setBjDealerCards] = useState<Card[]>([]);
  const [bjStatus, setBjStatus] = useState<"idle" | "playing" | "won" | "lost" | "push" | "blackjack">("idle");
  const [bjDealerRevealed, setBjDealerRevealed] = useState(false);
  const [bjBusy, setBjBusy] = useState(false);

  // Roulette
  const [rouletteBet, setRouletteBet] = useState(50);
  const [rouletteChoice, setRouletteChoice] = useState<string>("rouge");
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteResultNumber, setRouletteResultNumber] = useState<number | null>(null);
  const [rouletteResultColor, setRouletteResultColor] = useState<"rouge" | "noir" | "vert" | null>(null);
  const [rouletteOutcome, setRouletteOutcome] = useState<{ won: boolean; payout: number; msg: string } | null>(null);

  // Duel de dés contre le bot
  const [diceBet, setDiceBet] = useState(100);
  const [diceRolling, setDiceRolling] = useState(false);
  const [dicePlayerRoll, setDicePlayerRoll] = useState<[number, number] | null>(null);
  const [diceOpponentRoll, setDiceOpponentRoll] = useState<[number, number] | null>(null);
  const [diceOutcome, setDiceOutcome] = useState<{ won: boolean; msg: string } | null>(null);

  // Aperçu Embed Discord
  const [previewTab, setPreviewTab] = useState<"blackjack" | "roulette" | "dice" | "jackpot">("blackjack");

  // Système Monétaire Ethone Coin intégré
  const [currencyName, setCurrencyName] = useState("Ethone Coins");
  const [currencySymbol, setCurrencySymbol] = useState("🪙");
  const [economyEnabled, setEconomyEnabled] = useState(true);
  const [userWallet, setUserWallet] = useState<{
    userId: string;
    balance: number;
    rank: number;
    dailyStreak: number;
    totalEarned: number;
    totalSpent: number;
  } | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [workingJob, setWorkingJob] = useState(false);

  const activeBalance = userWallet?.balance ?? 0;

  // Synchronisation Discord
  useDiscordSync({
    guildId: selectedGuildId,
    onConfigUpdated: (moduleName, data) => {
      if (moduleName === "games" && data && typeof data === "object") {
        if ("jackpotPool" in data) {
          const pool = Number((data as any).jackpotPool);
          if (Number.isFinite(pool)) {
            setOverview((prev) => ({ ...prev, jackpotPool: pool }));
          }
        }
      }
      if (moduleName === "economy" && data && typeof data === "object") {
        if ("action" in data && (data as any).action === "balance_updated" && (data as any).userId === profile?.user?.id) {
          const newBal = Number((data as any).newBalance);
          if (Number.isFinite(newBal)) {
            setUserWallet((prev) => (prev ? { ...prev, balance: newBal } : null));
          }
        }
      }
    },
  });

  // Jouer son si actif
  const playSound = useCallback(
    (type: "card" | "chip" | "win" | "spin" | "dice") => {
      if (soundEnabled) {
        playProceduralSound(type);
      }
    },
    [soundEnabled]
  );

  const refreshWallet = useCallback(
    async (guildId: string) => {
      if (!guildId || !profile?.user?.id) return;
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/economy/wallets/${profile.user.id}`, { credentials: "include" });
        if (res.ok) {
          const d = await res.json();
          if (d.wallet) setUserWallet(d.wallet);
        }
      } catch {
        // ignore
      }
    },
    [profile?.user?.id]
  );

  // Chargement des données du casino et de l'économie
  const fetchCasinoData = useCallback(
    async (guildId: string) => {
      if (!guildId) return;
      setLoading(true);
      try {
        const [ovRes, cfgRes, ecoCfgRes, walletRes] = await Promise.allSettled([
          fetch(`${BOT_API_URL}/api/guilds/${guildId}/games/overview`, { credentials: "include" }),
          fetch(`${BOT_API_URL}/api/guilds/${guildId}/games/config`, { credentials: "include" }),
          fetch(`${BOT_API_URL}/api/guilds/${guildId}/economy/config`, { credentials: "include" }),
          profile?.user?.id
            ? fetch(`${BOT_API_URL}/api/guilds/${guildId}/economy/wallets/${profile.user.id}`, { credentials: "include" })
            : Promise.reject(),
        ]);

        if (ovRes.status === "fulfilled" && ovRes.value.ok) {
          const ov = await ovRes.value.json();
          setOverview(ov);
          if (ov.currencyName) setCurrencyName(ov.currencyName);
          if (ov.currencySymbol) setCurrencySymbol(ov.currencySymbol);
          setOffline(false);
        } else {
          setOffline(true);
        }

        if (cfgRes.status === "fulfilled" && cfgRes.value.ok) {
          const cfg = await cfgRes.value.json();
          setConfig(cfg);
          if (cfg.currencyName) setCurrencyName(cfg.currencyName);
          if (cfg.currencySymbol) setCurrencySymbol(cfg.currencySymbol);
        }
        if (ecoCfgRes.status === "fulfilled" && ecoCfgRes.value.ok) {
          const eco = await ecoCfgRes.value.json();
          if (eco.config) {
            if (eco.config.currencyName) setCurrencyName(eco.config.currencyName);
            if (eco.config.currencySymbol) setCurrencySymbol(eco.config.currencySymbol);
            setEconomyEnabled(eco.config.enabled ?? true);
          }
        }
        if (walletRes.status === "fulfilled" && walletRes.value.ok) {
          const wData = await walletRes.value.json();
          if (wData.wallet) {
            setUserWallet(wData.wallet);
          }
        }
      } catch {
        setOffline(true);
      } finally {
        setLoading(false);
      }
    },
    [profile?.user?.id]
  );

  const handleClaimDaily = async () => {
    if (!selectedGuildId) return;
    setClaimingDaily(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/economy/daily`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Bonus déjà réclamé");
        return;
      }
      success("Bonus Quotidien Réclamé !", `+${data.amount} ${currencySymbol} ajoutés à votre portefeuille.`);
      playSound("win");
      await refreshWallet(selectedGuildId);
    } catch (e) {
      toastError("Erreur", formatApiError(e));
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleQuickWork = async () => {
    if (!selectedGuildId) return;
    setWorkingJob(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/economy/work`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || "Travail indisponible");
        return;
      }
      success("Petit boulot terminé !", `+${data.amount} ${currencySymbol} gagnés (${data.job}).`);
      playSound("chip");
      await refreshWallet(selectedGuildId);
    } catch (e) {
      toastError("Erreur", formatApiError(e));
    } finally {
      setWorkingJob(false);
    }
  };

  type PlayResult = {
    newBalance?: number;
    jackpotPool?: number;
    record?: GameRecord;
    [key: string]: unknown;
  };

  /** Envoie la mise et le choix au bot ; c'est lui qui tire et calcule le gain. */
  const callCasino = async <T extends PlayResult>(path: string, body: Record<string, unknown>): Promise<T | null> => {
    if (!selectedGuildId) return null;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/games/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.message || "Le bot a refusé la partie.");
        return null;
      }
      if (typeof data.newBalance === "number") {
        setUserWallet((prev) => (prev ? { ...prev, balance: data.newBalance } : prev));
      }
      if (typeof data.jackpotPool === "number") {
        setOverview((prev) => ({ ...prev, jackpotPool: data.jackpotPool }));
      }
      if (data.record) {
        setOverview((prev) => ({ ...prev, recentGames: [data.record, ...prev.recentGames.slice(0, 19)] }));
      }
      return data as T;
    } catch (err) {
      toastError("Bot injoignable", formatApiError(err));
      return null;
    }
  };


  useEffect(() => {
    if (selectedGuildId) {
      fetchCasinoData(selectedGuildId);
    }
  }, [selectedGuildId, fetchCasinoData]);

  // Sauvegarde de la configuration
  const handleSaveConfig = async () => {
    if (!selectedGuildId) return;
    setSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/games/config`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Erreur de sauvegarde");
      const data = await res.json();
      if (data.config) setConfig(data.config);
      success("Configuration enregistrée", "Les règles et limites du Casino sont synchronisées.");
      playSound("chip");
    } catch (err) {
      toastError("Échec de sauvegarde", formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // Alimenter la cagnotte (Seed Jackpot)
  const handleSeedJackpot = async (amount: number) => {
    if (!selectedGuildId) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/games/jackpot/seed`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Impossible d'alimenter la cagnotte");
      const data = await res.json();
      setOverview((prev) => ({ ...prev, jackpotPool: data.jackpotPool }));
      success("Cagnotte alimentée !", `+${amount} ${currencySymbol} ajoutés à la cagnotte progressive.`);
      playSound("win");
    } catch (err) {
      toastError("Erreur", formatApiError(err));
    }
  };

  type BlackjackResponse = PlayResult & {
    gameId: string;
    status: "playing" | "won" | "lost" | "push" | "blackjack";
    bet: number;
    playerCards: Card[];
    dealerCards: Card[];
  };

  const applyBlackjack = (data: BlackjackResponse) => {
    const over = data.status !== "playing";
    setBjGameId(over ? null : data.gameId);
    setBjPlayerCards(data.playerCards);
    // Pendant la main, le bot ne révèle qu'une carte du croupier : on affiche le dos de la seconde.
    setBjDealerCards(over ? data.dealerCards : [...data.dealerCards, { suit: "♠", value: "?", num: 0 }]);
    setBjDealerRevealed(over);
    setBjStatus(data.status);
    setBjBet(data.bet);
    if (data.status === "won" || data.status === "blackjack") playSound("win");
  };

  const startNewBlackjackRound = async () => {
    if (bjBusy) return;
    setBjBusy(true);
    playSound("card");
    const data = await callCasino<BlackjackResponse>("blackjack/start", { bet: bjBet });
    if (data) applyBlackjack(data);
    setBjBusy(false);
  };

  const blackjackAction = async (action: "hit" | "stand" | "double") => {
    if (bjStatus !== "playing" || !bjGameId || bjBusy) return;
    setBjBusy(true);
    playSound(action === "double" ? "chip" : "card");
    const data = await callCasino<BlackjackResponse>(`blackjack/${bjGameId}/action`, { action });
    if (data) applyBlackjack(data);
    setBjBusy(false);
  };
  const handleBjHit = () => blackjackAction("hit");
  const handleBjStand = () => blackjackAction("stand");
  const handleBjDouble = () => blackjackAction("double");

  const handleSpinRoulette = async () => {
    if (rouletteSpinning) return;
    setRouletteSpinning(true);
    setRouletteOutcome(null);
    playSound("spin");
    const [data] = await Promise.all([
      callCasino<PlayResult & { number: number; color: "rouge" | "noir" | "vert"; multiplier: number; payout: number }>("roulette", {
        bet: rouletteBet,
        choice: rouletteChoice,
      }),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
    setRouletteSpinning(false);
    if (!data) return;
    setRouletteResultNumber(data.number);
    setRouletteResultColor(data.color);
    const won = data.multiplier > 0;
    setRouletteOutcome({
      won,
      payout: data.payout,
      msg: won
        ? `Gagné ! Numéro ${data.number} (${data.color.toUpperCase()}) : +${data.payout - rouletteBet} ${currencySymbol}`
        : `Perdu. Le ${data.number} (${data.color.toUpperCase()}) est tombé.`,
    });
    if (won) playSound("win");
  };

  const handleRollDiceDuel = async () => {
    if (diceRolling) return;
    setDiceRolling(true);
    setDiceOutcome(null);
    playSound("dice");
    const [data] = await Promise.all([
      callCasino<PlayResult & { player: [number, number]; house: [number, number]; payout: number }>("dice", { bet: diceBet }),
      new Promise((r) => setTimeout(r, 900)),
    ]);
    setDiceRolling(false);
    if (!data) return;
    setDicePlayerRoll(data.player);
    setDiceOpponentRoll(data.house);
    const a = data.player[0] + data.player[1];
    const b = data.house[0] + data.house[1];
    setDiceOutcome(
      a > b
        ? { won: true, msg: `Victoire ${a} contre ${b} (+${diceBet} ${currencySymbol})` }
        : a === b
          ? { won: false, msg: `Égalité (${a} partout) : mise remboursée.` }
          : { won: false, msg: `Défaite : le bot fait ${b} contre vos ${a}.` },
    );
    if (a > b) playSound("win");
  };

  const playerScore = useMemo(() => calculateHandScore(bjPlayerCards), [bjPlayerCards]);
  const dealerScore = useMemo(() => {
    if (!bjDealerRevealed) {
      return bjDealerCards[0] ? (bjDealerCards[0].value === "A" ? 11 : bjDealerCards[0].num) : 0;
    }
    return calculateHandScore(bjDealerCards);
  }, [bjDealerCards, bjDealerRevealed]);

  const currentGuildName = selectedGuild ? selectedGuild.name : "Serveur Discord";

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-[var(--text-primary)] pb-44">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--panel-border)]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Link
                href={`/discord${selectedGuildId ? `?guildId=${selectedGuildId}` : ""}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] px-3 text-xs font-semibold normal-case tracking-normal text-[var(--text-muted)] outline-none transition-[border-color,background-color,color] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 cursor-pointer"
                title="Retour au hub Discord"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Retour Discord</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-3">
              <span className="icon-pop grid h-10 w-10 shrink-0 place-items-center rounded-[var(--inset-radius)] border border-amber-500/25 bg-amber-500/10 text-amber-400">
                <Gamepad2 className="h-5 w-5" />
              </span>
              Mini-Jeux & Casino — Ethone Coins
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Blackjack 21, Roulette Royale, Duels PvP, cagnotte progressive et liaison directe au système monétaire.
              {offline && <span className="text-amber-400"> (mode local / bot non joignable)</span>}
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
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label="Effets sonores"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                soundEnabled
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                  : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{soundEnabled ? "Sons ON" : "Sons OFF"}</span>
            </button>
            <button
              type="button"
              onClick={() => fetchCasinoData(selectedGuildId)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/70 hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer transition-colors"
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
                <p className="text-sm font-semibold text-[var(--text-primary)]">Bot non installé sur ce serveur</p>
                <p className="text-xs text-amber-300/80">
                  Invitez le bot ETHONE sur <strong>{selectedGuild.name}</strong> pour activer les commandes de jeux et le portefeuille de casino.
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

        {/* Offline banner */}
        {offline && selectedGuild && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Mode hors-ligne : la synchronisation en direct avec le bot Discord est temporairement indisponible. Les parties démo et paramètres locaux restent accessibles.</span>
          </div>
        )}

        {/* Bannière Portefeuille Ethone Coin & Mode de Jeu */}
        <div className="rounded-2xl border border-amber-500/25 bg-[var(--surface-raised)]/40 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-md">
              <Coins className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Portefeuille Joueur
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currencyName} ({currencySymbol})
                </span>
                {userWallet && userWallet.rank > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    Rang #{userWallet.rank}
                  </span>
                )}
                {userWallet && (userWallet.dailyStreak || 0) > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                    <Flame size={11} className="text-orange-400" />
                    Série {userWallet.dailyStreak} j
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black font-mono tracking-tight text-amber-300 drop-shadow-sm">
                  {activeBalance.toLocaleString("fr-FR")}
                </span>
                <span className="text-sm font-bold text-amber-400/90">{currencySymbol}</span>
                {userWallet ? (
                  <span className="text-xs text-emerald-400 font-medium ml-1">Solde réel sur ce serveur</span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)] font-medium ml-1">Portefeuille indisponible (bot injoignable ou économie désactivée)</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions & Switcher de mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bonus Quotidien */}
            <button
              type="button"
              onClick={handleClaimDaily}
              disabled={claimingDaily}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Gift className={cn("w-3.5 h-3.5", claimingDaily && "animate-bounce")} />
              {claimingDaily ? "Réclamation..." : "Bonus Quotidien"}
            </button>

            {/* Boulot rapide */}
            <button
              type="button"
              onClick={handleQuickWork}
              disabled={workingJob}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Briefcase className={cn("w-3.5 h-3.5", workingJob && "animate-spin")} />
              {workingJob ? "Travail..." : "Petit Boulot /work"}
            </button>

            {/* Lien vers Module Économie */}
            <Link
              href={`/discord/economy?guildId=${selectedGuildId}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-raised)]/60 text-[var(--text-primary)] border border-[var(--panel-border)] hover:border-amber-500/40 transition-all"
            >
              <span>Gérer l&apos;Économie</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* 4 Metric KPI Cards (exact style of older pages) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">Cagnotte Jackpot</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                +{config.jackpotContributionPercent}%/mise
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-400">
              {overview.jackpotPool.toLocaleString("fr-FR")} {currencySymbol}
            </p>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Trésor commun</span>
              <button
                type="button"
                onClick={() => handleSeedJackpot(1000)}
                className="text-[11px] font-semibold text-amber-400 hover:underline cursor-pointer"
              >
                +1 000
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Parties Jouées</span>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {overview.totalGamesPlayed.toLocaleString("fr-FR")}
            </p>
            <span className="text-xs text-[var(--text-muted)]">BJ (42%) • Roulette (36%) • Dés (22%)</span>
          </div>

          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-medium">Volume & RTP</span>
              <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                {overview.totalBets > 0
                  ? `${Math.round((overview.totalPayouts / overview.totalBets) * 100)}% RTP`
                  : "96% RTP"}
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {overview.totalBets.toLocaleString("fr-FR")} {currencySymbol}
            </p>
            <span className="text-xs text-[var(--text-muted)] truncate block">
              {overview.totalPayouts.toLocaleString("fr-FR")} redistribués
            </span>
          </div>

          <div className="bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] rounded-2xl p-4 space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">Record de Gain</span>
            <p className="text-2xl font-bold text-amber-400 truncate">
              +{overview.biggestWin ? overview.biggestWin.amount.toLocaleString("fr-FR") : "7 200"} {currencySymbol}
            </p>
            <span className="text-xs text-[var(--text-muted)] truncate block">
              {overview.biggestWin ? overview.biggestWin.username : "—"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs (style matching Leveling / Welcome / Streamers) */}
        <div className="flex border-b border-[var(--panel-border)] gap-2 overflow-x-auto pb-1">
          {[
            { id: "overview", label: "Vue d'ensemble & Cagnotte", icon: Flame },
            { id: "blackjack", label: "Table Blackjack 21", icon: Gamepad2 },
            { id: "roulette", label: "Roulette Royale", icon: Sparkles },
            { id: "dice", label: "Duels de Dés PvP", icon: Dice5 },
            { id: "settings", label: "Paramètres & Banque", icon: Sliders },
            { id: "preview", label: "Aperçu Discord", icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  playSound("card");
                }}
                className={`relative px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer outline-none ${
                  isActive
                    ? "border-transparent text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="games-active-tab"
                    transition={{ type: "spring", stiffness: 450, damping: 43 }}
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent-primary)]"
                  />
                )}
                <Icon className={`w-4 h-4 ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenu des Onglets */}
        <AnimatePresence mode="wait">
          {/* ======================================================== */}
          {/* ONGLET 1 : VUE D'ENSEMBLE & CAGNOTTE                     */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <motion.div
              key="tab-overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Bannière Coffre-fort du Jackpot */}
              <div className="rounded-2xl border border-amber-500/30 bg-[var(--surface-raised)]/40 p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <Crown size={14} />
                      </span>
                      <h3 className="text-base font-bold text-amber-200">
                        Cagnotte Progressive du Serveur
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Chaque pari placé dans le casino contribue à hauteur de {config.jackpotContributionPercent}% dans le trésor commun. Le jackpot se déclenche automatiquement lors d&apos;un Blackjack Naturel 21 doré ou d&apos;un résultat 777.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-400/80 block">Trésor Actuel</span>
                      <span className="text-3xl font-black text-amber-300 drop-shadow-md">
                        {overview.jackpotPool.toLocaleString("fr-FR")} {currencySymbol}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSeedJackpot(500)}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer"
                    >
                      +500 {currencySymbol} Injecter
                    </button>
                  </div>
                </div>
              </div>

              {/* Classement des gagnants */}
              <div>
                {/* Classement des plus grands gagnants */}
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Top Flambeurs du Casino
                      </h3>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Saison en cours
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Les membres ayant accumulé les gains nets les plus spectaculaires sur vos tables de jeux.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {overview.topWinners.length === 0 && (
                      <p className="rounded-xl border border-dashed border-[var(--panel-border)] p-4 text-center text-xs text-[var(--text-muted)]">
                        Aucune partie jouée sur ce serveur pour l&apos;instant.
                      </p>
                    )}
                    {overview.topWinners.map((winner, idx) => {
                      const medalColors = [
                        "text-amber-400 bg-amber-500/20 border-amber-500/30",
                        "text-stone-300 bg-stone-500/20 border-stone-500/30",
                        "text-amber-600 bg-amber-800/20 border-amber-700/30",
                      ];
                      const badgeClass =
                        idx < 3
                          ? medalColors[idx]
                          : "text-[var(--text-muted)] bg-[var(--surface-raised)]/60 border-[var(--panel-border)]";

                      return (
                        <div
                          key={winner.userId}
                          className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 transition-colors hover:bg-[var(--surface-raised)]/70"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black",
                                badgeClass
                              )}
                            >
                              #{idx + 1}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-[var(--text-primary)] block">
                                {winner.username}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {winner.gamesPlayed} parties jouées
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-emerald-400">
                              +{winner.totalWon.toLocaleString("fr-FR")} {currencySymbol}
                            </span>
                            <span className="block text-[10px] text-[var(--text-muted)]">Total net gagné</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Flux des dernières parties en direct */}
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Historique des Dernières Parties
                    </h3>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    Temps réel synchronisé
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--panel-border)] text-[var(--text-muted)]">
                        <th className="pb-3 font-semibold">Joueur</th>
                        <th className="pb-3 font-semibold">Jeu</th>
                        <th className="pb-3 font-semibold">Mise</th>
                        <th className="pb-3 font-semibold">Résultat & Détail</th>
                        <th className="pb-3 font-semibold text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--panel-border)]">
                      {overview.recentGames.map((game) => (
                        <tr key={game.id} className="hover:bg-[var(--surface-raised)]/40 transition-colors">
                          <td className="py-3 font-medium text-[var(--text-primary)] flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                              {game.username[0]?.toUpperCase()}
                            </div>
                            <span>{game.username}</span>
                          </td>
                          <td className="py-3">
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                              {game.gameType}
                            </span>
                          </td>
                          <td className="py-3 text-[var(--text-muted)]">{game.bet} {currencySymbol}</td>
                          <td className="py-3">
                            <span className="text-[var(--text-primary)]">{game.detail}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={cn(
                                "font-bold",
                                game.won ? "text-emerald-400" : "text-rose-400"
                              )}
                            >
                              {game.won ? `+${game.net} ${currencySymbol}` : `${game.net} ${currencySymbol}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 2 : TABLE BLACKJACK 21 INTERACTIVE                 */}
          {/* ======================================================== */}
          {activeTab === "blackjack" && (
            <motion.div
              key="tab-blackjack"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-6">
                {/* Table de jeu feutre sombre / verte */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-900/60 bg-gradient-to-b from-[#0a2318] via-[#061811] to-[#040e0a] p-8 shadow-2xl text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

                  {/* Entête de la table */}
                  <div className="flex items-center justify-between border-b border-emerald-800/40 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Table VIP • Blackjack 21
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Blackjack paie 3:2
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-300">Mise actuelle :</span>
                      <span className="rounded-lg bg-emerald-950/80 border border-emerald-700/50 px-3 py-1 text-sm font-black text-amber-400">
                        {bjBet} {currencySymbol}
                      </span>
                    </div>
                  </div>

                  {/* Main du Croupier */}
                  <div className="my-8 text-center space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800/40">
                      <span>Main du Croupier</span>
                      <span className="font-bold text-amber-300">
                        {bjDealerRevealed ? `(Score : ${dealerScore})` : `(Score visible : ${dealerScore})`}
                      </span>
                    </div>

                    <div className="flex justify-center gap-3 min-h-[110px] items-center">
                      {bjDealerCards.map((card, i) => {
                        const isHidden = i === 1 && !bjDealerRevealed;
                        if (isHidden) {
                          return (
                            <div
                              key={i}
                              className="h-28 w-20 rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-900 via-amber-950 to-stone-900 flex items-center justify-center shadow-lg"
                            >
                              <span className="text-2xl font-black text-amber-500/60">ETH</span>
                            </div>
                          );
                        }
                        const isRed = ["♥", "♦"].includes(card.suit);
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="h-28 w-20 rounded-xl bg-white border border-stone-200 text-stone-900 shadow-xl flex flex-col justify-between p-2 font-bold"
                          >
                            <div className="flex justify-between items-start text-xs leading-none">
                              <span>{card.value}</span>
                              <span className={isRed ? "text-rose-600" : "text-stone-900"}>{card.suit}</span>
                            </div>
                            <div className={cn("text-center text-2xl", isRed ? "text-rose-600" : "text-stone-900")}>
                              {card.suit}
                            </div>
                            <div className="flex justify-between items-end text-xs leading-none rotate-180">
                              <span>{card.value}</span>
                              <span className={isRed ? "text-rose-600" : "text-stone-900"}>{card.suit}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Statut central de la manche */}
                  <div className="my-4 text-center">
                    {bjStatus === "blackjack" && (
                      <span className="inline-block rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-1.5 text-sm font-black text-amber-300 animate-pulse">
                        👑 BLACKJACK NATUREL ! (Gain 3:2)
                      </span>
                    )}
                    {bjStatus === "won" && (
                      <span className="inline-block rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-1.5 text-sm font-black text-emerald-300">
                        🎉 VICTOIRE DU JOUEUR !
                      </span>
                    )}
                    {bjStatus === "lost" && (
                      <span className="inline-block rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-1.5 text-sm font-black text-rose-300">
                        ❌ MAIN PERDUE
                      </span>
                    )}
                    {bjStatus === "push" && (
                      <span className="inline-block rounded-xl bg-blue-500/20 border border-blue-500/40 px-4 py-1.5 text-sm font-black text-blue-300">
                        🤝 ÉGALITÉ (PUSH) — MISE RENDUE
                      </span>
                    )}
                    {bjStatus === "playing" && (
                      <span className="text-xs text-emerald-300 font-medium">
                        À vous de jouer : Tirer, Rester ou Doubler.
                      </span>
                    )}
                  </div>

                  {/* Main du Joueur */}
                  <div className="my-8 text-center space-y-3">
                    <div className="flex justify-center gap-3 min-h-[110px] items-center">
                      {bjPlayerCards.map((card, i) => {
                        const isRed = ["♥", "♦"].includes(card.suit);
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="h-28 w-20 rounded-xl bg-white border border-stone-200 text-stone-900 shadow-xl flex flex-col justify-between p-2 font-bold"
                          >
                            <div className="flex justify-between items-start text-xs leading-none">
                              <span>{card.value}</span>
                              <span className={isRed ? "text-rose-600" : "text-stone-900"}>{card.suit}</span>
                            </div>
                            <div className={cn("text-center text-2xl", isRed ? "text-rose-600" : "text-stone-900")}>
                              {card.suit}
                            </div>
                            <div className="flex justify-between items-end text-xs leading-none rotate-180">
                              <span>{card.value}</span>
                              <span className={isRed ? "text-rose-600" : "text-stone-900"}>{card.suit}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-800/40">
                      <span>Votre Main</span>
                      <span className="font-bold text-amber-300">(Score : {playerScore})</span>
                    </div>
                  </div>

                  {/* Contrôles de jeu */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-emerald-800/40">
                    {bjStatus === "playing" ? (
                      <>
                        <button
                          type="button"
                          onClick={handleBjHit}
                          className="rounded-xl border border-emerald-500/40 bg-emerald-600/80 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                        >
                          🃏 Tirer (Hit)
                        </button>
                        <button
                          type="button"
                          onClick={handleBjStand}
                          className="rounded-xl border border-amber-500/40 bg-amber-600/80 hover:bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                        >
                          🛑 Rester (Stand)
                        </button>
                        {bjPlayerCards.length === 2 && (
                          <button
                            type="button"
                            onClick={handleBjDouble}
                            className="rounded-xl border border-indigo-500/40 bg-indigo-600/80 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                          >
                            💰 Doubler (Double)
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={startNewBlackjackRound}
                        className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 px-6 py-2.5 text-xs font-black text-stone-950 shadow-lg transition-all cursor-pointer"
                      >
                        ✨ Distribuer une Nouvelle Main
                      </button>
                    )}
                  </div>

                  {/* Sélecteur de jetons */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[11px] text-emerald-400/80 font-semibold mr-2">Jetons :</span>
                    {[25, 50, 100, 250, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setBjBet(val);
                          playSound("chip");
                        }}
                        className={cn(
                          "h-8 w-8 rounded-full border text-[11px] font-black flex items-center justify-center transition-all cursor-pointer shadow-sm",
                          bjBet === val
                            ? "bg-amber-400 text-stone-950 border-white scale-110 ring-2 ring-amber-400/50"
                            : "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:border-amber-400"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guide de commande Slash Discord */}
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Bot size={15} className="text-indigo-400" />
                      Commande Slash sur votre Discord
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      Vos membres peuvent lancer des parties directement avec des boutons interactifs en tapant :
                    </p>
                  </div>
                  <code className="rounded-lg bg-stone-950/80 border border-stone-800 px-3 py-1.5 text-xs font-mono text-amber-400">
                    /blackjack mise:{bjBet}
                  </code>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 3 : ROULETTE ROYALE                                */}
          {/* ======================================================== */}
          {activeTab === "roulette" && (
            <motion.div
              key="tab-roulette"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-6">
                {/* Plateau de Roulette Royale */}
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1c120c] via-[#120a06] to-[#0a0503] p-8 shadow-2xl text-white">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Roue animée */}
                    <div className="flex flex-col items-center gap-4 shrink-0">
                      <div className="relative h-56 w-56 rounded-full border-4 border-amber-500/40 bg-gradient-to-tr from-stone-950 to-amber-950 p-2 shadow-2xl flex items-center justify-center">
                        {/* Anneau extérieur */}
                        <div
                          className={cn(
                            "absolute inset-2 rounded-full border-2 border-dashed border-amber-500/30 transition-transform duration-1000",
                            rouletteSpinning && "animate-spin"
                          )}
                        />
                        {/* Bille & Résultat */}
                        <div className="relative z-10 flex flex-col items-center justify-center">
                          <span className="text-xs uppercase font-bold text-amber-400/80">Numéro</span>
                          <span
                            className={cn(
                              "text-5xl font-black drop-shadow-lg",
                              rouletteResultColor === "rouge"
                                ? "text-rose-500"
                                : rouletteResultColor === "vert"
                                ? "text-emerald-400"
                                : "text-zinc-200"
                            )}
                          >
                            {rouletteSpinning ? "?" : rouletteResultNumber ?? "—"}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                            {rouletteSpinning ? "En rotation..." : rouletteResultColor ?? "Pas encore lancée"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={rouletteSpinning}
                        onClick={handleSpinRoulette}
                        className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 px-6 py-2.5 text-xs font-black text-stone-950 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {rouletteSpinning ? "La bille tourne..." : "🎰 Faire tourner la Roulette"}
                      </button>
                    </div>

                    {/* Tapis de mises */}
                    <div className="flex-1 w-full space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-800/40 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                          Choix de Mise
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">Mise :</span>
                          <span className="rounded-lg bg-stone-900 border border-stone-800 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                            {rouletteBet} {currencySymbol}
                          </span>
                          <div className="flex items-center gap-1 ml-1">
                            {[25, 50, 100, 250, 500].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setRouletteBet(val);
                                  playSound("chip");
                                }}
                                className={cn(
                                  "h-6 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer",
                                  rouletteBet === val
                                    ? "bg-amber-400 text-stone-950 border-amber-300"
                                    : "bg-stone-900/80 text-stone-300 border-stone-800 hover:border-amber-400"
                                )}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Options de mises simples */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: "rouge", label: "🔴 Rouge (x2)", bg: "bg-rose-900/40 border-rose-600/40 text-rose-200" },
                          { id: "noir", label: "⚫ Noir (x2)", bg: "bg-stone-900/80 border-stone-700 text-stone-200" },
                          { id: "pair", label: "⚖️ Pair (x2)", bg: "bg-indigo-950/60 border-indigo-700/40 text-indigo-200" },
                          { id: "impair", label: "🎲 Impair (x2)", bg: "bg-purple-950/60 border-purple-700/40 text-purple-200" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setRouletteChoice(opt.id);
                              playSound("chip");
                            }}
                            className={cn(
                              "rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                              opt.bg,
                              rouletteChoice === opt.id && "ring-2 ring-amber-400 scale-[1.02] shadow-lg shadow-amber-500/10"
                            )}
                          >
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Grille numéros favoris */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                          Ou pari sur Numéro Plein (Paiement direct x36) :
                        </span>
                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {Array.from({ length: 37 }, (_, i) => i).map((num) => {
                            const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);
                            const isGreen = num === 0;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  setRouletteChoice(String(num));
                                  playSound("chip");
                                }}
                                className={cn(
                                  "h-8 rounded-lg border text-xs font-black transition-all cursor-pointer flex items-center justify-center",
                                  isGreen
                                    ? "bg-emerald-900/80 border-emerald-600 text-emerald-200"
                                    : isRed
                                    ? "bg-rose-950/80 border-rose-700 text-rose-200"
                                    : "bg-stone-900 border-stone-800 text-stone-200",
                                  rouletteChoice === String(num) && "ring-2 ring-amber-400 scale-105"
                                )}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Résultat du tirage */}
                      {rouletteOutcome && (
                        <div
                          className={cn(
                            "rounded-xl border p-3 text-xs font-bold text-center",
                            rouletteOutcome.won
                              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                          )}
                        >
                          {rouletteOutcome.msg}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Guide Slash Command */}
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Bot size={15} className="text-indigo-400" />
                      Commande Slash Roulette Discord
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      Vos membres peuvent parier sur un numéro ou une couleur :
                    </p>
                  </div>
                  <code className="rounded-lg bg-stone-950/80 border border-stone-800 px-3 py-1.5 text-xs font-mono text-amber-400">
                    /roulette mise:{rouletteBet} pari:{rouletteChoice}
                  </code>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 4 : ARÈNE DE DUELS PVP                             */}
          {/* ======================================================== */}
          {activeTab === "dice" && (
            <motion.div
              key="tab-dice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-6">
                {/* Arène de duel PvP */}
                <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-[#0f1124] via-[#090b16] to-[#05060b] p-8 shadow-2xl text-white">
                  <div className="text-center space-y-1 pb-6 border-b border-indigo-900/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Arène de Duel PvP • 2d6 Clash
                    </span>
                    <h3 className="text-xl font-black text-white">
                      Défiez un membre et rafler la mise
                    </h3>
                  </div>

                  <div className="my-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Challenger (Vous) */}
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-6">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
                          {profile?.user?.username ? profile.user.username[0]?.toUpperCase() : "V"}
                        </div>
                        <span className="text-sm font-bold text-indigo-200">
                          {profile?.user?.username ? profile.user.username : "Vous (Challenger)"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-indigo-400/40 bg-indigo-900/40 text-3xl font-black text-white shadow-lg">
                          {dicePlayerRoll?.[0] ?? "–"}
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-indigo-400/40 bg-indigo-900/40 text-3xl font-black text-white shadow-lg">
                          {dicePlayerRoll?.[1] ?? "–"}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-300">
                        Total : {dicePlayerRoll ? dicePlayerRoll[0] + dicePlayerRoll[1] : "–"}
                      </span>
                    </div>

                    {/* Adversaire */}
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-6">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-rose-600 flex items-center justify-center font-bold text-xs text-white">
                          A
                        </div>
                        <span className="text-sm font-bold text-rose-200">
                          Le bot
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-rose-400/40 bg-rose-900/40 text-3xl font-black text-white shadow-lg">
                          {diceOpponentRoll?.[0] ?? "–"}
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-rose-400/40 bg-rose-900/40 text-3xl font-black text-white shadow-lg">
                          {diceOpponentRoll?.[1] ?? "–"}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-rose-300">
                        Total : {diceOpponentRoll ? diceOpponentRoll[0] + diceOpponentRoll[1] : "–"}
                      </span>
                    </div>
                  </div>

                  {/* Bannière d'issue de duel */}
                  {diceOutcome && (
                    <div className="my-4 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-xl border px-4 py-2 text-xs font-bold",
                          diceOutcome.won
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                            : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                        )}
                      >
                        {diceOutcome.msg}
                      </span>
                    </div>
                  )}

                  {/* Bouton de lancer de duel */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-indigo-900/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-300">Mise du duel :</span>
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        value={diceBet}
                        onChange={(e) => setDiceBet(parseInt(e.target.value, 10) || 10)}
                        className="w-24 rounded-lg border border-indigo-800 bg-indigo-950 px-2.5 py-1 text-xs font-bold text-amber-300 text-center"
                      />
                      <span className="text-xs text-amber-400">{currencySymbol}</span>
                    </div>

                    <button
                      type="button"
                      disabled={diceRolling}
                      onClick={handleRollDiceDuel}
                      className="rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 px-6 py-2.5 text-xs font-black text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {diceRolling ? "Jet de dés en cours..." : "🎲 Lancer le Duel de Dés"}
                    </button>
                  </div>
                </div>

                {/* Guide Slash Command */}
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Bot size={15} className="text-indigo-400" />
                      Commande Slash Duel PvP
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      Défiez un membre avec boutons d&apos;acceptation/refus Discord :
                    </p>
                  </div>
                  <code className="rounded-lg bg-stone-950/80 border border-stone-800 px-3 py-1.5 text-xs font-mono text-amber-400">
                    /dice mise:{diceBet} adversaire:@ami
                  </code>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 5 : PARAMÈTRES & BANQUE                            */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activation des mini-jeux */}
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Gamepad2 size={16} className="text-amber-400" />
                    Jeux Autorisés sur le Serveur
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Activez ou désactivez chaque attraction indépendamment selon l&apos;ambiance de votre communauté.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      {
                        key: "blackjackEnabled",
                        label: "Table Blackjack 21",
                        hint: "Bataille de cartes interactive avec boutons Tirer/Rester/Doubler.",
                      },
                      {
                        key: "rouletteEnabled",
                        label: "Roulette Royale",
                        hint: "Pari couleur, parité et numéros pleins (36x).",
                      },
                      {
                        key: "diceEnabled",
                        label: "Duels de Dés PvP",
                        hint: "Affrontements directs entre 2 membres avec cagnotte partagée.",
                      },
                      {
                        key: "dailySpinEnabled",
                        label: "Roue Quotidienne (/casino daily)",
                        hint: "Bonus de fidélité gratuit toutes les 24 heures.",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3.5 transition-colors hover:border-[var(--input-border-hover)] cursor-pointer"
                      >
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-primary)] block">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {item.hint}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={(config as any)[item.key]}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Limites de mises et Cagnotte */}
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Coins size={16} className="text-amber-400" />
                    Limites Financières & Cagnotte
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Régulez l&apos;économie du serveur en définissant des planchers et plafonds de mises.
                  </p>

                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                          Mise Minimale ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={config.minBet}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, minBet: parseInt(e.target.value, 10) || 1 }))
                          }
                          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                          Mise Maximale ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          min={10}
                          value={config.maxBet}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, maxBet: parseInt(e.target.value, 10) || 1000 }))
                          }
                          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                        Prélèvement pour le Jackpot (% par mise)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={config.jackpotContributionPercent}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            jackpotContributionPercent: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                      />
                      <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                        Recommandé : 1% à 3% pour une croissance fluide du jackpot.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                        Cooldown Anti-Spam (Secondes)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={config.cooldownSeconds}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            cooldownSeconds: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Liaison Système Monétaire Ethone Coin */}
                <div className="lg:col-span-2 rounded-2xl border border-amber-500/30 bg-[var(--surface-raised)]/40 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <WalletIcon size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                          Liaison Système Monétaire Ethone Coin
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              economyEnabled
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            )}
                          >
                            {economyEnabled ? "Connecté & Synchronisé" : "Économie non configurée"}
                          </span>
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Les jeux d&apos;argent du casino sont branchés sur la monnaie officielle configurée sur votre serveur Discord.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/discord/economy?guildId=${selectedGuildId}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2 text-xs font-bold text-amber-300 transition-colors shrink-0"
                    >
                      <Coins size={14} />
                      <span>Paramètres Économie</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[11px] text-[var(--text-muted)] block">Nom de la Devise</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5 block">{currencyName}</span>
                    </div>
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[11px] text-[var(--text-muted)] block">Symbole Monétaire</span>
                      <span className="text-sm font-black text-amber-400 mt-0.5 block">{currencySymbol}</span>
                    </div>
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3">
                      <span className="text-[11px] text-[var(--text-muted)] block">Traçabilité Comptable</span>
                      <span className="text-xs font-semibold text-emerald-400 mt-0.5 block">Grand livre & /daily /work reliés</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton de sauvegarde */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 px-6 py-2.5 text-xs font-black text-stone-950 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{saving ? "Enregistrement..." : "Sauvegarder les Paramètres du Casino"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* ONGLET 6 : APERÇU EMBED DISCORD                          */}
          {/* ======================================================== */}
          {activeTab === "preview" && (
            <motion.div
              key="tab-preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Eye size={16} className="text-amber-400" />
                      Aperçu de l&apos;Embed Discord en Direct
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Rendu exact de ce que vos membres voient dans leur salon textuel.
                    </p>
                  </div>

                  {/* Sélecteur de type d'embed */}
                  <div className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-1">
                    {[
                      { id: "blackjack", label: "Blackjack 21" },
                      { id: "roulette", label: "Roulette" },
                      { id: "dice", label: "Duel Dés" },
                      { id: "jackpot", label: "Jackpot Win" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreviewTab(p.id as any)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                          previewTab === p.id
                            ? "bg-amber-500/20 text-amber-300 font-bold"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rendu Embed Dark Discord */}
                <div className="rounded-xl border border-stone-800 bg-[#2b2d31] p-5 text-stone-200 max-w-xl shadow-xl font-sans text-xs">
                  {/* Header Bot */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center font-bold text-[10px] text-white">
                      ETH
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">ETHONE</span>
                      <span className="rounded bg-[#5865f2] px-1 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                        BOT
                      </span>
                      <span className="text-[10px] text-stone-400">Aujourd&apos;hui à 19:42</span>
                    </div>
                  </div>

                  {/* Corps Embed avec bande latérale colorée */}
                  <div
                    className={cn(
                      "rounded-md bg-[#232428] p-4 border-l-4 space-y-3",
                      previewTab === "blackjack"
                        ? "border-emerald-500"
                        : previewTab === "roulette"
                        ? "border-rose-500"
                        : previewTab === "dice"
                        ? "border-indigo-500"
                        : "border-amber-400"
                    )}
                  >
                    {/* Titre Embed */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {previewTab === "blackjack" && "🃏 Blackjack 21 • Résultat de la main"}
                        {previewTab === "roulette" && "🎰 Roulette Royale • Tirage de la bille"}
                        {previewTab === "dice" && "🎲 Duel de Dés • Victoire"}
                        {previewTab === "jackpot" && "👑 JACKPOT PROGRESSIF DÉCROCHÉ !"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-stone-300 leading-relaxed text-[11px]">
                      {previewTab === "blackjack" && `Félicitations ${profile?.user?.username || "joueur"} ! Vous remportez la manche contre le croupier.`}
                      {previewTab === "roulette" && "La bille s'arrête sur le 14 Rouge. Vos gains ont été crédités !"}
                      {previewTab === "dice" && `${profile?.user?.username || "Le joueur"} bat le bot avec un score de 11 contre 8 !`}
                      {previewTab === "jackpot" && `${profile?.user?.username || "Un joueur"} vient d'empocher la cagnotte progressive !`}
                    </p>

                    {/* Champs de données */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-800 text-[11px]">
                      <div>
                        <span className="text-stone-400 font-semibold block">Mise initiale</span>
                        <span className="text-white font-bold">250 {currencySymbol}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 font-semibold block">Gain net</span>
                        <span className="text-emerald-400 font-bold">
                          {previewTab === "jackpot"
                            ? `+${overview.jackpotPool.toLocaleString("fr-FR")} ${currencySymbol}`
                            : `+500 ${currencySymbol}`}
                        </span>
                      </div>
                    </div>

                    {/* Footer Embed */}
                    <div className="pt-2 text-[10px] text-stone-400 flex items-center justify-between">
                      <span>{currentGuildName} • Module Casino</span>
                      <span>Solde : 4 820 {currencySymbol}</span>
                    </div>
                  </div>

                  {/* Boutons interactifs Discord sous le message */}
                  {previewTab === "blackjack" && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        className="rounded bg-[#4e5058] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#6d6f78] transition-colors"
                      >
                        🃏 Tirer
                      </button>
                      <button
                        type="button"
                        className="rounded bg-[#4e5058] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#6d6f78] transition-colors"
                      >
                        🛑 Rester
                      </button>
                      <button
                        type="button"
                        className="rounded bg-[#4e5058] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#6d6f78] transition-colors"
                      >
                        💰 Doubler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
