"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Brain,
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  Zap,
  Target,
  Activity,
  ChevronDown,
  ChevronUp,
} from "@/components/icons/ph";
import { askBrainAI } from "@/lib/brain/ai-engine";
import MarkdownContent from "@/components/MarkdownContent";
import { getTrackerI18n } from "@/lib/i18n-tracker";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/ease";
import type { ValorantAccountProfile } from "@/lib/valorant-provider";
import type { ValorantMatch } from "@/lib/valorant-tracker";

interface TacticalCoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  provider?: string;
}

interface TacticalCoachChatViewProps {
  valorantProfile?: ValorantAccountProfile | null;
  valorantStats?: {
    kdRatio?: string;
    winRate?: number | string;
    combatScoreAcs?: number | string;
    headshotPercentage?: number | string;
    tierName?: string;
  };
  valorantMatches?: ValorantMatch[];
  valorantCombatSummary?: {
    kills?: number;
    deaths?: number;
    assists?: number;
    adr?: number | string;
  };
  topValorantAgents?: {
    agentName: string;
    matches: number;
    winRate?: number;
  }[];
  telemetryMetrics?: {
    totalKills: number;
    totalDeaths: number;
    hsPct: number;
    bsPct: number;
    lsPct: number;
    duelWinrate: number;
    adr: number;
  } | null;
  riotName?: string;
  riotTag?: string;
  onSelectTab?: (tab: string) => void;
  currentLang?: string;
}

function getAgentRole(agentName: string): string {
  const n = agentName.toLowerCase();
  if (["jett", "reyna", "raze", "phoenix", "yoru", "neon", "iso"].includes(n)) return "Duelliste";
  if (["sova", "fade", "breach", "skye", "kay/o", "kayo", "gekko"].includes(n)) return "Initiateur";
  if (["omen", "brimstone", "viper", "astra", "clove", "harbor"].includes(n)) return "Contrôleur";
  if (["killjoy", "cypher", "sage", "chamber", "deadlock", "vyse"].includes(n)) return "Sentinelle";
  return "Agent";
}

export default function TacticalCoachChatView({
  valorantProfile,
  valorantStats,
  valorantMatches = [],
  valorantCombatSummary,
  topValorantAgents = [],
  telemetryMetrics,
  riotName = "",
  riotTag = "",
  onSelectTab,
  currentLang = "fr",
}: TacticalCoachChatViewProps) {
  const tr = useMemo(() => getTrackerI18n(currentLang), [currentLang]);
  const isEn = (currentLang || "").toLowerCase().startsWith("en");
  const reducedMotion = useReducedMotion();
  const { notify } = useToast();

  const playerName = valorantProfile?.name || riotName || (isEn ? "Player" : "Joueur");
  const playerTag = valorantProfile?.tag || riotTag || "0001";
  const mainAgent = topValorantAgents[0]?.agentName || (isEn ? "Versatile" : "Polyvalent");

  const storageKey = useMemo(() => {
    return `ethone:tracker:coach:history:${playerName.toLowerCase()}-${playerTag.toLowerCase()}`;
  }, [playerName, playerTag]);

  const welcomeMessage = useMemo<TacticalCoachMessage>(() => {
    const hs = telemetryMetrics?.hsPct ?? valorantStats?.headshotPercentage ?? 0;
    const wr = valorantStats?.winRate ?? 0;
    const kd = valorantStats?.kdRatio ?? "1.00";
    const matchesCount = valorantMatches.length;

    let content = "";
    if (isEn) {
      content = `### 🎯 Welcome to your Tactical AI Coach\n\nI am **Astra-V**, your VALORANT & VCT Esports Head Coach. I analyze your mechanics, utility timings, map defaults, and clutch scenarios.\n\n`;
      if (matchesCount > 0) {
        content += `**Live Player Sync:** \`${playerName} #${playerTag}\`\n`;
        content += `- **Matches Analyzed:** ${matchesCount} official matches\n`;
        content += `- **K/D Ratio:** ${kd} · **Win Rate:** ${wr}%\n`;
        content += `- **Headshot Precision:** ${hs}% · **Main Agent:** ${mainAgent}\n\n`;
        content += `I am ready. Ask me anything about your gameplay, ask for a round breakdown, or select a quick topic below!`;
      } else {
        content += `Search your Riot ID in the bar above to let me inspect your competitive matches and shooting telemetry, or ask any tactical question about agents, maps, or VCT meta right now!`;
      }
    } else {
      content = `### 🎯 Bienvenue sur ton Coach IA Tactique\n\nJe suis **Astra-V**, ton Head Coach spécialisé VALORANT & VCT Esports. J'analyse tes mécaniques, tes timings d'utilitaires, tes prises de site et tes scénarios de clutch.\n\n`;
      if (matchesCount > 0) {
        content += `**Données synchronisées pour :** \`${playerName} #${playerTag}\`\n`;
        content += `- **Parties analysées :** ${matchesCount} matchs officiels\n`;
        content += `- **Ratio K/D :** ${kd} · **Taux de Victoire :** ${wr}%\n`;
        content += `- **Précision Tête :** ${hs}% · **Agent Principal :** ${mainAgent}\n\n`;
        content += `Je suis prêt. Pose-moi une question sur ton style de jeu, demande un plan d'entraînement, ou choisis une suggestion ci-dessous !`;
      } else {
        content += `Renseigne ton Riot ID dans la barre ci-dessus pour que j'analyse tes données réelles de tir et de match, ou pose-moi directement n'importe quelle question tactique sur les agents, les maps ou la méta VCT !`;
      }
    }

    return {
      id: "coach-welcome",
      role: "assistant",
      content,
      createdAt: Date.now(),
      provider: "Astra-V Engine",
    };
  }, [isEn, playerName, playerTag, mainAgent, valorantMatches.length, telemetryMetrics, valorantStats]);

  const [messages, setMessages] = useState<TacticalCoachMessage[]>(() => {
    if (typeof window === "undefined") return [welcomeMessage];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [welcomeMessage];
  });

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  const buildSystemPrompt = useCallback(() => {
    const hs = telemetryMetrics?.hsPct ?? valorantStats?.headshotPercentage ?? 0;
    const bs = telemetryMetrics?.bsPct ?? 0;
    const ls = telemetryMetrics?.lsPct ?? 0;
    const duelWr = telemetryMetrics?.duelWinrate ?? 50;
    const wr = valorantStats?.winRate ?? 0;
    const kd = valorantStats?.kdRatio ?? "1.00";
    const acs = valorantStats?.combatScoreAcs ?? 0;
    const adr = telemetryMetrics?.adr ?? valorantCombatSummary?.adr ?? 0;

    const matchesSummary = valorantMatches.slice(0, 5).map((m) => {
      const seg = m.segments?.[0]?.stats;
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      const kills = me?.stats?.kills ?? seg?.kills?.value ?? 0;
      const deaths = me?.stats?.deaths ?? seg?.deaths?.value ?? 0;
      const assists = me?.stats?.assists ?? seg?.assists?.value ?? 0;
      const map = m.metadata?.map?.name || "Map inconnue";
      const won = m.metadata?.result?.won ? "Victoire" : "Défaite";
      const score = `${m.metadata?.score?.team ?? 0}-${m.metadata?.score?.opponent ?? 0}`;
      return `${map} (${score}, ${won}): ${kills}/${deaths}/${assists} KDA`;
    }).join("; ");

    return `Tu es "Astra-V", le Coach IA Tactique officiel d'ETHONE Tactical, spécialisé dans l'analyse compétitive de haut niveau sur VALORANT (Radiant et VCT Champions Tour).

PROFIL DU JOUEUR CHARGÉ EN TEMPS RÉEL DANS LE TRACKER :
- Joueur : ${playerName} #${playerTag}
- Parties compétitives officielles chargées : ${valorantMatches.length}
- Ratio K/D : ${kd} | Taux de Victoire : ${wr}% | ACS : ${acs} | ADR : ${adr}
- Télémétrie de tir : ${hs}% Tête | ${bs}% Corps | ${ls}% Jambes | Victoires en duel : ${duelWr}%
- Agents les plus joués : ${topValorantAgents.map((a) => `${a.agentName} (${a.matches} parties, ${a.winRate ?? 0}% win)`).join(", ") || "Aucun agent spécifique"}
- 5 dernières parties officielles : ${matchesSummary || "Aucune partie récente enregistrée"}

CONNAISSANCES VCT & VALORANT EXPERTES DU COACH :
- Agents & Rôles : Kits complets, cooldowns, utilitaires de Jett, Reyna, Raze, Sova, Fade, Omen, Viper, Astra, Clove, Killjoy, Cypher, etc. Synergies de flashs, double-smokes, setups de pièges.
- Cartes compétitives : Haven, Ascent, Bind, Split, Lotus, Sunset, Pearl, Fracture, Abyss, Icebox, Breeze. Lignes de visée, timings de rush, executes par défaut, retakes coordonnés.
- Économie : Full buy (3900+), Half buy, Eco (Sheriff/Ghost), Bonus rounds (conversion Vandal/Phantom), Operator economy.
- Mécaniques : Alignement de réticule horizontal au pixel (crosshair placement), counter-strafing, deadzoning, spray control, peek styles (jiggle, jump-peek, ferrari swing, poppin swing).
- VCT Pro Meta (2024-2026) : Stratégies et compos des équipes Tier 1 (Fnatic, Sentinels, Paper Rex, Team Heretics, Gen.G, Karmine Corp), anti-stratting, contact plays vs fast execute.

CONSIGNES DE RÉPONSE :
1. Analyse toujours les questions en faisant directement référence aux données réelles du joueur ci-dessus quand c'est pertinent.
2. Sois précis, pédagogue, direct, encourageant et tactique comme un vrai coach esport professionnel.
3. Donne des exercices concrets et mesurables (ex: Range 100 bots, routine Aimlabs/Kovaaks, exercice Deathmatch one-tap).
4. Réponds toujours dans la langue de l'utilisateur (${isEn ? "Anglais" : "Français"}).
5. Structure tes réponses avec du Markdown propre (titres, puces, gras). Ne sois jamais vague.`;
  }, [playerName, playerTag, valorantMatches, valorantStats, telemetryMetrics, valorantCombatSummary, topValorantAgents, isEn]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : inputValue;
    const trimmed = raw.trim();
    if (!trimmed || loading) return;

    const userMsg: TacticalCoachMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (textToSend === undefined) setInputValue("");
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const aiResponse = await askBrainAI({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        systemPrompt,
        modelId: "auto",
        temperature: 0.6,
      });

      const assistantMsg: TacticalCoachMessage = {
        id: `coach-${Date.now()}`,
        role: "assistant",
        content: aiResponse.content,
        createdAt: Date.now(),
        provider: aiResponse.provider ? `${aiResponse.provider} (${aiResponse.model || "Astra-V"})` : "Astra-V Engine",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: TacticalCoachMessage = {
        id: `coach-err-${Date.now()}`,
        role: "assistant",
        content: isEn
          ? "I could not complete the tactical analysis right now. Please check your network connection or API settings."
          : "Je n'ai pas pu finaliser l'analyse tactique pour le moment. Vérifiez votre connexion ou vos clés API dans les paramètres.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading, messages, buildSystemPrompt, isEn]);

  const handleResetConversation = useCallback(() => {
    setMessages([welcomeMessage]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
    notify({
      type: "info",
      title: isEn ? "New conversation" : "Nouvelle discussion",
      description: isEn ? "Tactical Coach chat has been reset." : "L'historique du Coach a été réinitialisé.",
    });
  }, [welcomeMessage, storageKey, notify, isEn]);

  const handleCopy = useCallback((text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      notify({
        type: "success",
        title: isEn ? "Copied" : "Copié",
        description: isEn ? "Coach advice copied to clipboard." : "Conseil du Coach copié dans le presse-papier.",
      });
    }
  }, [notify, isEn]);

  const quickPrompts = useMemo(() => [
    tr.coachPrompt1,
    tr.coachPrompt2,
    tr.coachPrompt3,
    tr.coachPrompt4,
    tr.coachPrompt5,
  ], [tr]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131B]/95 backdrop-blur-xl shadow-xl flex flex-col min-h-[620px] max-h-[85vh]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] p-4 bg-gradient-to-r from-purple-950/40 via-[#131722] to-black/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-inner">
              <Brain className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#10131B]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-base font-bold text-white tracking-wide truncate">
                  {tr.coachChatTitle}
                </h2>
                <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.2 text-[10px] font-mono font-bold text-purple-300">
                  Astra-V
                </span>
                {valorantProfile?.name && (
                  <span className="hidden md:inline-flex rounded bg-white/[0.06] border border-white/10 px-2 py-0.2 text-[10px] font-mono text-neutral-300">
                    {valorantProfile.name} #{valorantProfile.tag || "0001"}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                {tr.coachChatSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {valorantMatches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDiagnostic(!showDiagnostic)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                title={tr.coachChatDiagnostic}
              >
                <span>{tr.coachChatDiagnostic}</span>
                {showDiagnostic ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab("training")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black px-3 py-1.5 text-xs font-semibold hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Activity className="h-3.5 w-3.5 text-black" />
                <span className="hidden sm:inline">{tr.training}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetConversation}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer"
              title={tr.coachChatReset}
              aria-label={tr.coachChatReset}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showDiagnostic && valorantMatches.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
            className="border-b border-white/[0.08] bg-black/40 p-3 sm:p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-[#121622]/90 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                    {tr.coachArchetype}
                  </span>
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <p className="font-bold text-white text-sm">
                  {topValorantAgents[0]
                    ? `${getAgentRole(topValorantAgents[0].agentName)} (${topValorantAgents[0].agentName})`
                    : (isEn ? "Versatile Player" : "Joueur Polyvalent")}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {topValorantAgents[0]
                    ? `${topValorantAgents[0].matches} ${isEn ? "matches" : "parties"} · ${topValorantAgents[0].winRate ?? 0}% win`
                    : (isEn ? "Role being evaluated" : "Données de rôle en cours")}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#121622]/90 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                    {tr.coachStrength}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <p className="font-bold text-white text-sm">
                  {telemetryMetrics && telemetryMetrics.duelWinrate >= 50
                    ? `${isEn ? "Positive Duels" : "Duels Positifs"} (${telemetryMetrics.duelWinrate}%)`
                    : valorantStats?.kdRatio
                    ? `KD ${valorantStats.kdRatio}`
                    : (isEn ? "Active presence" : "Présence active")}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {telemetryMetrics && telemetryMetrics.hsPct > 0
                    ? `${telemetryMetrics.hsPct}% ${isEn ? "critical head impacts" : "impacts à la tête"}`
                    : (isEn ? "Solid involvement in eliminations" : "Bonne implication d'équipe")}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#121622]/90 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                    {tr.coachWeakness}
                  </span>
                  <Target className="h-3.5 w-3.5 text-rose-400" />
                </div>
                <p className="font-bold text-white text-sm">
                  {telemetryMetrics && telemetryMetrics.hsPct < 20
                    ? (isEn ? "Crosshair Alignment (HS < 20%)" : "Placement Réticule (HS < 20%)")
                    : (valorantCombatSummary?.deaths || 0) > (valorantCombatSummary?.kills || 0)
                    ? (isEn ? "Survival & Disengage" : "Survie & Repli Tactique")
                    : (isEn ? "4v5 Advantage Control" : "Gestion de l'Avantage Numérique")}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {telemetryMetrics && telemetryMetrics.hsPct < 20
                    ? (isEn ? "Align horizontal head level" : "Aligner à hauteur de tête")
                    : (isEn ? "Avoid solo re-peeks after opening" : "Éviter les réengagements solitaires")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto os-scroll p-4 sm:p-5 space-y-4"
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={msg.id}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className={cn(
                  "flex gap-3 max-w-3xl",
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold shadow-sm",
                    isUser
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  )}
                >
                  {isUser ? playerName[0] || "U" : <Brain className="h-4 w-4 text-purple-300" />}
                </div>

                <div
                  className={cn(
                    "group relative rounded-2xl p-4 text-sm leading-relaxed shadow-md space-y-2",
                    isUser
                      ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-tr-xs"
                      : "border border-white/[0.08] bg-[#121622]/90 text-neutral-200 rounded-tl-xs backdrop-blur-md"
                  )}
                >
                  <MarkdownContent content={msg.content} className={isUser ? "text-white" : "text-neutral-200"} />

                  <div className="flex items-center justify-between gap-3 pt-1 text-[10px] font-mono text-neutral-400 border-t border-white/[0.06]">
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {msg.provider ? ` · ${msg.provider}` : ""}
                    </span>

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title={isEn ? "Copy advice" : "Copier ce conseil"}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">{isEn ? "Copied" : "Copié"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{isEn ? "Copy" : "Copier"}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mr-auto max-w-md"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                <Brain className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/90 px-4 py-3 text-xs font-mono text-purple-300 flex items-center gap-2 shadow-sm">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                <span>{tr.coachChatThinking}</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="border-t border-white/[0.08] bg-black/50 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto os-scroll pb-1">
            <span className="text-[10px] font-mono uppercase text-neutral-500 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-400" />
              Pistes :
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p)}
                disabled={loading}
                className="rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-purple-500/40 px-3 py-1 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0 disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 relative rounded-xl border border-white/10 bg-[#121622]/80 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all shadow-inner">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={tr.coachChatPlaceholder}
                disabled={loading}
                className="w-full bg-transparent px-4 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label={tr.coachChatSend}
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tr.coachChatSend}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
