"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { fetchPlayerProfile, calculateComputedStats, type ValorantAccountProfile, type ValorantComputedStats } from "@/lib/valorant-provider";
import { fetchWorker } from "@/lib/api";
import type { ValorantMatch } from "@/lib/valorant-tracker";
import { Swords, User, Copy, Check, Loader2 } from "@/components/icons/ph";

export interface ValorantFriendCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  myProfile: ValorantAccountProfile | null;
  myStats: ValorantComputedStats | null;
  myMatches: ValorantMatch[];
}

export default function ValorantFriendCompareModal({
  isOpen,
  onClose,
  myProfile,
  myStats,
  myMatches,
}: ValorantFriendCompareModalProps) {
  const { success, error: showError } = useToast();

  const [friendName, setFriendName] = useState("");
  const [friendTag, setFriendTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [friendProfile, setFriendProfile] = useState<ValorantAccountProfile | null>(null);
  const [friendStats, setFriendStats] = useState<ValorantComputedStats | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = friendName.trim();
    const cleanTag = friendTag.trim().replace(/^#/, "");

    if (!cleanName || !cleanTag) {
      showError("Veuillez renseigner le nom et le tag de votre ami(e)");
      return;
    }

    setLoading(true);
    try {
      const profileRes = await fetchPlayerProfile(cleanName, cleanTag, true);
      if (!profileRes.data) {
        showError(profileRes.error || "Joueur introuvable");
        setFriendProfile(null);
        setFriendStats(null);
        return;
      }
      setFriendProfile(profileRes.data);

      const matchesRes = await fetchWorker(
        `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
      );
      const list = (matchesRes?.data?.matches || matchesRes?.data || matchesRes?.matches || matchesRes || []) as ValorantMatch[];
      const validMatches = Array.isArray(list) ? list : [];
      const computed = calculateComputedStats(validMatches, "henrikdev");
      setFriendStats(computed);
      success(`Comparaison prête avec ${cleanName}#${cleanTag}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur de comparaison");
    } finally {
      setLoading(false);
    }
  };

  const handleShareSummary = async () => {
    const pName = myProfile?.name || "Joueur";
    const pTag = myProfile?.tag ? `#${myProfile.tag}` : "";
    const rank = myProfile?.currentTierPatched || "Non classé";
    const wr = myStats?.winRate !== null ? `${myStats?.winRate}% WR` : "";
    const kd = myStats?.kdRatio !== null ? `${myStats?.kdRatio} K/D` : "";
    const hs = myStats?.headshotPercentage !== null ? `${myStats?.headshotPercentage}% HS` : "";

    const parts = [rank, wr, kd, hs].filter(Boolean).join(" · ");
    const text = `🎯 Stats Valorant de ${pName}${pTag} sur ETHONE : ${parts}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      success("Résumé copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Impossible de copier dans le presse-papier");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Comparaison Sociale & Partage de Statistiques"
      description="Comparez vos statistiques Valorant avec un(e) ami(e) ou partagez votre fiche de jeu."
      size="lg"
      hideFooter
    >
      <div className="space-y-4">
        <form onSubmit={handleCompare} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 flex-1 w-full">
            <User className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              aria-label="Pseudo de votre ami(e)"
              className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 w-full sm:w-28 shrink-0">
            <span className="text-xs font-bold text-[var(--text-muted)]">#</span>
            <input
              type="text"
              value={friendTag}
              onChange={(e) => setFriendTag(e.target.value)}
              aria-label="TAG ami"
              className="w-full bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] outline-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 shrink-0 bg-gradient-to-r from-rose-600 to-red-600 font-bold"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
            <span>Comparer</span>
          </Button>
        </form>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-4 space-y-4">
          <div className="grid grid-cols-3 items-center text-center pb-3 border-b border-[var(--panel-border)]/50">
            <div>
              <p className="text-xs font-black text-rose-400">
                {myProfile?.name || "Vous"}
                {myProfile?.tag ? ` #${myProfile.tag}` : ""}
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">{myProfile?.currentTierPatched || "Non classé"}</span>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Indicateur
            </div>

            <div>
              <p className="text-xs font-black text-cyan-400">
                {friendProfile ? `${friendProfile.name} #${friendProfile.tag}` : "Ami(e)"}
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">
                {friendProfile ? friendProfile.currentTierPatched || "Non classé" : "En attente"}
              </span>
            </div>
          </div>

          {(
            [
              {
                label: "Taux de Victoire",
                myVal: myStats?.winRate !== null && myStats?.winRate !== undefined ? `${myStats.winRate}%` : "—",
                friendVal: friendStats?.winRate !== null && friendStats?.winRate !== undefined ? `${friendStats.winRate}%` : "—",
              },
              {
                label: "Ratio K/D",
                myVal: myStats?.kdRatio !== null && myStats?.kdRatio !== undefined ? String(myStats.kdRatio) : "—",
                friendVal: friendStats?.kdRatio !== null && friendStats?.kdRatio !== undefined ? String(friendStats.kdRatio) : "—",
              },
              {
                label: "Précision Headshot",
                myVal: myStats?.headshotPercentage !== null && myStats?.headshotPercentage !== undefined ? `${myStats.headshotPercentage}%` : "—",
                friendVal: friendStats?.headshotPercentage !== null && friendStats?.headshotPercentage !== undefined ? `${friendStats.headshotPercentage}%` : "—",
              },
              {
                label: "Dégâts / Round (ADR)",
                myVal: myStats?.adr !== null && myStats?.adr !== undefined ? String(myStats.adr) : "—",
                friendVal: friendStats?.adr !== null && friendStats?.adr !== undefined ? String(friendStats.adr) : "—",
              },
              {
                label: "Parties Analysées",
                myVal: String(myStats?.matchesCount ?? myMatches.length),
                friendVal: String(friendStats?.matchesCount ?? "—"),
              },
            ] as const
          ).map((metric) => (
            <div key={metric.label} className="grid grid-cols-3 items-center text-center py-1.5 text-xs">
              <span className="font-mono font-bold text-[var(--text-primary)]">{metric.myVal}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{metric.label}</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{metric.friendVal}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[var(--panel-border)]">
          <p className="text-[11px] text-[var(--text-muted)] text-center sm:text-left">
            🔒 Seules les statistiques publiques autorisées sont comparées.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleShareSummary}
              className="flex items-center justify-center gap-1.5 text-xs font-bold w-full sm:w-auto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copié !" : "Copier ma fiche"}</span>
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onClose} className="w-full sm:w-auto">
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
