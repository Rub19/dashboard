"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { useResolvedGuildId } from "@/lib/hooks/useBotGuildIds";

export const POLL_BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export interface PollOption {
  id: string;
  label: string;
  emoji?: string;
  color?: string;
}
export interface PollQuestion {
  id: string;
  title: string;
  description?: string;
  type?: string;
  minSelections?: number;
  maxSelections?: number;
  options: PollOption[];
}
export interface PollData {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED" | string;
  anonymity: string;
  resultsVisibility: string;
  questions: PollQuestion[];
  endsAt?: string;
}
export interface OptionResult {
  optionId: string;
  label: string;
  emoji?: string;
  color?: string;
  votesCount: number;
  percentage: number;
}
export interface QuestionResult {
  questionId: string;
  title: string;
  totalVotes: number;
  options: OptionResult[];
}
export interface PollResults {
  totalVotes: number;
  uniqueParticipants: number;
  serverMemberCount: number;
  participationRate: number;
  quorumStatus: string;
  questionsResults: QuestionResult[];
}

/**
 * Identifiant du sondage lu dans l'ADRESSE (et non dans les paramètres de route) : le site est exporté en statique, les
 * pages de sondage sont servies par une réécriture depuis une page modèle, dont les paramètres de route ne sont pas ceux
 * du sondage demandé.
 */
export function usePollIdFromPath(): string {
  const pathname = usePathname() || "";
  const match = pathname.match(/\/discord\/polls\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Charge un sondage réel (et ses résultats) depuis le bot. Aucune valeur de démonstration : en cas d'échec, `error`
 * explique pourquoi et les pages affichent un message au lieu de chiffres inventés.
 */
export function usePollData() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const guildId = useResolvedGuildId(searchParams.get("guildId"), profile?.guilds);
  const pollId = usePollIdFromPath();

  const [poll, setPoll] = useState<PollData | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!POLL_BOT_API_URL) {
      setLoading(false);
      setError("L'API du bot n'est pas configurée pour ce déploiement.");
      return;
    }
    if (!guildId || !pollId) return;
    let cancelled = false;
    setLoading(true);
    const base = `${POLL_BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/polls/${encodeURIComponent(pollId)}`;
    (async () => {
      try {
        const pollRes = await fetch(base, { credentials: "include" });
        const pollJson = await pollRes.json().catch(() => ({}));
        if (!pollRes.ok || !pollJson?.poll) throw new Error(pollJson?.error || "Sondage introuvable sur ce serveur.");
        const resultsRes = await fetch(`${base}/results`, { credentials: "include" });
        const resultsJson = resultsRes.ok ? await resultsRes.json().catch(() => null) : null;
        if (cancelled) return;
        setPoll(pollJson.poll as PollData);
        setResults((resultsJson?.results as PollResults) ?? null);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guildId, pollId, tick]);

  return { poll, results, loading, error, reload, guildId, pollId };
}

export const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Brouillon", tone: "bg-zinc-500/15 text-zinc-300" },
  SCHEDULED: { label: "Programmé", tone: "bg-sky-500/15 text-sky-300" },
  ACTIVE: { label: "En cours", tone: "bg-emerald-500/15 text-emerald-300" },
  PAUSED: { label: "En pause", tone: "bg-amber-500/15 text-amber-300" },
  ENDED: { label: "Terminé", tone: "bg-indigo-500/15 text-indigo-300" },
  CANCELLED: { label: "Annulé", tone: "bg-rose-500/15 text-rose-300" },
};
