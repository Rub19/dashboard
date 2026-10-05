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
  Bot,
  Volume2,
  VolumeX,
  Eye,
  X,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { useDiscordSync } from "@/lib/useDiscordSync";
import { cn } from "@/lib/utils";
import { GuildSelector } from "@/components/GuildSelector";
import ModulePageTitle from "@/components/discord/ModulePageTitle";
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

export interface ActiveQuest {
  id: string;
  title: string;
  description: string;
  gameType: GameType;
  requiredCount: number;
  rewardCredits: number;
  rewardXp: number;
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

const DEFAULT_OVERVIEW: GamesOverview = {
  enabled: true,
  jackpotPool: 8450,
  totalGamesPlayed: 342,
  totalBets: 48900,
  totalPayouts: 46120,
  biggestWin: {
    username: "Alex_HighRoller",
    amount: 7200,
    game: "Roulette Royale (Plein #17)",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  recentGames: [
    {
      id: "rec_1",
      guildId: "",
      userId: "u1",
      username: "ShadowKnight",
      gameType: "blackjack",
      bet: 250,
      payout: 625,
      net: 375,
      won: true,
      detail: "Blackjack Naturel 21 (A♠ K♦)",
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: "rec_2",
      guildId: "",
      userId: "u2",
      username: "Valkyrie99",
      gameType: "roulette",
      bet: 100,
      payout: 200,
      net: 100,
      won: true,
      detail: "Rouge (Numéro 14 Rouge)",
      timestamp: new Date(Date.now() - 450000).toISOString(),
    },
    {
      id: "rec_3",
      guildId: "",
      userId: "u3",
      username: "PixelMaster",
      gameType: "dice",
      bet: 500,
      payout: 1000,
      net: 500,
      won: true,
      detail: "Duel remporté 11 contre 8",
      timestamp: new Date(Date.now() - 900000).toISOString(),
    },
    {
      id: "rec_4",
      guildId: "",
      userId: "u4",
      username: "CyberGhost",
      gameType: "blackjack",
      bet: 150,
      payout: 0,
      net: -150,
      won: false,
      detail: "Bust du joueur (23)",
      timestamp: new Date(Date.now() - 1500000).toISOString(),
    },
  ],
  topWinners: [
    { userId: "u1", username: "Alex_HighRoller", totalWon: 14200, gamesPlayed: 48 },
    { userId: "u2", username: "ShadowKnight", totalWon: 9850, gamesPlayed: 62 },
    { userId: "u3", username: "Valkyrie99", totalWon: 6400, gamesPlayed: 35 },
    { userId: "u4", username: "LuckyStrike", totalWon: 4120, gamesPlayed: 19 },
  ],
};

const DEFAULT_QUESTS: ActiveQuest[] = [
  {
    id: "quest_bj_21",
    title: "Maître du 21",
    description: "Remportez 3 mains au Blackjack contre le croupier sans dépasser 21.",
    gameType: "blackjack",
    requiredCount: 3,
    rewardCredits: 350,
    rewardXp: 120,
  },
  {
    id: "quest_roulette_color",
    title: "Flamme Écarlate",
    description: "Misez et gagnez 2 fois sur la couleur Rouge à la Roulette Royale.",
    gameType: "roulette",
    requiredCount: 2,
    rewardCredits: 200,
    rewardXp: 80,
  },
  {
    id: "quest_dice_duel",
    title: "Gladiateur des Dés",
    description: "Défiez un membre du serveur et remportez 1 duel de dés PvP.",
    gameType: "dice",
    requiredCount: 1,
    rewardCredits: 500,
    rewardXp: 200,
  },
  {
    id: "quest_daily_spin",
    title: "Roue de la Fortune",
    description: "Faites tourner la roue quotidienne pour débloquer votre bonus de fidélité.",
    gameType: "spin",
    requiredCount: 1,
    rewardCredits: 150,
    rewardXp: 50,
  },
];

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
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.3); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "spin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(640, now + 0.15);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "dice") {
      osc.type = "square";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch {
    // Web audio non supporté ou bloqué par le navigateur
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
    } else if (["K", "Q", "J"].includes(c.value)) {
      score += 10;
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

function generateRandomCard(): Card {
  const suits: Array<"♠" | "♥" | "♦" | "♣"> = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const value = values[Math.floor(Math.random() * values.length)];
  const num = value === "A" ? 11 : ["K", "Q", "J"].includes(value) ? 10 : parseInt(value, 10);
  return { suit, value, num };
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Données du Casino
  const [config, setConfig] = useState<GamesConfig>(DEFAULT_CONFIG);
  const [overview, setOverview] = useState<GamesOverview>(DEFAULT_OVERVIEW);
  const [quests, setQuests] = useState<ActiveQuest[]>(DEFAULT_QUESTS);

  // Onglet actif : overview | blackjack | roulette | dice | settings
  const [activeTab, setActiveTab] = useState<"overview" | "blackjack" | "roulette" | "dice" | "settings">("overview");

  // Démo interactive Blackjack
  const [bjBet, setBjBet] = useState(100);
  const [bjPlayerCards, setBjPlayerCards] = useState<Card[]>([
    { suit: "♠", value: "A", num: 11 },
    { suit: "♦", value: "K", num: 10 },
  ]);
  const [bjDealerCards, setBjDealerCards] = useState<Card[]>([
    { suit: "♥", value: "10", num: 10 },
    { suit: "♣", value: "7", num: 7 },
  ]);
  const [bjStatus, setBjStatus] = useState<"playing" | "won" | "lost" | "push" | "blackjack">("blackjack");
  const [bjDealerRevealed, setBjDealerRevealed] = useState(true);

  // Démo interactive Roulette
  const [rouletteBet, setRouletteBet] = useState(50);
  const [rouletteChoice, setRouletteChoice] = useState<string>("rouge");
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteResultNumber, setRouletteResultNumber] = useState<number>(14);
  const [rouletteResultColor, setRouletteResultColor] = useState<"rouge" | "noir" | "vert">("rouge");
  const [rouletteOutcome, setRouletteOutcome] = useState<{ won: boolean; payout: number; msg: string } | null>({
    won: true,
    payout: 100,
    msg: "Victoire ! Le 14 Rouge paie 2:1 (+50 🪙)",
  });

  // Démo interactive Dés PvP
  const [diceBet, setDiceBet] = useState(100);
  const [diceRolling, setDiceRolling] = useState(false);
  const [dicePlayerRoll, setDicePlayerRoll] = useState<[number, number]>([5, 6]);
  const [diceOpponentRoll, setDiceOpponentRoll] = useState<[number, number]>([4, 4]);
  const [diceOutcome, setDiceOutcome] = useState<{ won: boolean; msg: string } | null>({
    won: true,
    msg: "Victoire écrasante 11 contre 8 ! (+100 🪙)",
  });

  // Aperçu Embed Discord
  const [previewTab, setPreviewTab] = useState<"blackjack" | "roulette" | "dice" | "jackpot">("blackjack");

  // Simulateur Discord Modal
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simGame, setSimGame] = useState<GameType>("blackjack");
  const [simBet, setSimBet] = useState(250);
  const [simChannelId, setSimChannelId] = useState<string>("");
  const [simRunning, setSimRunning] = useState(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);

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
    },
  });

  // Jouer son si actif
  const playSound = useCallback((type: "card" | "chip" | "win" | "spin" | "dice") => {
    if (soundEnabled) {
      playProceduralSound(type);
    }
  }, [soundEnabled]);

  // Chargement des données du casino
  const fetchCasinoData = useCallback(async (guildId: string) => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [ovRes, cfgRes, questRes] = await Promise.allSettled([
        fetch(`${BOT_API_URL}/api/guilds/${guildId}/games/overview`),
        fetch(`${BOT_API_URL}/api/guilds/${guildId}/games/config`),
        fetch(`${BOT_API_URL}/api/guilds/${guildId}/games/quests`),
      ]);

      if (ovRes.status === "fulfilled" && ovRes.value.ok) {
        const ov = await ovRes.value.json();
        setOverview(ov);
      }
      if (cfgRes.status === "fulfilled" && cfgRes.value.ok) {
        const cfg = await cfgRes.value.json();
        setConfig(cfg);
      }
      if (questRes.status === "fulfilled" && questRes.value.ok) {
        const q = await questRes.value.json();
        if (q.quests) setQuests(q.quests);
      }
    } catch {
      // Fallback gracieux sur données par défaut
    } finally {
      setLoading(false);
    }
  }, []);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Impossible d'alimenter la cagnotte");
      const data = await res.json();
      setOverview((prev) => ({ ...prev, jackpotPool: data.jackpotPool }));
      success("Cagnotte alimentée !", `+${amount} 🪙 ajoutés à la cagnotte progressive.`);
      playSound("win");
    } catch (err) {
      toastError("Erreur", formatApiError(err));
    }
  };

  // Démo Blackjack : Démarrer une nouvelle main
  const startNewBlackjackRound = () => {
    playSound("card");
    const p1 = generateRandomCard();
    const p2 = generateRandomCard();
    const d1 = generateRandomCard();
    const d2 = generateRandomCard();
    const pCards = [p1, p2];
    const dCards = [d1, d2];
    setBjPlayerCards(pCards);
    setBjDealerCards(dCards);
    setBjDealerRevealed(false);

    const pScore = calculateHandScore(pCards);
    if (pScore === 21) {
      setBjDealerRevealed(true);
      setBjStatus("blackjack");
      playSound("win");
    } else {
      setBjStatus("playing");
    }
  };

  // Démo Blackjack : Tirer (Hit)
  const handleBjHit = () => {
    if (bjStatus !== "playing") return;
    playSound("card");
    const nextCard = generateRandomCard();
    const newCards = [...bjPlayerCards, nextCard];
    setBjPlayerCards(newCards);
    const score = calculateHandScore(newCards);
    if (score > 21) {
      setBjDealerRevealed(true);
      setBjStatus("lost");
    }
  };

  // Démo Blackjack : Rester (Stand)
  const handleBjStand = () => {
    if (bjStatus !== "playing") return;
    playSound("card");
    setBjDealerRevealed(true);
    let currentDealerCards = [...bjDealerCards];
    let dScore = calculateHandScore(currentDealerCards);

    while (dScore < 17) {
      const c = generateRandomCard();
      currentDealerCards.push(c);
      dScore = calculateHandScore(currentDealerCards);
    }
    setBjDealerCards(currentDealerCards);

    const pScore = calculateHandScore(bjPlayerCards);
    if (dScore > 21) {
      setBjStatus("won");
      playSound("win");
    } else if (pScore > dScore) {
      setBjStatus("won");
      playSound("win");
    } else if (pScore < dScore) {
      setBjStatus("lost");
    } else {
      setBjStatus("push");
    }
  };

  // Démo Blackjack : Doubler (Double)
  const handleBjDouble = () => {
    if (bjStatus !== "playing" || bjPlayerCards.length !== 2) return;
    playSound("chip");
    setBjBet((prev) => prev * 2);
    playSound("card");
    const nextCard = generateRandomCard();
    const newCards = [...bjPlayerCards, nextCard];
    setBjPlayerCards(newCards);
    setBjDealerRevealed(true);

    const pScore = calculateHandScore(newCards);
    if (pScore > 21) {
      setBjStatus("lost");
      return;
    }

    let currentDealerCards = [...bjDealerCards];
    let dScore = calculateHandScore(currentDealerCards);
    while (dScore < 17) {
      const c = generateRandomCard();
      currentDealerCards.push(c);
      dScore = calculateHandScore(currentDealerCards);
    }
    setBjDealerCards(currentDealerCards);

    if (dScore > 21 || pScore > dScore) {
      setBjStatus("won");
      playSound("win");
    } else if (pScore < dScore) {
      setBjStatus("lost");
    } else {
      setBjStatus("push");
    }
  };

  // Démo Roulette : Lancer la bille
  const handleSpinRoulette = () => {
    if (rouletteSpinning) return;
    setRouletteSpinning(true);
    playSound("spin");
    setRouletteOutcome(null);

    setTimeout(() => {
      const num = Math.floor(Math.random() * 37);
      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      let color: "rouge" | "noir" | "vert" = num === 0 ? "vert" : redNumbers.includes(num) ? "rouge" : "noir";

      setRouletteResultNumber(num);
      setRouletteResultColor(color);
      setRouletteSpinning(false);

      let won = false;
      let multiplier = 0;
      if (rouletteChoice === "rouge" && color === "rouge") {
        won = true;
        multiplier = 2;
      } else if (rouletteChoice === "noir" && color === "noir") {
        won = true;
        multiplier = 2;
      } else if (rouletteChoice === "pair" && num > 0 && num % 2 === 0) {
        won = true;
        multiplier = 2;
      } else if (rouletteChoice === "impair" && num % 2 === 1) {
        won = true;
        multiplier = 2;
      } else if (rouletteChoice === String(num)) {
        won = true;
        multiplier = 36;
      }

      if (won) {
        const payout = rouletteBet * multiplier;
        setRouletteOutcome({
          won: true,
          payout,
          msg: `Gagné ! Numéro ${num} (${color.toUpperCase()}) — gain de +${payout - rouletteBet} 🪙`,
        });
        playSound("win");
      } else {
        setRouletteOutcome({
          won: false,
          payout: 0,
          msg: `Perdu... Le ${num} (${color.toUpperCase()}) est tombé. Retentez votre chance !`,
        });
      }
    }, 1800);
  };

  // Démo Dés PvP : Duel
  const handleRollDiceDuel = () => {
    if (diceRolling) return;
    setDiceRolling(true);
    playSound("dice");
    setDiceOutcome(null);

    setTimeout(() => {
      const p1: [number, number] = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      const p2: [number, number] = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      setDicePlayerRoll(p1);
      setDiceOpponentRoll(p2);
      setDiceRolling(false);

      const sum1 = p1[0] + p1[1];
      const sum2 = p2[0] + p2[1];

      if (sum1 > sum2) {
        setDiceOutcome({ won: true, msg: `Victoire éclatante ! ${sum1} contre ${sum2} (+${diceBet} 🪙)` });
        playSound("win");
      } else if (sum1 < sum2) {
        setDiceOutcome({ won: false, msg: `Défaite... L'adversaire l'emporte avec ${sum2} contre vos ${sum1}.` });
      } else {
        setDiceOutcome({ won: false, msg: `Égalité parfaite (${sum1} partout) ! Mise remboursée.` });
      }
    }, 1200);
  };

  // Simulation Discord
  const handleExecuteSimulation = async () => {
    if (!selectedGuildId) return;
    setSimRunning(true);
    setSimSuccessMsg(null);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${selectedGuildId}/games/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: simGame, bet: simBet, channelId: simChannelId || undefined }),
      });
      if (!res.ok) throw new Error("Échec de la simulation");
      await res.json();
      setSimSuccessMsg(`Partie de simulation (${simGame.toUpperCase()}) enregistrée avec succès !`);
      fetchCasinoData(selectedGuildId);
      playSound("win");
    } catch (err) {
      toastError("Erreur simulation", formatApiError(err));
    } finally {
      setSimRunning(false);
    }
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
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Titre Module */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/discord"
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={14} />
              Retour au Hub Discord
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                aria-label="Effets sonores"
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                  soundEnabled
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{soundEnabled ? "Effets sonores activés" : "Son coupé"}</span>
              </button>

              <button
                type="button"
                onClick={() => fetchCasinoData(selectedGuildId)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--input-border-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                Actualiser
              </button>

              <button
                type="button"
                onClick={() => setSimModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-sm hover:from-amber-500/30 hover:to-yellow-500/30 transition-all cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-400" />
                Simulateur de Casino
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <ModulePageTitle
              icon={<Dice5 className="h-5 w-5 text-amber-400" />}
              title="Mini-Jeux & Casino Communautaire"
              subtitle="Blackjack 21, Roulette Royale, Duels de dés PvP, cagnotte progressive et quêtes actives récompensées."
              badge={
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  Gaming & Économie
                </span>
              }
            />

            <div className="shrink-0">
              {manageableGuilds.length > 0 && selectedGuild && (
                <GuildSelector
                  guilds={manageableGuilds}
                  value={selectedGuild.id}
                  onChange={(guild: DiscordGuild) => {
                    userSelectedRef.current = true;
                    setSelectedGuild(guild);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 4 Cartes de statistiques clés avec lueur Sonoma */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cagnotte Jackpot Progressive */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[var(--panel-radius)] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--surface-raised)]/60 to-[var(--surface-raised)]/30 p-5 backdrop-blur-xl shadow-lg shadow-amber-500/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                Cagnotte Jackpot
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                +{config.jackpotContributionPercent}% / mise
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                {overview.jackpotPool.toLocaleString("fr-FR")}
              </span>
              <span className="text-base font-semibold text-amber-400">🪙</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Alimentée en continu</span>
              <button
                type="button"
                onClick={() => handleSeedJackpot(1000)}
                className="text-[11px] font-semibold text-amber-400 underline decoration-amber-400/40 hover:decoration-amber-400 cursor-pointer"
              >
                +1 000 🪙 (Admin)
              </button>
            </div>
          </motion.div>

          {/* Total des parties */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Dice5 size={14} className="text-indigo-400" />
                Parties Jouées
              </span>
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Actif 24/7
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {overview.totalGamesPlayed.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs text-[var(--text-muted)]">parties</span>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)] truncate">
              BJ (42%) • Roulette (36%) • Dés (22%)
            </p>
          </motion.div>

          {/* Volume des mises vs gains (RTP) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Coins size={14} className="text-yellow-400" />
                Volume & RTP Joueur
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                {overview.totalBets > 0
                  ? `${Math.round((overview.totalPayouts / overview.totalBets) * 100)}% RTP`
                  : "96.4% RTP"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {overview.totalBets.toLocaleString("fr-FR")} 🪙
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {overview.totalPayouts.toLocaleString("fr-FR")} 🪙 redistribués aux joueurs
            </p>
          </motion.div>

          {/* Plus gros gain historique */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-400" />
                Record de Gain
              </span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Légendaire
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-amber-400">
                +{overview.biggestWin ? overview.biggestWin.amount.toLocaleString("fr-FR") : "7 200"}
              </span>
              <span className="text-xs font-medium text-amber-300">🪙</span>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)] truncate">
              {overview.biggestWin ? `${overview.biggestWin.username} (${overview.biggestWin.game})` : "Alex_HighRoller"}
            </p>
          </motion.div>
        </div>

        {/* Barre d'onglets Sonoma */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] pb-3">
          {[
            { id: "overview", label: "Vue d'ensemble & Cagnotte", icon: Flame },
            { id: "blackjack", label: "Table Blackjack 21", icon: Gamepad2 },
            { id: "roulette", label: "Roulette Royale", icon: Sparkles },
            { id: "dice", label: "Arène de Duels PvP", icon: Dice5 },
            { id: "settings", label: "Paramètres & Banque", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  playSound("card");
                }}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]/40 hover:text-[var(--text-primary)]"
                )}
              >
                <Icon size={15} className={active ? "text-amber-400" : "text-[var(--text-muted)]"} />
                <span>{tab.label}</span>
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
              className="space-y-8"
            >
              {/* Bannière Coffre-fort du Jackpot */}
              <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[var(--surface-raised)]/40 p-6 backdrop-blur-xl">
                <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <Crown size={14} />
                      </span>
                      <h3 className="text-lg font-bold text-amber-200">
                        Cagnotte Progressive du Serveur
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Chaque pari placé dans le casino contribue à hauteur de {config.jackpotContributionPercent}% dans le trésor commun. Le jackpot se déclenche automatiquement lors d&apos;un Blackjack Naturel 21 doré ou d&apos;un 777 à la roulette.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-400/80 block">Trésor Actuel</span>
                      <span className="text-3xl font-black text-amber-300 drop-shadow-md">
                        {overview.jackpotPool.toLocaleString("fr-FR")} 🪙
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSeedJackpot(500)}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer"
                    >
                      +500 🪙 Injecter
                    </button>
                  </div>
                </div>
              </div>

              {/* Grille : Quêtes Actives + Classement des Gagnants */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quêtes communautaires actives */}
                <div className="space-y-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Quêtes Actives de la Semaine
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Récompenses auto
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Accomplir ces objectifs en jouant sur Discord débloque des crédits et de l&apos;expérience bonus pour le leveling.
                  </p>

                  <div className="space-y-3 pt-2">
                    {quests.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 p-3.5 transition-all hover:border-amber-500/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">
                              {q.title}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                              {q.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-300">
                              +{q.rewardCredits} 🪙
                            </span>
                            <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[11px] font-bold text-indigo-300">
                              +{q.rewardXp} XP
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>Objectif : {q.requiredCount}x {q.gameType}</span>
                          <span className="text-amber-400 font-semibold">En cours</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Gagnants du Serveur */}
                <div className="space-y-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Classement des Plus Grands Gagnants
                      </h3>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Derniers 30 jours
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {overview.topWinners.map((winner, idx) => {
                      const medalColors = [
                        "text-amber-300 border-amber-500/40 bg-amber-500/15",
                        "text-zinc-200 border-zinc-400/40 bg-zinc-400/15",
                        "text-amber-600 border-amber-700/40 bg-amber-700/15",
                      ];
                      const badgeClass = medalColors[idx] || "text-[var(--text-muted)] border-[var(--panel-border)] bg-[var(--surface-raised)]/30";

                      return (
                        <div
                          key={winner.userId}
                          className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 transition-colors hover:border-[var(--input-border-hover)]"
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
                              +{winner.totalWon.toLocaleString("fr-FR")} 🪙
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
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-6 backdrop-blur-xl space-y-4">
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
                          <td className="py-3 text-[var(--text-muted)]">{game.bet} 🪙</td>
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
                              {game.won ? `+${game.net} 🪙` : `${game.net} 🪙`}
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
              {/* Table de jeu feutre sombre / verte */}
              <div className="relative overflow-hidden rounded-[24px] border-2 border-emerald-900/60 bg-gradient-to-b from-[#0a2318] via-[#061811] to-[#040e0a] p-8 shadow-2xl text-white">
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
                      {bjBet} 🪙
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

                {/* Bannière de Résultat */}
                <div className="my-4 text-center min-h-[36px]">
                  {bjStatus === "blackjack" && (
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="inline-block rounded-xl bg-amber-500/20 border border-amber-500/50 px-4 py-1.5 text-sm font-black text-amber-300 shadow-lg shadow-amber-500/10"
                    >
                      🌟 BLACKJACK NATUREL 21 ! Gain de +{Math.round(bjBet * 1.5)} 🪙
                    </motion.span>
                  )}
                  {bjStatus === "won" && (
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="inline-block rounded-xl bg-emerald-500/20 border border-emerald-500/50 px-4 py-1.5 text-sm font-black text-emerald-300"
                    >
                      🎉 VOUS GAGNEZ ! +{bjBet} 🪙
                    </motion.span>
                  )}
                  {bjStatus === "lost" && (
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="inline-block rounded-xl bg-rose-500/20 border border-rose-500/50 px-4 py-1.5 text-sm font-black text-rose-300"
                    >
                      💥 PERDU ! Le croupier remporte la manche (-{bjBet} 🪙)
                    </motion.span>
                  )}
                  {bjStatus === "push" && (
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="inline-block rounded-xl bg-blue-500/20 border border-blue-500/50 px-4 py-1.5 text-sm font-black text-blue-300"
                    >
                      🤝 ÉGALITÉ (PUSH) ! Mise restituée.
                    </motion.span>
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
                    <span>Votre main</span>
                    <span className="font-bold text-amber-300">(Score : {playerScore})</span>
                  </div>
                </div>

                {/* Actions de jeu : Hit / Stand / Double / Nouvelle Manche */}
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
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              {/* Plateau de Roulette Royale */}
              <div className="relative overflow-hidden rounded-[24px] border border-amber-500/30 bg-gradient-to-b from-[#1c120c] via-[#120a06] to-[#0a0503] p-8 shadow-2xl text-white">
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
                          {rouletteSpinning ? "?" : rouletteResultNumber}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          {rouletteSpinning ? "En rotation..." : rouletteResultColor}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">Mise :</span>
                        <span className="rounded-lg bg-stone-900 border border-stone-800 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                          {rouletteBet} 🪙
                        </span>
                      </div>
                    </div>

                    {/* Options Simples (Rouge / Noir / Pair / Impair) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "rouge", label: "Rouge", mult: "2x", bg: "bg-rose-900/60 border-rose-500/40 text-rose-300" },
                        { id: "noir", label: "Noir", mult: "2x", bg: "bg-stone-900 border-stone-700 text-stone-200" },
                        { id: "pair", label: "Pair", mult: "2x", bg: "bg-amber-950/40 border-amber-700/40 text-amber-300" },
                        { id: "impair", label: "Impair", mult: "2x", bg: "bg-amber-950/40 border-amber-700/40 text-amber-300" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setRouletteChoice(item.id);
                            playSound("chip");
                          }}
                          className={cn(
                            "rounded-xl border p-3 text-center transition-all cursor-pointer shadow-sm",
                            item.bg,
                            rouletteChoice === item.id && "ring-2 ring-amber-400 scale-[1.02]"
                          )}
                        >
                          <span className="block text-xs font-bold">{item.label}</span>
                          <span className="text-[10px] opacity-80">Paie {item.mult}</span>
                        </button>
                      ))}
                    </div>

                    {/* Numéros Spécifiques (Plein 36x) */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-semibold text-amber-300/80 block">
                        Numéro Plein (Paiement Légendaire 36x) :
                      </span>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setRouletteChoice(String(n));
                              playSound("chip");
                            }}
                            className={cn(
                              "h-8 rounded-lg border text-xs font-bold flex items-center justify-center transition-all cursor-pointer",
                              rouletteChoice === String(n)
                                ? "bg-amber-400 text-stone-950 border-white font-black scale-105"
                                : "bg-stone-900/80 border-stone-800 text-stone-300 hover:border-amber-400"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Résultat bandeau */}
                    {rouletteOutcome && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "rounded-xl border p-3 text-xs font-semibold flex items-center justify-between",
                          rouletteOutcome.won
                            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                            : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                        )}
                      >
                        <span>{rouletteOutcome.msg}</span>
                        <span className="font-black">{rouletteOutcome.won ? `+${rouletteOutcome.payout} 🪙` : "0 🪙"}</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Guide Slash Command */}
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bot size={15} className="text-indigo-400" />
                    Commande Slash Roulette
                  </span>
                  <p className="text-xs text-[var(--text-muted)]">
                    Misez sur la couleur, la parité ou votre chiffre fétiche avec :
                  </p>
                </div>
                <code className="rounded-lg bg-stone-950/80 border border-stone-800 px-3 py-1.5 text-xs font-mono text-amber-400">
                  /roulette mise:{rouletteBet} pari:{rouletteChoice}
                </code>
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
              {/* Arène de duel PvP */}
              <div className="relative overflow-hidden rounded-[24px] border border-indigo-500/30 bg-gradient-to-b from-[#0f1124] via-[#090b16] to-[#05060b] p-8 shadow-2xl text-white">
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
                        {dicePlayerRoll[0]}
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-indigo-400/40 bg-indigo-900/40 text-3xl font-black text-white shadow-lg">
                        {dicePlayerRoll[1]}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-300">
                      Total : {dicePlayerRoll[0] + dicePlayerRoll[1]}
                    </span>
                  </div>

                  {/* Adversaire */}
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-rose-600 flex items-center justify-center font-bold text-xs text-white">
                        A
                      </div>
                      <span className="text-sm font-bold text-rose-200">
                        Adversaire Défié
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-rose-400/40 bg-rose-900/40 text-3xl font-black text-white shadow-lg">
                        {diceOpponentRoll[0]}
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-rose-400/40 bg-rose-900/40 text-3xl font-black text-white shadow-lg">
                        {diceOpponentRoll[1]}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-300">
                      Total : {diceOpponentRoll[0] + diceOpponentRoll[1]}
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
                    <span className="text-xs text-amber-400">🪙</span>
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
              <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-6 backdrop-blur-xl space-y-4">
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
                <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-6 backdrop-blur-xl space-y-4">
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
                          Mise Minimale (🪙)
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
                          Mise Maximale (🪙)
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
              </div>

              {/* Bouton de sauvegarde */}
              <div className="flex justify-end pt-4">
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
        </AnimatePresence>

        {/* ======================================================== */}
        {/* APERÇU EMBED DISCORD TEMPS RÉEL                          */}
        {/* ======================================================== */}
        <div className="space-y-4 pt-6 border-t border-[var(--panel-border)]">
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
                {previewTab === "blackjack" && "Félicitations ShadowKnight ! Vous remportez la manche contre le croupier."}
                {previewTab === "roulette" && "La bille s'arrête sur le 14 Rouge. Vos gains ont été crédités !"}
                {previewTab === "dice" && "ShadowKnight a battu Valkyrie99 avec un score de 11 contre 8 !"}
                {previewTab === "jackpot" && "INCROYABLE ! ShadowKnight vient d'empocher la cagnotte progressive totale !"}
              </p>

              {/* Champs de données */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-800 text-[11px]">
                <div>
                  <span className="text-stone-400 font-semibold block">Mise initiale</span>
                  <span className="text-white font-bold">250 🪙</span>
                </div>
                <div>
                  <span className="text-stone-400 font-semibold block">Gain net</span>
                  <span className="text-emerald-400 font-bold">
                    {previewTab === "jackpot" ? `+${overview.jackpotPool.toLocaleString("fr-FR")} 🪙` : "+500 🪙"}
                  </span>
                </div>
              </div>

              {/* Footer Embed */}
              <div className="pt-2 text-[10px] text-stone-400 flex items-center justify-between">
                <span>{currentGuildName} • Module Casino</span>
                <span>Solde : 4 820 🪙</span>
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

        {/* ======================================================== */}
        {/* MODAL : SIMULATEUR DE CASINO DISCORD                    */}
        {/* ======================================================== */}
        <AnimatePresence>
          {simModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[var(--surface-base)] p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-400" />
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Studio de Simulation de Casino
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSimModalOpen(false)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Générez un événement de jeu de test pour vérifier la synchronisation en direct du bot, le calcul des cagnottes et l&apos;historique.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                      Attraction à simuler
                    </label>
                    <select
                      value={simGame}
                      onChange={(e) => setSimGame(e.target.value as any)}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                    >
                      <option value="blackjack">Blackjack 21</option>
                      <option value="roulette">Roulette Royale</option>
                      <option value="dice">Duel de Dés PvP</option>
                      <option value="spin">Roue Quotidienne (Daily Spin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                      Mise simulée (🪙)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      value={simBet}
                      onChange={(e) => setSimBet(parseInt(e.target.value, 10) || 50)}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                      Salon Discord (optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="ID salon Discord (laisser vide pour simulation dashboard)"
                      value={simChannelId}
                      onChange={(e) => setSimChannelId(e.target.value.trim())}
                      className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>

                  {simSuccessMsg && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
                      {simSuccessMsg}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSimModalOpen(false)}
                    className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    disabled={simRunning}
                    onClick={handleExecuteSimulation}
                    className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2 text-xs font-black text-stone-950 shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {simRunning ? "Simulation..." : "Exécuter la Simulation"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
