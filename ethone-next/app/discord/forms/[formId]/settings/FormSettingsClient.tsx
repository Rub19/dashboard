"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePathSegment } from "@/lib/hooks/usePathSegment";
import { ArrowLeft, Save, MessageSquare, Shield, Zap, Star, Plus, Trash2, Sliders, Send } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors DiscordFormSchema sub-objects in discord-bot/src/modules/forms/types.
type ButtonStyle = "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER";
type SubmissionMode = "MODAL" | "WEB" | "HYBRID";
type Trigger = "RESPONSE_SUBMITTED" | "RESPONSE_APPROVED" | "RESPONSE_REJECTED" | "RESPONSE_STATUS_CHANGED" | "SCORE_THRESHOLD_MET";
type ActionType = "ADD_ROLE" | "REMOVE_ROLE" | "SEND_DM" | "SEND_CHANNEL_MESSAGE" | "CREATE_THREAD" | "CREATE_TICKET" | "NOTIFY_STAFF" | "ADD_TAG" | "UPDATE_STATUS";

interface PanelConfig {
  channelId: string;
  messageId?: string;
  embedTitle: string;
  embedDescription: string;
  embedColor: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
  buttonText: string;
  buttonEmoji: string;
  buttonStyle: ButtonStyle;
  submissionMode: SubmissionMode;
}
interface AntiSpam {
  cooldownMinutes: number;
  maxSubmissionsPerUser: number;
  minAccountAgeDays: number;
  minGuildMembershipDays: number;
  requiredRoleIds: string[];
  forbiddenRoleIds: string[];
  blacklistUserIds: string[];
}
interface Scoring { enabled: boolean; maxScore: number; passScore: number; thresholds: { low: number; medium: number; high: number } }
interface AutomationAction { type: ActionType; targetRoleId?: string; targetChannelId?: string; messageTemplate?: string }
interface Automation { id: string; name: string; enabled: boolean; trigger: Trigger; conditions: { minScore?: number }; actions: AutomationAction[] }

const TRIGGER_LABEL: Record<Trigger, string> = {
  RESPONSE_SUBMITTED: "Nouvelle réponse", RESPONSE_APPROVED: "Réponse approuvée", RESPONSE_REJECTED: "Réponse refusée", RESPONSE_STATUS_CHANGED: "Statut modifié", SCORE_THRESHOLD_MET: "Score atteint",
};
const ACTION_LABEL: Record<ActionType, string> = {
  ADD_ROLE: "Ajouter un rôle", REMOVE_ROLE: "Retirer un rôle", SEND_DM: "Envoyer un MP", SEND_CHANNEL_MESSAGE: "Message dans un salon", CREATE_THREAD: "Créer un thread", CREATE_TICKET: "Créer un ticket", NOTIFY_STAFF: "Notifier le staff", ADD_TAG: "Ajouter un tag", UPDATE_STATUS: "Changer le statut",
};
const BTN_CLS: Record<ButtonStyle, string> = { PRIMARY: "bg-[#5865F2]", SECONDARY: "bg-[#4E5058]", SUCCESS: "bg-[#248046]", DANGER: "bg-[#DA373C]" };

export default function FormSettingsClient() {
  const searchParams = useSearchParams();
  const formId = usePathSegment("forms");
  const urlGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: showError } = useToast();

  const activeGuild = useMemo(() => {
    if (urlGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === urlGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [urlGuildId, profile?.guilds]);
  const rawGuildId = activeGuild?.id || urlGuildId || "";
  const isRealGuild = Boolean(BOT_API_URL) && Boolean(rawGuildId);
  const formUrl = `${BOT_API_URL}/api/guilds/${rawGuildId}/forms/${formId}`;

  const [activeTab, setActiveTab] = useState<"discord" | "antispam" | "scoring" | "automations">("discord");
  const [formTitle, setFormTitle] = useState("");
  const [formStatus, setFormStatus] = useState("DRAFT");
  const [panel, setPanel] = useState<PanelConfig | null>(null);
  const [antiSpam, setAntiSpam] = useState<AntiSpam | null>(null);
  const [scoring, setScoring] = useState<Scoring | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!isRealGuild || !formId) {
      setLoading(false);
      setLoadError("Connecte un serveur avec le bot pour configurer un formulaire.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(formUrl, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.form) throw new Error(data?.error || "Formulaire introuvable");
      const f = data.form;
      setFormTitle(f.title);
      setFormStatus(f.status);
      setPanel(f.panelConfig);
      setAntiSpam(f.antiSpam);
      setScoring(f.scoring);
      setAutomations(Array.isArray(f.automations) ? f.automations : []);
      setDirty(false);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message || "Impossible de charger le formulaire.");
    } finally {
      setLoading(false);
    }
  }, [formUrl, isRealGuild, formId]);

  useEffect(() => {
    load();
  }, [load]);

  const mark = <T,>(setter: (fn: (p: T) => T) => void) => (fn: (p: T) => T) => {
    setter(fn);
    setDirty(true);
  };
  const patchPanel = (p: Partial<PanelConfig>) => mark<PanelConfig | null>(setPanel)((prev) => (prev ? { ...prev, ...p } : prev));
  const patchSpam = (p: Partial<AntiSpam>) => mark<AntiSpam | null>(setAntiSpam)((prev) => (prev ? { ...prev, ...p } : prev));
  const patchScoring = (p: Partial<Scoring>) => mark<Scoring | null>(setScoring)((prev) => (prev ? { ...prev, ...p } : prev));
  const setAutos = mark<Automation[]>(setAutomations);

  const handleSave = async (): Promise<boolean> => {
    if (!panel || !antiSpam || !scoring) return false;
    setIsSaving(true);
    try {
      const res = await fetch(formUrl, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ panelConfig: panel, antiSpam, scoring, automations }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.form) throw new Error(data?.error || "save failed");
      setDirty(false);
      success("Paramètres enregistrés", "Panneau, anti-spam, scoring et automations mis à jour sur le bot.");
      return true;
    } catch (e: any) {
      showError("Échec de l'enregistrement", e?.message || "Le bot n'a pas répondu.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishDiscordPanel = async () => {
    if (!panel?.channelId.trim()) {
      showError("Salon requis", "Indique l'ID du salon où poster le panneau.");
      return;
    }
    if (dirty && !(await handleSave())) return;
    setPublishing(true);
    try {
      const res = await fetch(`${formUrl}/panel/publish`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ channelId: panel.channelId.trim() }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "publish failed");
      setPanel((p) => (p ? { ...p, messageId: data.messageId } : p));
      success("Panneau publié", `Embed + bouton postés dans <#${panel.channelId}>.`);
    } catch (e: any) {
      showError("Publication impossible", e?.message || "Le bot n'a pas pu poster dans ce salon.");
    } finally {
      setPublishing(false);
    }
  };

  const listField = (label: string, values: string[], onChange: (v: string[]) => void, placeholder: string) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-300">{label}</label>
      <input type="text" value={values.join(", ")} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder={placeholder} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500 font-mono" />
      <p className="text-[10px] text-zinc-500">IDs Discord séparés par des virgules.</p>
    </div>
  );

  if (loading) return <div className="min-h-full bg-[var(--bg-main)] text-xs text-zinc-400 flex items-center justify-center">Chargement...</div>;
  if (loadError || !panel || !antiSpam || !scoring) {
    return (
      <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-white p-8 pb-44 space-y-4">
        <Link href={`/discord/forms?guildId=${rawGuildId}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Retour aux formulaires</Link>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{loadError || "Données incomplètes."}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-white p-4 sm:p-6 lg:p-8 pb-44 md:pb-44 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/discord/forms?guildId=${rawGuildId}`} className="flex h-9 w-9 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Paramètres & intégration Discord</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{formTitle} · <span className={formStatus === "PUBLISHED" ? "text-emerald-400" : "text-amber-400"}>{formStatus}</span>{dirty && <span className="text-amber-400"> · non enregistré</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/discord/forms/${formId}?guildId=${rawGuildId}`} className="flex h-9 items-center gap-1.5 px-3 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
            <Sliders className="h-3.5 w-3.5" /> Builder
          </Link>
          <button onClick={handleSave} disabled={isSaving || !dirty} className={cn("flex h-9 items-center gap-1.5 px-4 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50", dirty ? "bg-indigo-600 hover:bg-indigo-500" : "bg-zinc-800")}>
            <Save className="h-3.5 w-3.5" /> {isSaving ? "Enregistrement..." : dirty ? "Sauvegarder" : "À jour"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--panel-border)] pb-3 overflow-x-auto">
        {[
          { id: "discord", label: "Panneau Discord", icon: MessageSquare }, { id: "antispam", label: "Anti-spam & éligibilité", icon: Shield },
          { id: "scoring", label: "Scoring", icon: Star }, { id: "automations", label: `Automations (${automations.length})`, icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={cn("flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer", activeTab === tab.id ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white hover:bg-white/5")}>
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "discord" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Configuration de l'embed</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Salon de destination</label>
              <ChannelPicker
                value={panel.channelId}
                onChange={(id) => patchPanel({ channelId: id })}
                guildId={rawGuildId}
                placeholder="ID du salon ou sélection dans la liste"
              />
              {panel.messageId && <p className="text-[10px] text-emerald-400">Panneau déjà posté (message {panel.messageId}) — republier en crée un nouveau.</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Titre</label>
              <input type="text" value={panel.embedTitle} onChange={(e) => patchPanel({ embedTitle: e.target.value })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Description</label>
              <textarea rows={3} value={panel.embedDescription} onChange={(e) => patchPanel({ embedDescription: e.target.value })} className="w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 p-2.5 text-xs text-white outline-none focus:border-indigo-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Texte du bouton</label>
                <input type="text" value={panel.buttonText} onChange={(e) => patchPanel({ buttonText: e.target.value })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Emoji</label>
                <input type="text" value={panel.buttonEmoji} onChange={(e) => patchPanel({ buttonEmoji: e.target.value })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Style du bouton</label>
                <select value={panel.buttonStyle} onChange={(e) => patchPanel({ buttonStyle: e.target.value as ButtonStyle })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-2.5 text-xs text-white outline-none">
                  <option value="PRIMARY">Bleu</option><option value="SECONDARY">Gris</option><option value="SUCCESS">Vert</option><option value="DANGER">Rouge</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Mode de soumission</label>
                <select value={panel.submissionMode} onChange={(e) => patchPanel({ submissionMode: e.target.value as SubmissionMode })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-2.5 text-xs text-white outline-none">
                  <option value="HYBRID">Hybride (modal si ≤ 5 champs texte)</option>
                  <option value="MODAL">Modal Discord natif</option>
                  <option value="WEB">Portail web ETHONE</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-semibold text-zinc-300">Couleur & footer</label>
                <div className="flex gap-2">
                  <input type="color" value={panel.embedColor} onChange={(e) => patchPanel({ embedColor: e.target.value })} className="h-9 w-10 rounded-lg border-0 bg-transparent cursor-pointer" />
                  <input type="text" value={panel.footerText} onChange={(e) => patchPanel({ footerText: e.target.value })} placeholder="Footer" className="h-9 flex-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none" />
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-[var(--panel-border)]">
              <button onClick={handlePublishDiscordPanel} disabled={publishing || formStatus !== "PUBLISHED"} title={formStatus !== "PUBLISHED" ? "Publie d'abord le formulaire depuis le builder" : ""} className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> {publishing ? "Envoi..." : panel.messageId ? "Republier le panneau" : "Publier le panneau sur Discord"}
              </button>
              {formStatus !== "PUBLISHED" && <p className="text-[10px] text-amber-400 mt-1.5 text-center">Le formulaire est en {formStatus} : publie-le depuis le builder avant de poster le panneau.</p>}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Aperçu Discord</h3>
            <div className="rounded-2xl border border-indigo-500/30 bg-[#2b2d31] p-4 text-white space-y-3 shadow-xl">
              <div className="border-l-4 pl-3 space-y-1.5" style={{ borderColor: panel.embedColor }}>
                <h4 className="text-sm font-bold text-white">{panel.embedTitle}</h4>
                <p className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{panel.embedDescription}</p>
                {panel.footerText && <p className="text-[10px] text-zinc-400 pt-1">{panel.footerText}</p>}
              </div>
              <div className="pt-2">
                <span className={cn("inline-flex px-4 py-1.5 rounded text-xs font-semibold text-white shadow items-center gap-1.5", BTN_CLS[panel.buttonStyle])}>
                  <span>{panel.buttonEmoji}</span><span>{panel.buttonText}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "antispam" && (
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 sm:p-6 space-y-4 max-w-2xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Règles anti-spam & éligibilité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ["Cooldown (minutes)", "cooldownMinutes", "1440 = 24 h entre deux soumissions."],
              ["Max soumissions par membre", "maxSubmissionsPerUser", "Candidatures simultanées autorisées."],
              ["Âge minimum du compte (jours)", "minAccountAgeDays", "Bloque les comptes récents."],
              ["Ancienneté serveur minimale (jours)", "minGuildMembershipDays", "Depuis l'arrivée sur le serveur."],
            ] as [string, keyof AntiSpam, string][]).map(([label, key, hint]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">{label}</label>
                <input type="number" min={0} value={antiSpam[key] as number} onChange={(e) => patchSpam({ [key]: Number(e.target.value) || 0 } as Partial<AntiSpam>)} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none focus:border-indigo-500" />
                <p className="text-[10px] text-zinc-500">{hint}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--panel-border)]">
            {listField("Rôles requis", antiSpam.requiredRoleIds, (v) => patchSpam({ requiredRoleIds: v }), "vide = tout le monde")}
            {listField("Rôles interdits", antiSpam.forbiddenRoleIds, (v) => patchSpam({ forbiddenRoleIds: v }), "ex: rôle « banni des candidatures »")}
          </div>
          {listField("Membres blacklistés", antiSpam.blacklistUserIds, (v) => patchSpam({ blacklistUserIds: v }), "IDs utilisateurs")}
        </div>
      )}

      {activeTab === "scoring" && (
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 sm:p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Scoring pondéré</h3>
              <p className="text-xs text-zinc-400">Les points définis sur chaque option (builder) sont additionnés par réponse.</p>
            </div>
            <input type="checkbox" checked={scoring.enabled} onChange={(e) => patchScoring({ enabled: e.target.checked })} className="h-4 w-4 rounded accent-indigo-500 cursor-pointer" />
          </div>
          {scoring.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">Score maximum</label>
                <input type="number" min={1} value={scoring.maxScore} onChange={(e) => patchScoring({ maxScore: Number(e.target.value) || 1 })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300">Seuil de passage</label>
                <input type="number" min={0} value={scoring.passScore} onChange={(e) => patchScoring({ passScore: Number(e.target.value) || 0 })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none" />
                <p className="text-[10px] text-zinc-500">Au-dessus : tag « Recommended ».</p>
              </div>
              {(["low", "medium", "high"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <label className="font-semibold text-zinc-300">Seuil {k === "low" ? "bas" : k === "medium" ? "moyen" : "haut"}</label>
                  <input type="number" value={scoring.thresholds[k]} onChange={(e) => patchScoring({ thresholds: { ...scoring.thresholds, [k]: Number(e.target.value) || 0 } })} className="h-9 w-full rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-zinc-900 px-3 text-xs text-white outline-none" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "automations" && (
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Automations</h3>
              <p className="text-xs text-zinc-400">Déclenchées par le bot lors des soumissions et décisions.</p>
            </div>
            <button onClick={() => setAutos((prev) => [...prev, { id: `auto-${Date.now().toString(36)}`, name: "Nouvelle règle", enabled: true, trigger: "RESPONSE_SUBMITTED", conditions: {}, actions: [{ type: "NOTIFY_STAFF" }] }])} className="flex h-8 items-center gap-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          {automations.length === 0 && <p className="text-xs text-zinc-500">Aucune automation. Exemple : à l'approbation → ajouter le rôle Modérateur + MP de bienvenue.</p>}
          <div className="space-y-3">
            {automations.map((rule) => {
              const update = (p: Partial<Automation>) => setAutos((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...p } : r)));
              const action = rule.actions[0] || { type: "NOTIFY_STAFF" as ActionType };
              const setAction = (p: Partial<AutomationAction>) => update({ actions: [{ ...action, ...p }, ...rule.actions.slice(1)] });
              const needsRole = action.type === "ADD_ROLE" || action.type === "REMOVE_ROLE";
              const needsChannel = action.type === "SEND_CHANNEL_MESSAGE" || action.type === "CREATE_THREAD" || action.type === "NOTIFY_STAFF";
              const needsMessage = action.type === "SEND_DM" || action.type === "SEND_CHANNEL_MESSAGE" || action.type === "CREATE_THREAD";
              return (
                <div key={rule.id} className="p-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white/[0.02] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0"><Zap className="h-4 w-4" /></div>
                    <input type="text" value={rule.name} onChange={(e) => update({ name: e.target.value })} className="flex-1 h-8 bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-[var(--input-border-hover)] focus:border-indigo-500 outline-none" />
                    <input type="checkbox" checked={rule.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="h-4 w-4 rounded accent-indigo-500 cursor-pointer" title="Activée" />
                    <button onClick={() => setAutos((prev) => prev.filter((r) => r.id !== rule.id))} className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <select value={rule.trigger} onChange={(e) => update({ trigger: e.target.value as Trigger })} className="h-8 rounded-lg border border-[var(--panel-border)] bg-zinc-900 px-2 text-xs text-white">
                      {(Object.keys(TRIGGER_LABEL) as Trigger[]).map((t) => <option key={t} value={t}>Quand : {TRIGGER_LABEL[t]}</option>)}
                    </select>
                    <select value={action.type} onChange={(e) => setAction({ type: e.target.value as ActionType })} className="h-8 rounded-lg border border-[var(--panel-border)] bg-zinc-900 px-2 text-xs text-white">
                      {(Object.keys(ACTION_LABEL) as ActionType[]).map((a) => <option key={a} value={a}>Alors : {ACTION_LABEL[a]}</option>)}
                    </select>
                    {rule.trigger === "SCORE_THRESHOLD_MET" && (
                      <input type="number" value={rule.conditions?.minScore ?? scoring.passScore} onChange={(e) => update({ conditions: { ...rule.conditions, minScore: Number(e.target.value) || 0 } })} placeholder="Score minimum" className="h-8 rounded-lg border border-[var(--panel-border)] bg-zinc-900 px-2 text-xs text-white" />
                    )}
                    {needsRole && <input type="text" value={action.targetRoleId || ""} onChange={(e) => setAction({ targetRoleId: e.target.value.trim() })} placeholder="ID du rôle" className="h-8 rounded-lg border border-[var(--panel-border)] bg-zinc-900 px-2 text-xs text-white font-mono" />}
                    {needsChannel && (
                      <div className="col-span-full">
                        <ChannelPicker
                          value={action.targetChannelId || ""}
                          onChange={(id) => setAction({ targetChannelId: id })}
                          guildId={rawGuildId}
                          size="sm"
                          placeholder="ID du salon ou sélection"
                        />
                      </div>
                    )}
                    {needsMessage && <input type="text" value={action.messageTemplate || ""} onChange={(e) => setAction({ messageTemplate: e.target.value })} placeholder="Message ({user}, {form}, {score})" className="h-8 rounded-lg border border-[var(--panel-border)] bg-zinc-900 px-2 text-xs text-white sm:col-span-2" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
