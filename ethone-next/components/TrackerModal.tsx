"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Target,
  Flame,
  Shield,
  Zap,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GameIcon from "@/components/icons/GameIcon";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import {
  type ValorantMatch,
  groupMatchesByDate,
} from "@/lib/valorant-tracker";
import ValorantMatchRow from "@/components/tracker/ValorantMatchRow";
import ValorantDayHeader from "@/components/tracker/ValorantDayHeader";

const VALO_MODAL_CACHE_TTL = 15 * 60 * 1000;

export type TrackerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: "valorant" | "lol";
  playerName?: string | null;
  playerTag?: string | null;
  matches?: Record<string, unknown>[] | null;
  onRefresh?: () => void;
};

export default function TrackerModal({
  isOpen,
  onClose,
  game,
  playerName,
  playerTag,
  matches: initialMatches,
  onRefresh,
}: TrackerModalProps) {
  const { settings } = useSettings();
  const { error: showToastError, success: showToastSuccess } = useToast();
  const isVal = game === "valorant";

  const effectiveName = playerName || settings.liveTrackerRiotName || "";
  const effectiveTag = playerTag || settings.liveTrackerRiotTag || "";

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [realMatches, setRealMatches] = useState<ValorantMatch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cacheKey = useMemo(
    () => `ethone-modal-valo-cache:${effectiveName.toLowerCase().trim()}:${effectiveTag.toLowerCase().trim()}`,
    [effectiveName, effectiveTag]
  );

  const fetchRealValorantMatches = useCallback(
    async (force = false) => {
      if (!isVal || !effectiveName || !effectiveTag) return;

      // Check LocalStorage cache
      if (!force) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.ts < VALO_MODAL_CACHE_TTL && Array.isArray(parsed.matches) && parsed.matches.length > 0) {
              setRealMatches(parsed.matches);
              setErrorMessage(null);
              return;
            }
          }
        } catch {}
      }

      if (force) setSyncing(true);
      else setLoading(true);
      setErrorMessage(null);

      try {
        const cleanName = effectiveName.trim();
        const cleanTag = effectiveTag.trim().replace(/^#/, "");
        const res = await fetchWorker(
          `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
        );

        if (res?.error) {
          const msg = res.error?.message || "Erreur de connexion aux serveurs Riot Games";
          setErrorMessage(msg);
          showToastError("Erreur API Valorant", msg);
          return;
        }

        const list = (res?.data?.matches || res?.data || res?.matches || res || []) as ValorantMatch[];
        if (Array.isArray(list) && list.length > 0) {
          setRealMatches(list);
          setErrorMessage(null);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ matches: list, ts: Date.now() }));
          } catch {}
          if (force) showToastSuccess("Matchs Valorant actualisés");
        } else {
          setRealMatches([]);
          setErrorMessage("Aucun match récent trouvé pour ce Riot ID.");
        }
      } catch (err: unknown) {
        const msg = (err as Error)?.message || "Impossible de contacter l'API Henrik/Riot.";
        setErrorMessage(msg);
        showToastError("Erreur Valorant Tracker", msg);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [isVal, effectiveName, effectiveTag, cacheKey, showToastError, showToastSuccess]
  );

  useEffect(() => {
    if (isOpen && isVal) {
      if (initialMatches && initialMatches.length > 0) {
        setRealMatches(initialMatches as unknown as ValorantMatch[]);
      } else {
        fetchRealValorantMatches(false);
      }
    }
  }, [isOpen, isVal, initialMatches, fetchRealValorantMatches]);

  const dayGroups = useMemo(() => {
    if (!isVal) return [];
    return groupMatchesByDate(realMatches);
  }, [isVal, realMatches]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d14]/95 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-black/30">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-md">
                <GameIcon game={game} className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">
                    {effectiveName || "Joueur"}{" "}
                    <span className="text-xs font-semibold text-zinc-400">
                      #{effectiveTag || "TAG"}
                    </span>
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Tracker en direct • Données synchronisées avec les serveurs officiels Riot
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchRealValorantMatches(true)}
                disabled={loading || syncing}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-rose-400", syncing && "animate-spin")} />
                <span className="hidden sm:inline">{syncing ? "Synchro..." : "Actualiser"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Content Area: Pure Real Valorant Tracker */}
          <div className="min-h-0 flex-1 overflow-y-auto os-scroll p-4 sm:p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
                <p className="text-xs font-medium text-zinc-400">
                  Récupération de vos statistiques officielles Valorant...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 mb-3 shadow-md">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-white">Erreur de chargement des statistiques</h4>
                <p className="mt-1 max-w-sm text-xs text-zinc-400">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => fetchRealValorantMatches(true)}
                  className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-all cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            ) : dayGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 mb-3">
                  <Shield className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-white">Aucun match disponible</h4>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  Configurez votre Riot Name et Riot TAG dans les paramètres pour charger vos statistiques.
                </p>
              </div>
            ) : (
              dayGroups.map((group, gi) => (
                <div key={group.rawDate || gi} className="space-y-2">
                  {/* Day Group Header (Matches Screenshot) */}
                  <ValorantDayHeader group={group} />

                  {/* Match Rows */}
                  <div className="space-y-2">
                    {group.matches.map((match, mi) => (
                      <ValorantMatchRow
                        key={match.id || `${gi}-${mi}`}
                        match={match}
                        index={mi}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
