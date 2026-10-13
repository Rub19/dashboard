"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { brainComplete } from "@/lib/brain/providers";
import { calculateMapAnalytics, calculateInsights } from "@/lib/valorant-analytics";
import { calculateAgentStats, type ValorantAccountProfile, type ValorantComputedStats } from "@/lib/valorant-provider";
import type { ValorantMatch } from "@/lib/valorant-tracker";
import { Bot, Sparkles, Loader2, Target, Swords, MapPin, CheckCircle2 } from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface ValorantAiCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ValorantAccountProfile | null;
  stats: ValorantComputedStats | null;
  matches: ValorantMatch[];
}

export default function ValorantAiCoachModal({
  isOpen,
  onClose,
  profile,
  stats,
  matches,
}: ValorantAiCoachModalProps) {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("general");

  const runAnalysis = async (topic: string, promptTitle: string) => {
    setActiveTopic(topic);
    setLoading(true);
    setResponse(null);

    const mapStats = calculateMapAnalytics(matches);
    const agentStats = calculateAgentStats(matches);
    const insights = calculateInsights(matches);

    const facts = [
      `Joueur: ${profile?.name || "Inconnu"}#${profile?.tag || "TAG"}`,
      `Rang: ${profile?.currentTierPatched || "Non classé"}`,
      `Échantillon: ${matches.length} parties`,
      `Taux de victoire: ${stats?.winRate !== null ? `${stats?.winRate}%` : "Non disponible"}`,
      `Ratio K/D: ${stats?.kdRatio !== null ? stats?.kdRatio : "Non disponible"}`,
      `Précision Headshot: ${stats?.headshotPercentage !== null ? `${stats?.headshotPercentage}%` : "Non disponible"}`,
      `Dégâts moyens / round: ${stats?.adr !== null ? `${stats?.adr} ADR` : "Non disponible"}`,
      `Agents les plus joués: ${agentStats.slice(0, 3).map((a) => `${a.agentName} (${a.matches} parties, ${a.winRate}% WR, ${a.kdRatio} KD)`).join(", ") || "Aucun"}`,
      `Cartes analysées: ${mapStats.slice(0, 3).map((m) => `${m.mapName} (${m.winRate}% WR, ${m.kdRatio} KD)`).join(", ") || "Aucune"}`,
      `Points forts factuels: ${insights.strengths.map((s) => `${s.title} (${s.metric})`).join("; ") || "Aucun détecté"}`,
      `Axes d'amélioration factuels: ${insights.improvements.map((i) => `${i.title} (${i.metric})`).join("; ") || "Aucun détecté"}`,
    ].join("\n");

    const systemPrompt = `Tu es le Coach Gaming IA d'ETHONE pour Valorant.
RÈGLES STRICTES:
1. Base ton analyse STRICTEMENT et UNIQUEMENT sur les faits télémétriques fournis ci-dessous.
2. Ne fabrique JAMAIS de résultats de matchs, d'adversaires imaginaires ou de statistiques inventées.
3. Distingue clairement les observations factuelles issues des données réelles des conseils d'entraînement méthodologiques.
4. Réponds en français, avec un ton structuré, bienveillant et tactique.
5. Propose 3 objectifs concrets et mesurables pour les prochaines parties.

TÉLÉMÉTRIE JOUEUR :
${facts}`;

    const userQuery = `Demande spécifique : ${promptTitle}. Donne-moi ton analyse personnalisée et tes recommandations d'entraînement ciblées.`;

    try {
      const res = await brainComplete({
        provider: "cloudflare",
        fallback: "groq",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
      });

      const reply = res?.data?.content || res?.data?.text || res?.content || res?.text;
      if (typeof reply === "string" && reply.trim()) {
        setResponse(reply.trim());
      } else {
        throw new Error("Réponse de l'assistant IA vide");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur de génération du coaching IA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Coach Gaming IA — ETHONE Brain"
      description="Générez des recommandations tactiques et des routines d'entraînement basées exclusivement sur vos statistiques réelles."
      size="lg"
      hideFooter
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => runAnalysis("general", "Bilan de performance global et axes de progression")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "general"
                ? "border-rose-500/50 bg-rose-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Bilan Global & Routine</p>
              <p className="text-[10px] text-[var(--text-muted)]">Diagnostic complet et plan d&apos;action</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis("aim", "Exercices pour le placement de réticule et la précision de tir")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "aim"
                ? "border-cyan-500/50 bg-cyan-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Target className="h-4 w-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Précision & Duels</p>
              <p className="text-[10px] text-[var(--text-muted)]">Entraînement réticule et discipline de tir</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis("agent", "Maîtrise tactique et impact avec mon agent principal")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "agent"
                ? "border-emerald-500/50 bg-emerald-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Swords className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Optimisation d&apos;Agent</p>
              <p className="text-[10px] text-[var(--text-muted)]">Utilitaires, prises d&apos;espace et trades</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => runAnalysis("map", "Stratégies pour corriger mes faiblesses sur mes pires cartes")}
            disabled={loading}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--panel-radius)] border p-3 text-left transition-all cursor-pointer",
              activeTopic === "map"
                ? "border-amber-500/50 bg-amber-500/10 text-[var(--text-primary)]"
                : "border-[var(--panel-border)] bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Adaptation Cartes</p>
              <p className="text-[10px] text-[var(--text-muted)]">Timings de rotation et contrôle de ligne</p>
            </div>
          </button>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 min-h-[220px] max-h-[380px] overflow-y-auto os-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
              <p className="mt-3 text-xs font-bold text-[var(--text-primary)]">
                Analyse de votre télémétrie en cours...
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Extraction des indicateurs clés et calcul des priorités tactiques
              </p>
            </div>
          ) : response ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold pb-2 border-b border-[var(--panel-border)]/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Rapport d&apos;entraînement généré</span>
              </div>
              <div className="text-xs text-[var(--text-primary)]/90 leading-relaxed whitespace-pre-wrap font-sans">
                {response}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
              <Bot className="h-8 w-8 text-[var(--text-muted)]/60 mb-2" />
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Sélectionnez une thématique ci-dessus
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]/80 max-w-sm">
                Le Coach IA analysera vos {matches.length} parties enregistrées sans jamais inventer de données.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--panel-border)]">
          <span className="text-[10px] text-[var(--text-muted)]">
            🔒 Télémétrie factuelle uniquement · Confidentialité respectée
          </span>
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
