"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Settings,
  ArrowLeft,
  Save,
  MessageSquare,
  Shield,
  Zap,
  Star,
  CheckCircle2,
  Share2,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

export default function FormSettingsClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = (params?.formId as string) || "demo";
  const rawGuildId = searchParams.get("guildId") || "123456789012345678";
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<"discord" | "antispam" | "scoring" | "automations">("discord");

  // Discord Panel State
  const [channelId, setChannelId] = useState("123456789012345688");
  const [embedTitle, setEmbedTitle] = useState("🛡️ Recrutement Staff ETHONE 2026");
  const [embedDescription, setEmbedDescription] = useState(
    "Vous souhaitez vous investir et aider la communauté au quotidien ?\nPostulez dès maintenant via notre formulaire en ligne sécurisé."
  );
  const [embedColor, setEmbedColor] = useState("#6366f1");
  const [buttonText, setButtonText] = useState("Candidater au Staff");
  const [buttonStyle, setButtonStyle] = useState<"PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER">("PRIMARY");
  const [submissionMode, setSubmissionMode] = useState<"MODAL" | "WEB" | "HYBRID">("HYBRID");

  // Anti-Spam State
  const [cooldownMinutes, setCooldownMinutes] = useState(1440);
  const [maxSubmissions, setMaxSubmissions] = useState(1);
  const [minAccountAge, setMinAccountAge] = useState(7);
  const [minGuildMembership, setMinGuildMembership] = useState(1);

  // Scoring State
  const [scoringEnabled, setScoringEnabled] = useState(true);
  const [maxScore, setMaxScore] = useState(100);
  const [passScore, setPassScore] = useState(60);

  // Automations State
  const [automations, setAutomations] = useState([
    {
      id: "auto-1",
      name: "Notification Staff sur nouvelle candidature",
      trigger: "RESPONSE_SUBMITTED",
      action: "Message dans #staff-logs",
      enabled: true,
    },
    {
      id: "auto-2",
      name: "Attribution rôle Modérateur en test après approbation",
      trigger: "RESPONSE_APPROVED",
      action: "Rôle @Modérateur Test + DM de félicitations",
      enabled: true,
    },
    {
      id: "auto-3",
      name: "Création de ticket support si score >= 80",
      trigger: "SCORE_THRESHOLD_MET",
      action: "Créer ticket dans catégorie Recrutement",
      enabled: true,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      success("Paramètres enregistrés", "La configuration du formulaire et du panneau Discord a été mise à jour.");
    }, 400);
  };

  const handlePublishDiscordPanel = () => {
    success("Panneau Discord publié", `L'embed de candidature a été posté dans le salon <#${channelId}>.`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/discord/forms?guildId=${rawGuildId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Paramètres &amp; Intégration Discord</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Gérez l&apos;affichage de l&apos;embed Discord, les barrières anti-spam, le scoring et les automations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/discord/forms/${formId}?guildId=${rawGuildId}`}
            className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Builder</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-9 items-center gap-1.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500 transition-all cursor-pointer active:scale-95"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Enregistrement..." : "Sauvegarder"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: "discord", label: "Panneau Discord & Embed", icon: MessageSquare },
          { id: "antispam", label: "Anti-Spam & Sécurité", icon: Shield },
          { id: "scoring", label: "Scoring & Évaluation", icon: Star },
          { id: "automations", label: "Automatisations & Rôles", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                isActive
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DISCORD PANEL */}
      {activeTab === "discord" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Form */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Configuration de l&apos;Embed</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Salon Discord de destination</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="ID ou #nom-du-salon"
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-zinc-500">Le bot y enverra le panneau avec le bouton interactif.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Titre de l&apos;Embed</label>
              <input
                type="text"
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Description</label>
              <textarea
                rows={3}
                value={embedDescription}
                onChange={(e) => setEmbedDescription(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Texte du Bouton</label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Mode de soumission</label>
                <select
                  value={submissionMode}
                  onChange={(e) => setSubmissionMode(e.target.value as any)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="HYBRID">Hybride (Modal ou Web selon champs)</option>
                  <option value="MODAL">Modal Discord natif (≤ 5 champs)</option>
                  <option value="WEB">Portail Web ETHONE</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <button
                onClick={handlePublishDiscordPanel}
                className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Publier le Panneau sur Discord
              </button>
            </div>
          </div>

          {/* Live Embed Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Rendu Discord en Direct</h3>
            <div className="rounded-2xl border border-indigo-500/30 bg-[#2b2d31] p-4 text-white space-y-3 shadow-xl">
              <div className="border-l-4 border-indigo-500 pl-3 space-y-1.5">
                <h4 className="text-sm font-bold text-white">{embedTitle}</h4>
                <p className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{embedDescription}</p>
              </div>

              <div className="pt-2">
                <button
                  disabled
                  className="px-4 py-1.5 rounded bg-[#5865F2] text-xs font-semibold text-white shadow flex items-center gap-1.5 cursor-not-allowed opacity-90"
                >
                  <span>📝</span>
                  <span>{buttonText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANTI-SPAM */}
      {activeTab === "antispam" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-4 max-w-2xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Règles Anti-Spam &amp; Éligibilité</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Délai d&apos;attente (Cooldown en minutes)</label>
              <input
                type="number"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-zinc-500">1440 min = 24 heures entre deux soumissions.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Max soumissions par utilisateur</label>
              <input
                type="number"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-zinc-500">Nombre maximum de candidatures simultanées.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Âge minimum du compte Discord (jours)</label>
              <input
                type="number"
                value={minAccountAge}
                onChange={(e) => setMinAccountAge(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-zinc-500">Bloque les comptes récents anti-raid.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Ancienneté serveur minimale (jours)</label>
              <input
                type="number"
                value={minGuildMembership}
                onChange={(e) => setMinGuildMembership(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-zinc-500">Temps minimum depuis l&apos;arrivée sur le serveur.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCORING */}
      {activeTab === "scoring" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Moteur de Scoring Pondéré</h3>
              <p className="text-xs text-zinc-400">Attribuez des points aux réponses pour qualifier automatiquement les profils.</p>
            </div>
            <input
              type="checkbox"
              checked={scoringEnabled}
              onChange={(e) => setScoringEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          {scoringEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">Score Maximum</label>
                <input
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">Seuil de passage (Pass Score)</label>
                <input
                  type="number"
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                  className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-zinc-500">Attribue automatiquement le tag &quot;Recommended&quot;.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUTOMATIONS */}
      {activeTab === "automations" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Règles d&apos;Automatisation No-Code</h3>
              <p className="text-xs text-zinc-400">Déclenchez des actions Discord sans coder lors des soumissions ou reviews.</p>
            </div>
            <button
              onClick={() => {
                const newRule = {
                  id: `auto-${Date.now()}`,
                  name: "Nouvelle règle d'automation",
                  trigger: "RESPONSE_SUBMITTED",
                  action: "Notification Staff",
                  enabled: true,
                };
                setAutomations((prev) => [...prev, newRule]);
                success("Règle ajoutée", "Configurez votre déclencheur et vos actions.");
              }}
              className="flex h-8 items-center gap-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter une règle</span>
            </button>
          </div>

          <div className="space-y-3">
            {automations.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Déclencheur : <code className="text-indigo-300">{rule.trigger}</code> ➔ Action : {rule.action}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAutomations((prev) =>
                        prev.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r))
                      );
                    }}
                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                  />
                  <button
                    onClick={() => setAutomations((prev) => prev.filter((r) => r.id !== rule.id))}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
