"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "@/components/icons/ph";
import { askBrainAI } from "@/lib/brain/ai-engine";
import { getTrackerI18n } from "@/lib/i18n-tracker";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/ease";
import type { ValorantAccountProfile } from "@/lib/valorant-provider";

function parsePrompt(promptStr: string) {
  const match = promptStr.match(
    /^(\p{Extended_Pictographic}\uFE0F?|\p{Emoji_Presentation}\uFE0F?|[\u2600-\u27BF]\uFE0F?)\s*(.*)$/u
  );
  if (match) {
    return { icon: match[1], text: match[2] };
  }
  return { icon: "✨", text: promptStr };
}
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
    kdRatio?: string | number | null;
    winRate?: number | string | null;
    combatScoreAcs?: number | string | null;
    headshotPercentage?: number | string | null;
    tierName?: string;
  };
  valorantMatches?: ValorantMatch[];
  valorantCombatSummary?: {
    kills?: number;
    deaths?: number;
    assists?: number;
    adr?: number | string | null;
  };
  topValorantAgents?: {
    agentName: string;
    matches: number;
    winRate?: number | null;
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

interface CoachCardBullet {
  emoji: string;
  content: string;
}

interface CoachCardSection {
  id: string;
  emoji: string;
  title: string;
  badge: string;
  color: "sky" | "amber" | "emerald" | "purple" | "indigo";
  bullets: CoachCardBullet[];
  paragraphs: string[];
}

interface ParsedCoachMessage {
  introText: string | null;
  sections: CoachCardSection[];
}

const EMOJI_REGEX = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}])/u;

function renderInlineText(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={keyIdx++}
          className="rounded-md bg-white/10 border border-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-purple-300 shadow-xs"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={keyIdx++} className="font-bold text-white tracking-wide">
          {renderInlineText(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      tokens.push(
        <del key={keyIdx++} className="line-through text-neutral-400">
          {renderInlineText(strikeMatch[1])}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      tokens.push(
        <em key={keyIdx++} className="italic text-neutral-300">
          {renderInlineText(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={keyIdx++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-purple-400 underline decoration-purple-400/40 hover:decoration-current transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[`*_\[~]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens;
}

function sanitizeCoachText(raw: string): string {
  if (!raw) return "";
  let clean = raw.replace(/\\n/g, "\n");

  clean = clean.replace(/([^\n])\s*(#{1,4}\s+)/g, "$1\n\n$2");
  clean = clean.replace(/([^\n])\s*([•\u2022]\s*)/g, "$1\n$2");

  clean = clean.replace(/(\|[^\n]+\|(\n|$))+/g, (tableBlock) => {
    const rows = tableBlock.trim().split("\n");
    const bulletLines: string[] = [];
    for (const row of rows) {
      if (/^\|[-:\s|]+\|$/.test(row.trim())) continue;
      const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length === 0) continue;
      const first = cols[0].toLowerCase();
      if (first.includes("exercice") || first.includes("drill") || first.includes("nom") || first.includes("col") || first.includes("param")) continue;
      const title = cols[0];
      const rest = cols.slice(1).join(" · ");
      bulletLines.push(`• 🎯 **${title}** : ${rest}`);
    }
    return bulletLines.length > 0 ? "\n" + bulletLines.join("\n") + "\n" : "";
  });

  return clean.trim();
}

function parseCoachCards(raw: string, isEn: boolean): ParsedCoachMessage {
  const sanitized = sanitizeCoachText(raw);
  const lines = sanitized.split("\n");

  let introText: string | null = null;
  const sections: CoachCardSection[] = [];
  let currentSection: CoachCardSection | null = null;
  const introLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const headingMatch = line.match(/^#{1,4}\s+(.*)$/);
    if (headingMatch) {
      if (currentSection) {
        sections.push(currentSection);
      } else if (introLines.length > 0) {
        introText = introLines.join(" ").trim();
      }

      let rawTitle = headingMatch[1].trim();
      let headingRemainder = "";

      const sepMatch = rawTitle.match(/^([^\n\-:—–]+?)\s*[-:—–]\s*(.+)$/);
      if (sepMatch && sepMatch[1].trim().length >= 3 && sepMatch[2].trim().length > 0) {
        rawTitle = sepMatch[1].trim();
        headingRemainder = sepMatch[2].trim();
      }

      const emojiMatch = rawTitle.match(EMOJI_REGEX);
      const emoji = emojiMatch ? emojiMatch[1] : "🎯";
      const cleanTitle = rawTitle.replace(EMOJI_REGEX, "").trim() || (isEn ? "Tactical Focus" : "Focus Tactique");

      const lower = rawTitle.toLowerCase();
      let color: "sky" | "amber" | "emerald" | "purple" | "indigo" = "purple";
      let badge = isEn ? "COACH NOTE" : "NOTE COACH";

      if (lower.includes("diag") || lower.includes("snapshot") || lower.includes("télé") || lower.includes("tele") || lower.includes("stat") || lower.includes("précis") || lower.includes("precis") || emoji === "🎯") {
        color = "sky";
        badge = isEn ? "DIAGNOSTIC" : "DIAGNOSTIC";
      } else if (lower.includes("action") || lower.includes("priorit") || lower.includes("fix") || lower.includes("clé") || lower.includes("cle") || emoji === "⚡") {
        color = "amber";
        badge = isEn ? "ACTIONS" : "PRIORITÉS";
      } else if (lower.includes("routine") || lower.includes("drill") || lower.includes("range") || lower.includes("dm") || lower.includes("deathmatch") || lower.includes("train") || emoji === "🏋️") {
        color = "emerald";
        badge = isEn ? "DRILLS" : "ROUTINE";
      } else if (lower.includes("pro") || lower.includes("secret") || lower.includes("tip") || lower.includes("vct") || emoji === "💡") {
        color = "purple";
        badge = isEn ? "PRO SECRET" : "PRO TIP";
      } else if (lower.includes("défense") || lower.includes("defense") || lower.includes("retake") || emoji === "🛡️") {
        color = "indigo";
        badge = isEn ? "TACTICAL" : "TACTIQUE";
      }

      currentSection = {
        id: `sec-${i}`,
        emoji,
        title: cleanTitle,
        badge,
        color,
        bullets: [],
        paragraphs: [],
      };

      if (headingRemainder) {
        const parts = headingRemainder.split(/\s*(?:[-—–·|]|\b(?=[•\u2022]))\s*/).filter(Boolean);
        if (parts.length > 1) {
          for (const p of parts) {
            const pEmojiMatch = p.match(EMOJI_REGEX);
            const pEmoji = pEmojiMatch ? pEmojiMatch[1] : emoji;
            const pClean = p.replace(EMOJI_REGEX, "").trim();
            if (pClean) {
              currentSection.bullets.push({ emoji: pEmoji, content: pClean });
            }
          }
        } else {
          currentSection.bullets.push({ emoji, content: headingRemainder });
        }
      }
      continue;
    }

    if (!currentSection) {
      introLines.push(line);
      continue;
    }

    const bulletMatch = line.match(/^([•\-*]|\d+\.)\s*(.*)$/);
    if (bulletMatch) {
      let itemContent = bulletMatch[2].trim();
      const bulletEmojiMatch = itemContent.match(EMOJI_REGEX);
      let bulletEmoji = currentSection.emoji;
      if (bulletEmojiMatch && itemContent.startsWith(bulletEmojiMatch[1])) {
        bulletEmoji = bulletEmojiMatch[1];
        itemContent = itemContent.slice(bulletEmojiMatch[1].length).trim();
      }
      currentSection.bullets.push({
        emoji: bulletEmoji,
        content: itemContent,
      });
      continue;
    }

    const leadEmojiMatch = line.match(EMOJI_REGEX);
    if (leadEmojiMatch && line.startsWith(leadEmojiMatch[1])) {
      const bulletEmoji = leadEmojiMatch[1];
      const itemContent = line.slice(leadEmojiMatch[1].length).trim();
      currentSection.bullets.push({
        emoji: bulletEmoji,
        content: itemContent,
      });
      continue;
    }

    currentSection.paragraphs.push(line);
  }

  if (currentSection) {
    sections.push(currentSection);
  } else if (introLines.length > 0 && sections.length === 0) {
    sections.push({
      id: "sec-fallback",
      emoji: "🎯",
      title: isEn ? "Astra-V Analysis" : "Analyse Astra-V",
      badge: isEn ? "TACTICAL" : "TACTIQUE",
      color: "purple",
      bullets: [],
      paragraphs: introLines,
    });
  }

  return { introText, sections };
}

function CoachCardView({ content, isEn }: { content: string; isEn: boolean }) {
  const { introText, sections } = useMemo(() => parseCoachCards(content, isEn), [content, isEn]);

  return (
    <div className="space-y-3">
      {introText && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 px-3.5 py-2.5 text-xs text-purple-200 flex items-start gap-2 shadow-xs">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed flex-1">{renderInlineText(introText)}</div>
        </div>
      )}

      {sections.map((sec) => (
        <div
          key={sec.id}
          className={cn(
            "rounded-xl border p-3.5 space-y-2.5 transition-all shadow-md backdrop-blur-md",
            sec.color === "sky" && "border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-[#121622]/95 to-[#121622]/95",
            sec.color === "amber" && "border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-[#121622]/95 to-[#121622]/95",
            sec.color === "emerald" && "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-[#121622]/95 to-[#121622]/95",
            sec.color === "purple" && "border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-[#121622]/95 to-[#121622]/95",
            sec.color === "indigo" && "border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-[#121622]/95 to-[#121622]/95"
          )}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.08] text-xs shrink-0 select-none">
                {sec.emoji}
              </span>
              <span className="text-xs font-mono font-bold text-white tracking-wide uppercase truncate">
                {sec.title}
              </span>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 border",
                sec.color === "sky" && "bg-sky-500/15 border-sky-500/30 text-sky-300",
                sec.color === "amber" && "bg-amber-500/15 border-amber-500/30 text-amber-300",
                sec.color === "emerald" && "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
                sec.color === "purple" && "bg-purple-500/15 border-purple-500/30 text-purple-300",
                sec.color === "indigo" && "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
              )}
            >
              {sec.badge}
            </span>
          </div>

          {sec.bullets.length > 0 && (
            <div className="space-y-1.5">
              {sec.bullets.map((b, bIdx) => (
                <div
                  key={bIdx}
                  className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] p-2.5 transition-colors"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-xs select-none mt-0.5">
                    {b.emoji}
                  </span>
                  <div className="text-xs text-neutral-200 leading-relaxed font-sans min-w-0 flex-1">
                    {renderInlineText(b.content)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sec.paragraphs.map((p, pIdx) => (
            <p key={pIdx} className="text-xs text-neutral-300 leading-relaxed font-sans">
              {renderInlineText(p)}
            </p>
          ))}

          {sec.bullets.length === 0 && sec.paragraphs.length === 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-xs select-none mt-0.5">
                {sec.emoji}
              </span>
              <div className="text-xs text-neutral-200 leading-relaxed font-sans min-w-0 flex-1">
                {renderInlineText(sec.title)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
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
  currentLang = "en",
}: TacticalCoachChatViewProps) {
  const tr = useMemo(() => getTrackerI18n(currentLang), [currentLang]);
  const isEn = (currentLang || "").toLowerCase().startsWith("en");
  const reducedMotion = useReducedMotion();
  const { show: notify } = useToast();

  const playerName = valorantProfile?.name || riotName || (isEn ? "Player" : "Joueur");
  const playerTag = (valorantProfile?.tag || riotTag || "").replace(/^#/, "");
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
      content = `### 🎯 Astra-V Tactical Head Coach\n• 🎯 **Esport Analysis Ready** : Specialized in VALORANT Radiant mechanics, utility timings, and VCT meta.\n• 📊 **Live Player Sync** : Connected to \`${playerName} #${playerTag}\` (${matchesCount} matches analyzed, ${kd} K/D, ${wr}% Win Rate, ${hs}% Headshot).\n• ⚡ **Instant Coaching** : Click a quick prompt below or ask any tactical question about your crosshair placement, economy, or agent!`;
    } else {
      content = `### 🎯 Head Coach IA Astra-V\n• 🎯 **Analyse Esport Prête** : Spécialisé en mécaniques Radiant VALORANT, timings d'utilitaires et méta VCT.\n• 📊 **Synchronisation Joueur** : Connecté à \`${playerName} #${playerTag}\` (${matchesCount} parties analysées, ${kd} K/D, ${wr}% Victoires, ${hs}% Précision tête).\n• ⚡ **Démarrage Rapide** : Clique sur une suggestion ci-dessous ou pose n'importe quelle question tactique sur ton tir, ton économie ou tes agents !`;
    }

    return {
      id: "coach-welcome",
      role: "assistant",
      content,
      createdAt: Date.now(),
      provider: "Astra-V Engine",
    };
  }, [isEn, playerName, playerTag, valorantMatches.length, telemetryMetrics, valorantStats]);

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

  const buildTelemetryFallback = useCallback((query: string, lang: "en" | "fr") => {
    const hs = telemetryMetrics?.hsPct ?? valorantStats?.headshotPercentage ?? 25;
    const wr = valorantStats?.winRate ?? 50;
    const kd = valorantStats?.kdRatio ?? "1.00";
    const duelWr = telemetryMetrics?.duelWinrate ?? 50;
    const matchesCount = valorantMatches.length || 10;
    const main = topValorantAgents[0]?.agentName || "Jett";
    const cleanQuery = query.toLowerCase();

    if (lang === "en") {
      if (cleanQuery.includes("agent") || cleanQuery.includes("jett") || cleanQuery.includes("reyna") || cleanQuery.includes("main")) {
        return `### 🎯 Snapshot & Current Play\n• 🎯 **Main Agent** : \`${main}\` across ${matchesCount} matches with a ${wr}% win rate.\n• ⚡ **Role Execution** : High-tempo entry impact with ${kd} K/D and ${duelWr}% opening duel success.\n\n### ⚡ 3 Agent Priorities\n• 🎯 **Entry Route** : Pre-call your entry smoke and dash timing before popping team utility.\n• 🛡️ **Position Reset** : Never double-peek after obtaining the first pick; dash or fall back to team crossfire.\n• 🔄 **Economy Sync** : Buy with your team even on half-buys to ensure synchronized site hits.\n\n### 🏋️ 10-Min Pro Routine\n• 🎯 **Range Bot Speed** : 50 bot eliminations utilizing agent abilities for rapid resets.\n• ⚡ **Movement Warmup** : 1 Deathmatch prioritizing angle isolation and single-bullet headshots.\n\n### 💡 VCT Pro Secret\n• 💡 **Aspas Angle Principle** : Hold unexpected 2-meter off-angles when defending choke points to dismantle pre-aim.`;
      }

      return `### 🎯 Snapshot & Diagnostic\n• 🎯 **Shooting Telemetry** : ${hs}% headshot accuracy with ${kd} K/D across ${matchesCount} official matches.\n• ⚡ **Duel Conversion** : Winning ${duelWr}% of opening engagements; strong first-bullet potential.\n\n### ⚡ 3 Tactical Priorities\n• 🎯 **Crosshair Height** : Anchor crosshair firmly at box-level edges before swinging common corners.\n• 🛡️ **Counter-Strafe** : Complete dead-stop before clicking; zero running spray with rifle.\n• 🔄 **Disengage Timing** : Reset position immediately after securing 1 kill rather than overheating.\n\n### 🏋️ 10-Min Pro Routine\n• 🎯 **Range 100 Bots** : 50 Sheriff single-taps, then 50 Vandal two-shot bursts targeting heads only.\n• ⚡ **Deathmatch Tap-Fire** : 1 match with audio muted, practicing movement stops and head-level taps.\n\n### 💡 VCT Pro Secret\n• 💡 **TenZ First-Shot Rule** : Treat every burst as 2 bullets maximum; reset recoil before re-engaging.`;
    }

    if (cleanQuery.includes("agent") || cleanQuery.includes("jett") || cleanQuery.includes("reyna") || cleanQuery.includes("main")) {
      return `### 🎯 Snapshot & Jeu Actuel\n• 🎯 **Agent Principal** : \`${main}\` sur ${matchesCount} parties avec un taux de victoire de ${wr}%.\n• ⚡ **Impact de Rôle** : Prises de duel agressives avec ratio ${kd} et ${duelWr}% de duels remportés.\n\n### ⚡ 3 Priorités Agent\n• 🎯 **Timing d'Entrée** : Annonce ton entrée avant de consommer tes utilitaires pour synchroniser l'équipe.\n• 🛡️ **Repli après Pick** : Ne reprends jamais la même ligne après un kill ; replace-toi dans le crossfire allié.\n• 🔄 **Discipline Économique** : Aligne tes achats sur le collectif pour toujours frapper les sites à cinq.\n\n### 🏋️ Routine 10 Min\n• 🎯 **Vitesse au Range** : 50 bots en combinant dash/décalage rapide pour travailler l'arrêt net.\n• ⚡ **Deathmatch Cible** : 1 match axé sur l'isolation des duels en 1v1 sans spray.\n\n### 💡 Secret Pro VCT\n• 💡 **Règle d'Angle Aspas** : Tiens des off-angles à 2 mètres des ouvertures classiques pour casser le pré-visé adverse.`;
    }

    return `### 🎯 Diagnostic Express\n• 🎯 **Télémétrie de Tir** : ${hs}% de tirs à la tête avec un ratio ${kd} sur ${matchesCount} parties officielles.\n• ⚡ **Conversion des Duels** : ${duelWr}% de premiers duels gagnés ; excellente précision de première balle.\n\n### ⚡ 3 Actions Prioritaires\n• 🎯 **Hauteur Viseur** : Verrouille ton réticule à hauteur de tête sur les repères de caisse.\n• 🛡️ **Counter-Strafing** : Arrêt complet de la course avant le tir ; aucun spray en mouvement.\n• 🔄 **Désengagement Net** : Replace-toi immédiatement après le premier kill sans surchauffer.\n\n### 🏋️ Routine 10 Min\n• 🎯 **Range 100 Bots** : 50 éliminations Sheriff une balle, puis 50 rafales Vandal courtes.\n• ⚡ **Deathmatch Tap-Fire** : 1 partie sans son uniquement en tap-fire pour forcer le placement.\n\n### 💡 Secret Pro VCT\n• 💡 **Règle de Première Balle TenZ** : Limite chaque salve à 2 balles maximum ; attends le reset de recul.`;
  }, [telemetryMetrics, valorantStats, valorantMatches.length, topValorantAgents]);

  const buildSystemPrompt = useCallback((targetLang: "en" | "fr") => {
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
      const map = m.metadata?.mapName || (targetLang === "en" ? "Unknown Map" : "Map inconnue");
      const won = m.metadata?.result?.toLowerCase() === "victory"
        ? (targetLang === "en" ? "Win" : "Victoire")
        : (targetLang === "en" ? "Loss" : "Défaite");
      const score = `${m.metadata?.score?.team ?? 0}-${m.metadata?.score?.opponent ?? 0}`;
      return `${map} (${score}, ${won}): ${kills}/${deaths}/${assists} KDA`;
    }).join("; ");

    const topAgentsStr = topValorantAgents.map((a) => `${a.agentName} (${a.matches} ${targetLang === "en" ? "matches" : "parties"}, ${a.winRate ?? 0}% win)`).join(", ") || (targetLang === "en" ? "No specific agent" : "Aucun agent spécifique");

    if (targetLang === "en") {
      return `You are "Astra-V", the elite Tactical AI Head Coach for ETHONE Tactical, specializing in Radiant-tier VALORANT and the VCT Champions Tour (2024-2026).

PLAYER REAL-TIME TELEMETRY & MATCH DATA:
- Player: ${playerName} #${playerTag}
- Official matches analyzed: ${valorantMatches.length}
- K/D Ratio: ${kd} | Win Rate: ${wr}% | ACS: ${acs} | ADR: ${adr}
- Shooting Telemetry: ${hs}% Head | ${bs}% Body | ${ls}% Legs | Duel Win Rate: ${duelWr}%
- Top Agents: ${topAgentsStr}
- Recent Match History: ${matchesSummary || "No recent official matches recorded"}

CRITICAL MANDATES:
1. STRICT LANGUAGE: You MUST respond 100% in ENGLISH. Never respond in French.
2. CLEAN CARDS ONLY: Output EXACTLY 4 sections using short "### [Emoji] Title".
3. NEVER append colons, dashes, statistics, or advice on the "###" heading line. Keep each heading line strictly 2 to 4 words (e.g. "### 🎯 Snapshot & Diagnostic").
4. ALL advice and statistics MUST be on separate lines starting with "• [Emoji] **Keyword** : concise instruction".
5. FORBIDDEN: Markdown tables are strictly forbidden.

EXACT 4-CARD OUTPUT TEMPLATE (Follow this layout with line breaks):

### 🎯 Snapshot & Diagnostic
• 🎯 **Shooting Telemetry** : ${hs}% headshot and ${kd} K/D across ${valorantMatches.length} matches shows consistent aim fundamentals.
• ⚡ **Duel Conversion** : Winning ${duelWr}% of opening duels; high first-bullet accuracy.

### ⚡ 3 Tactical Priorities
• 🎯 **Crosshair Height** : Lock your horizontal crosshair at box-level edges before swinging common corners.
• 🛡️ **Counter-Strafe** : Complete dead-stop before clicking; zero running spray with rifle.
• 🔄 **Disengage Timing** : Reset position immediately after securing 1 kill rather than overheating.

### 🏋️ 10-Min Pro Routine
• 🎯 **Range 100 Bots** : 50 Sheriff single-taps, then 50 Vandal two-shot bursts targeting heads only.
• ⚡ **Deathmatch Tap-Fire** : 1 match with audio muted, practicing movement stops and head-level taps.

### 💡 VCT Pro Secret
• 💡 **Off-Angle Discipline** : Hold 2 meters off common choke points like Aspas and TenZ to break opponent crosshair placement.`;
    }

    return `Tu es "Astra-V", le Head Coach IA Tactique officiel d'ETHONE Tactical, spécialisé dans l'analyse de haut niveau sur VALORANT (Radiant et VCT Champions Tour).

DONNÉES JOUEUR & TÉLÉMÉTRIE EN DIRECT :
- Joueur : ${playerName} #${playerTag}
- Parties analysées : ${valorantMatches.length}
- Ratio K/D : ${kd} | Win Rate : ${wr}% | ACS : ${acs} | ADR : ${adr}
- Télémétrie de tir : ${hs}% Tête | ${bs}% Corps | ${ls}% Jambes | Duels gagnés : ${duelWr}%
- Agents favoris : ${topAgentsStr}
- Dernières parties : ${matchesSummary || "Aucune partie récente enregistrée"}

CONSIGNES STRICTES DE FORMATAGE :
1. LANGUE STRICTE : Tu DOIS répondre 100% en FRANÇAIS.
2. CARTES PROPRES : Génère EXACTEMENT 4 sections avec des titres courts "### [Emoji] Titre".
3. Ne mets JAMAIS de deux-points, tiret, statistiques ou conseils sur la ligne de titre "###". Garde chaque titre entre 2 et 4 mots (ex: "### 🎯 Diagnostic Express").
4. TOUS les conseils et statistiques DOIVENT être sur des lignes séparées débutant par "• [Emoji] **Mot-clé** : consigne concise".
5. STRICTEMENT INTERDIT : Les tableaux markdown sont interdits.

EXEMPLE STRICT DE SORTIE EN 4 CARTES (Respecte cette structure avec retours à la ligne) :

### 🎯 Diagnostic Express
• 🎯 **Télémétrie de Tir** : ${hs}% tête et ratio ${kd} sur ${valorantMatches.length} parties confirment des bases solides.
• ⚡ **Conversion Duels** : ${duelWr}% de duels d'ouverture remportés ; bonne précision initiale.

### ⚡ 3 Actions Prioritaires
• 🎯 **Hauteur Viseur** : Verrouille ton réticule à hauteur de tête sur les repères de caisse.
• 🛡️ **Counter-Strafing** : Arrêt complet de la course avant le tir ; aucun spray en mouvement.
• 🔄 **Désengagement Net** : Replace-toi immédiatement après le premier kill sans surchauffer.

### 🏋️ Routine 10 Min
• 🎯 **Range 100 Bots** : 50 éliminations Sheriff une balle, puis 50 rafales Vandal courtes.
• ⚡ **Deathmatch Tap-Fire** : 1 partie sans son uniquement en tap-fire pour forcer le placement.

### 💡 Secret Pro VCT
• 💡 **Règle d'Angle Aspas** : Tiens des off-angles à 2 mètres des ouvertures classiques pour casser le pré-visé adverse.`;
  }, [playerName, playerTag, valorantMatches, valorantStats, telemetryMetrics, valorantCombatSummary, topValorantAgents]);

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

    const isEnglishQuery = /^[a-zA-Z0-9\s.,!?'"#-]+$/.test(trimmed) && (
      /\b(how|what|why|who|analyze|aim|shoot|shooting|crosshair|placement|agent|vandal|phantom|round|match|guide|routine|tip|pro|defense|attack)\b/i.test(trimmed)
    );
    const targetLang: "en" | "fr" = isEn || isEnglishQuery ? "en" : "fr";

    try {
      const systemPrompt = buildSystemPrompt(targetLang);

      let contentToDisplay = "";
      let providerName = "Astra-V Engine";

      try {
        const aiResponse = await askBrainAI({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt,
          modelId: "auto",
          temperature: 0.5,
          maxTokens: 1200,
        });

        if (aiResponse.content && aiResponse.content.trim().length > 30) {
          contentToDisplay = aiResponse.content.trim();
          providerName = aiResponse.provider ? `${aiResponse.provider} (${aiResponse.model || "Astra-V"})` : "Astra-V Engine";
        }
      } catch {}

      if (!contentToDisplay) {
        contentToDisplay = buildTelemetryFallback(trimmed, targetLang);
        providerName = "Astra-V Core";
      }

      const assistantMsg: TacticalCoachMessage = {
        id: `coach-${Date.now()}`,
        role: "assistant",
        content: contentToDisplay,
        createdAt: Date.now(),
        provider: providerName,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: TacticalCoachMessage = {
        id: `coach-fallback-${Date.now()}`,
        role: "assistant",
        content: buildTelemetryFallback(trimmed, targetLang),
        createdAt: Date.now(),
        provider: "Astra-V Core",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }, [inputValue, loading, messages, buildSystemPrompt, buildTelemetryFallback, isEn]);

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

  const promptScrollRef = useRef<HTMLDivElement>(null);

  const scrollPrompts = useCallback((direction: "left" | "right") => {
    if (promptScrollRef.current) {
      const amount = direction === "left" ? -280 : 280;
      promptScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  }, []);

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
                    {valorantProfile.name}{valorantProfile.tag ? ` #${valorantProfile.tag}` : ""}
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
                  "flex gap-3",
                  isUser ? "ml-auto flex-row-reverse max-w-2xl" : "mr-auto flex-row w-full max-w-3xl"
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

                {isUser ? (
                  <div className="group relative rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-md bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-tr-xs">
                    <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-end pt-1.5 text-[10px] font-mono text-white/70">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="group relative rounded-2xl p-3.5 sm:p-4 shadow-lg border border-white/[0.08] bg-[#10141f]/95 text-neutral-200 rounded-tl-xs backdrop-blur-md space-y-3 w-full">
                    <CoachCardView content={msg.content} isEn={isEn} />

                    <div className="flex items-center justify-between gap-3 pt-2 text-[10px] font-mono text-neutral-400 border-t border-white/[0.06]">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msg.provider ? ` · ${msg.provider}` : ""}
                      </span>

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
                    </div>
                  </div>
                )}
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

        <div className="border-t border-white/[0.08] bg-black/60 p-3.5 sm:p-4.5 space-y-3.5 backdrop-blur-xl">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/20 text-purple-300">
                  <Sparkles className="h-3 w-3" />
                </span>
                <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-neutral-300 uppercase font-mono">
                  {isEn ? "Tactical Presets" : "Suggestions Tactiques"}
                </span>
                <span className="rounded-full bg-white/[0.06] border border-white/10 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                  {quickPrompts.length} {isEn ? "ready" : "prêts"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollPrompts("left")}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-90"
                  aria-label={isEn ? "Scroll left" : "Défiler à gauche"}
                  title={isEn ? "Scroll left" : "Défiler à gauche"}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollPrompts("right")}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-90"
                  aria-label={isEn ? "Scroll right" : "Défiler à droite"}
                  title={isEn ? "Scroll right" : "Défiler à droite"}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div
                ref={promptScrollRef}
                className="flex items-center gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-1 px-1"
              >
                {quickPrompts.map((p, idx) => {
                  const parsed = parsePrompt(p);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(p)}
                      disabled={loading}
                      className="group rounded-2xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.09] hover:border-purple-400/40 p-1.5 pr-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow-[0_4px_16px_rgba(168,85,247,0.15)] active:scale-[0.98] shrink-0 disabled:opacity-40"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08] border border-white/10 text-base shrink-0 group-hover:scale-105 group-hover:bg-purple-500/20 group-hover:border-purple-400/30 transition-all shadow-inner">
                        {parsed.icon}
                      </span>
                      <span className="text-xs sm:text-[13px] font-medium text-neutral-200 group-hover:text-white transition-colors tracking-tight whitespace-nowrap">
                        {parsed.text}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500 group-hover:text-purple-300 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2.5 pt-0.5"
          >
            <div className="flex-1 relative rounded-2xl border border-white/10 bg-[#121622]/90 focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-[#121622] transition-all shadow-inner flex items-center min-h-[46px]">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={tr.coachChatPlaceholder}
                disabled={loading}
                className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 text-xs sm:text-sm font-semibold shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label={tr.coachChatSend}
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">{tr.coachChatSend}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
