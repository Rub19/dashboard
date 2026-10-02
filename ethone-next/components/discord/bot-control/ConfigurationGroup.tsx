"use client";

import {
  Layers,
  Settings,
  Check,
  Server,
  Lock,
  Zap,
  Shield,
  CheckCircle2,
  Sparkles,
  Globe,
  Palette,
  Volume2,
  Timer,
  Trash2,
  ShieldCheck,
  Bot,
  Database,
  Terminal,
  ShieldAlert,
  X,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { BotTab } from "@/app/discord/bot/BotControlClient";
import ChannelPicker from "@/components/discord/ChannelPicker";

interface ConfigurationGroupProps {
  activeTab: BotTab;
  // Shared (modules + settings)
  modules: any[];
  MODULE_ICONS: Record<string, any>;
  settingsGuildId: string;
  setSettingsGuildId: (id: string) => void;
  servers: any[];
  modulesLoading: boolean;
  modulesError: string | null;
  loadModules: () => void;
  togglingModuleId: string | null;
  handleToggleModule: (moduleId: string, nextEnabled: boolean) => void;
  // Settings
  botSettings: any;
  setBotSettings: (updater: (s: any) => any) => void;
  handleSaveSettings: () => void;
  savingSettings: boolean;
  loadingGuildSettings: boolean;
  activeRolePreset: string;
  handleApplyRolePreset: (presetId: string, label: string) => void;
  applyingRolePreset: boolean;
  detectedRolesList: any[];
  // AI
  aiTelemetry: any;
  dedicatedAiChannelEnabled: boolean;
  setDedicatedAiChannelEnabled: (v: boolean) => void;
  dedicatedAiChannel: string;
  setDedicatedAiChannel: (v: string) => void;
  allowImageGen: boolean;
  setAllowImageGen: (v: boolean) => void;
  thonMood: string;
  setThonMood: (v: any) => void;
  newBannedWordInput: string;
  setNewBannedWordInput: (v: string) => void;
  handleAddBannedWord: () => void;
  bannedWordsList: string[];
  handleRemoveBannedWord: (word: string) => void;
  saveAiBehaviorSettings: (patch: Record<string, unknown>) => void;
  aiTextChannels: { id: string; name: string }[];
  toast: any;
}

export default function ConfigurationGroup({
  activeTab,
  modules,
  MODULE_ICONS,
  settingsGuildId,
  setSettingsGuildId,
  servers,
  modulesLoading,
  modulesError,
  loadModules,
  togglingModuleId,
  handleToggleModule,
  botSettings,
  setBotSettings,
  handleSaveSettings,
  savingSettings,
  loadingGuildSettings,
  activeRolePreset,
  handleApplyRolePreset,
  applyingRolePreset,
  detectedRolesList,
  aiTelemetry,
  dedicatedAiChannelEnabled,
  setDedicatedAiChannelEnabled,
  dedicatedAiChannel,
  setDedicatedAiChannel,
  allowImageGen,
  setAllowImageGen,
  thonMood,
  setThonMood,
  newBannedWordInput,
  setNewBannedWordInput,
  handleAddBannedWord,
  bannedWordsList,
  handleRemoveBannedWord,
  saveAiBehaviorSettings,
  aiTextChannels,
  toast,
}: ConfigurationGroupProps) {
  return (
    <>
      {activeTab === "modules" && (
        <Card variant="default" padding="none" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                Modules du Serveur ({modules.length})
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Activez/désactivez les modules pour un serveur — identique à la commande Discord{" "}
                <code className="text-[var(--text-primary)]/85">/module</code>
              </p>
            </div>
            <select
              value={settingsGuildId}
              onChange={(e) => setSettingsGuildId(e.target.value)}
              disabled={servers.length === 0}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--panel-border)] text-xs text-[var(--text-primary)]/85 focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
            >
              {servers.length === 0 && <option value="">Aucun serveur détecté</option>}
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {!settingsGuildId ? (
            <p className="text-xs text-[var(--text-muted)] italic">Sélectionnez un serveur pour voir ses modules.</p>
          ) : modulesLoading && modules.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">Chargement des modules…</p>
          ) : modulesError ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">
              <span className="flex items-center gap-2 font-medium">
                <Layers className="h-4 w-4 shrink-0" />
                {modulesError}
              </span>
              <button
                onClick={() => loadModules()}
                className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold transition-[color,background-color,border-color,transform] hover:bg-red-500/15 cursor-pointer active:scale-[0.97]"
              >
                Réessayer
              </button>
            </div>
          ) : modules.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">Aucun module disponible pour ce serveur.</p>
          ) : (
            <div className="stagger-children grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((m) => {
                const ModIcon = MODULE_ICONS[m.icon] || Layers;
                const disabled = m.available === false || togglingModuleId === m.id;
                return (
                  <div key={m.id} className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <ModIcon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        {m.name}
                      </span>
                      {m.available === false ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--text-primary)]/6 text-[var(--text-muted)] border border-[var(--text-primary)]/6 shrink-0">
                          Bientôt disponible
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleModule(m.id, !m.enabled)}
                          disabled={disabled}
                          title={m.enabled ? "Désactiver ce module" : "Activer ce module"}
                          className={cn(
                            "w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 disabled:opacity-50",
                            m.enabled ? "bg-[var(--success)]" : "bg-[var(--text-primary)]/15"
                          )}
                        >
                          <span
                            className={cn(
                              "block w-4 h-4 rounded-full bg-white transition-transform",
                              m.enabled ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">{m.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === "settings" && (
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[var(--accent-primary)]" />
                  Configuration Opérationnelle & Confidentialité
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Définissez le comportement global, la visibilité des réponses et le style d'interaction du bot
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 active:scale-[0.97]"
              >
                <Check className={cn("w-4 h-4", savingSettings && "animate-spin")} />
                <span>{savingSettings ? "Enregistrement..." : "Enregistrer les modifications"}</span>
              </button>
            </div>

            {/* Server selector — the language field below is per-guild and reads/writes
                the real bot config for whichever server is selected here. */}
            <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)] shrink-0">
                <Server className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                Serveur concerné
              </div>
              <select
                value={settingsGuildId}
                onChange={(e) => setSettingsGuildId(e.target.value)}
                disabled={servers.length === 0}
                className="flex-1 bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              >
                {servers.length === 0 && <option value="">Aucun serveur détecté</option>}
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {loadingGuildSettings && (
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">Chargement…</span>
              )}
            </div>

            {/* Maintenance & Core Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Mode Maintenance Global
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Suspend les commandes pour les membres ordinaires pendant les mises à jour
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={botSettings.maintenanceMode}
                  onClick={() => {
                    const next = !botSettings.maintenanceMode;
                    setBotSettings((s: any) => ({ ...s, maintenanceMode: next }));
                    toast?.toggle?.(
                      "Mode Maintenance",
                      next,
                      next ? "Activé — Seuls les administrateurs peuvent exécuter les commandes." : "Désactivé — Le bot est opérationnel pour tous."
                    );
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer",
                    botSettings.maintenanceMode ? "bg-amber-500" : "bg-[var(--text-primary)]/10"
                  )}
                >
                  <span
                    className={cn(
                      "block w-5 h-5 rounded-full bg-white transition-transform",
                      botSettings.maintenanceMode ? "translate-x-6" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    Auto-Reconnexion Gateway
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Rétablit instantanément les shards en cas de micro-coupure réseau
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={botSettings.autoReconnect}
                  onClick={() => {
                    const next = !botSettings.autoReconnect;
                    setBotSettings((s: any) => ({ ...s, autoReconnect: next }));
                    toast?.toggle?.(
                      "Auto-Reconnexion Gateway",
                      next,
                      next ? "Activée — Rétablissement instantané en cas de coupure." : "Désactivée."
                    );
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer",
                    botSettings.autoReconnect ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/10"
                  )}
                >
                  <span
                    className={cn(
                      "block w-5 h-5 rounded-full bg-white transition-transform",
                      botSettings.autoReconnect ? "translate-x-6" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Confidentiality & Response Visibility */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
                    Visibilité & Confidentialité des Réponses
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Choisissez si les réponses aux commandes (/ask, /bot, /music, etc.) sont visibles publiquement ou privées
                  </p>
                </div>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold",
                    botSettings.responseVisibility === "EPHEMERAL"
                      ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                      : "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                  )}
                >
                  {botSettings.responseVisibility === "EPHEMERAL" ? "🔒 Mode Privé (Éphémère)" : "👁️ Mode Public"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => setBotSettings((s: any) => ({ ...s, responseVisibility: "PUBLIC" }))}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all space-y-1.5",
                    botSettings.responseVisibility === "PUBLIC"
                      ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--text-primary)]"
                      : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:border-[var(--text-primary)]/16 text-[var(--text-muted)]"
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span>👁️ Réponses Publiques</span>
                    {botSettings.responseVisibility === "PUBLIC" && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] ml-auto" />
                    )}
                  </div>
                  <p className="text-[11px]">
                    Les embeds et messages de réponse apparaissent dans le salon textuel pour tous les membres présents.
                  </p>
                </div>

                <div
                  onClick={() => setBotSettings((s: any) => ({ ...s, responseVisibility: "EPHEMERAL" }))}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all space-y-1.5",
                    botSettings.responseVisibility === "EPHEMERAL"
                      ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--text-primary)]"
                      : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:border-[var(--text-primary)]/16 text-[var(--text-muted)]"
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span>🔒 Réponses Privées (Éphémères)</span>
                    {botSettings.responseVisibility === "EPHEMERAL" && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] ml-auto" />
                    )}
                  </div>
                  <p className="text-[11px]">
                    Les réponses ne sont visibles <strong>que par l'utilisateur</strong> ayant invoqué la commande. Aucun spam dans le salon.
                  </p>
                </div>
              </div>
            </div>

            {/* Bot Personality / Tone */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                  Style & Personnalité du Bot (Moteur IA)
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Définit le ton de communication adopté lors des réponses (/ask, messages d'accueil, etc.)
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
                {[
                  { id: "FRIENDLY", label: "Amical", emoji: "🤝", desc: "Chaleureux, bienveillant et positif" },
                  { id: "PROFESSIONAL", label: "Professionnel", emoji: "👔", desc: "Sobre, rigoureux et courtois" },
                  { id: "HUMOROUS", label: "Humoristique", emoji: "😄", desc: "Détendu avec touches d'humour" },
                  { id: "CONCISE", label: "Concis", emoji: "⚡", desc: "Direct, bref et sans bavardage" },
                  { id: "CYBER", label: "Cyberpunk", emoji: "👾", desc: "Style néon futuriste et geek" },
                ].map((p) => {
                  const isSelected = botSettings.botPersonality === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setBotSettings((s: any) => ({ ...s, botPersonality: p.id as any }))}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all text-center space-y-1",
                        isSelected
                          ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--text-primary)]"
                          : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:border-[var(--text-primary)]/16 text-[var(--text-muted)]"
                      )}
                    >
                      <span className="text-2xl block">{p.emoji}</span>
                      <span className="text-xs font-bold block">{p.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)] block leading-tight">{p.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bot Identity & Prefix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] block">Nom affiché du Bot</label>
                <input
                  type="text"
                  value={botSettings.customBotName}
                  onChange={(e) => setBotSettings((s: any) => ({ ...s, customBotName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                  placeholder="Nom du bot..."
                />
                <span className="text-[10px] text-[var(--text-muted)] block">Apparaît dans les titres et pieds de page des embeds Discord</span>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] block">Préfixe Textuel par Défaut</label>
                <div className="stagger-children flex items-center gap-2">
                  {["!", "?", "$", "/", ">>"].map((pref) => (
                    <button
                      key={pref}
                      onClick={() => setBotSettings((s: any) => ({ ...s, defaultPrefix: pref }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all",
                        botSettings.defaultPrefix === pref
                          ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                          : "bg-[var(--surface-raised)]/60 text-[var(--text-muted)] border border-[var(--panel-border)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {pref}
                    </button>
                  ))}
                  <input
                    type="text"
                    maxLength={5}
                    value={botSettings.defaultPrefix}
                    onChange={(e) => setBotSettings((s: any) => ({ ...s, defaultPrefix: e.target.value }))}
                    className="w-20 px-3 py-1.5 rounded-lg bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] text-center font-mono font-bold focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block">Utilisable en complément des commandes Slash (ex: {botSettings.defaultPrefix}help)</span>
              </div>
            </div>

            {/* Multilingual Support (4 Languages) */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    Langue Officielle & Internationalisation (i18n)
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Définit la langue utilisée par le bot pour les embeds, messages d'aide, réglages et réponses IA
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {botSettings.language.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  { id: "fr", label: "Français", flag: "🇫🇷", desc: "Configuration française native" },
                  { id: "en", label: "English", flag: "🇬🇧", desc: "International English support" },
                  { id: "es", label: "Español", flag: "🇪🇸", desc: "Soporte completo en español" },
                  { id: "de", label: "Deutsch", flag: "🇩🇪", desc: "Deutsche Lokalisierung" },
                ].map((lang) => {
                  const isSelected = botSettings.language === lang.id;
                  return (
                    <div
                      key={lang.id}
                      onClick={() => setBotSettings((s: any) => ({ ...s, language: lang.id as any }))}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5",
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500 text-[var(--text-primary)]"
                          : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:border-[var(--text-primary)]/16 text-[var(--text-muted)]"
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 ml-auto" />}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight">{lang.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graphic Theme Presets */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-400" />
                  Thèmes Graphiques & Palettes de Couleurs
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Harmonise automatiquement la couleur principale et secondaire de tous les embeds Discord
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {[
                  { id: "DEFAULT", name: "Discord Blurple", hex: "#5865F2", secondary: "#4752C4" },
                  { id: "CYBERPUNK", name: "Cyberpunk Neon", hex: "#00F0FF", secondary: "#7000FF" },
                  { id: "EMERALD", name: "Emerald Green", hex: "#10B981", secondary: "#047857" },
                  { id: "SUNSET", name: "Sunset Gold", hex: "#F59E0B", secondary: "#D97706" },
                  { id: "DARK", name: "Obsidian Dark", hex: "#27272A", secondary: "#18181B" },
                ].map((theme) => {
                  const isSelected = botSettings.themePreset === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setBotSettings((s: any) => ({ ...s, themePreset: theme.id as any }))}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all space-y-2 text-center",
                        isSelected
                          ? "bg-[var(--text-primary)]/9 border-pink-500 shadow-sm text-[var(--text-primary)]"
                          : "bg-[var(--surface-raised)]/40 border-[var(--panel-border)] hover:border-[var(--text-primary)]/16 text-[var(--text-muted)]"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: theme.hex }} />
                        <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: theme.secondary }} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{theme.name}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] block">{theme.hex}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audio & Anti-Spam Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[var(--accent-primary)]" />
                    Volume Musique par Défaut
                  </label>
                  <span className="font-mono text-xs font-bold text-[var(--accent-primary)] px-2 py-0.5 rounded bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
                    {botSettings.musicDefaultVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={botSettings.musicDefaultVolume}
                  onChange={(e) => setBotSettings((s: any) => ({ ...s, musicDefaultVolume: Number(e.target.value) }))}
                  className="w-full accent-[var(--accent-primary)] cursor-pointer"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Volume initial appliqué à chaque nouvelle piste audio jouée avec /music play
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-400" />
                    Cooldown Anti-Spam Commandes
                  </label>
                  <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {botSettings.commandCooldown}s
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  value={botSettings.commandCooldown}
                  onChange={(e) => setBotSettings((s: any) => ({ ...s, commandCooldown: Number(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Délai d'attente imposé aux utilisateurs entre 2 commandes consécutives (0 = désactivé)
                </p>
              </div>
            </div>

            {/* Auto-Delete Invoked Commands Toggle */}
            <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Suppression Automatique des Invocations
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Supprime automatiquement le message texte de l'utilisateur après l'exécution de la commande (mode préfixe) pour garder les salons propres
                </p>
              </div>
              <button
                role="switch"
                aria-checked={botSettings.autoDeleteCommands}
                onClick={() => {
                  const next = !botSettings.autoDeleteCommands;
                  setBotSettings((s: any) => ({ ...s, autoDeleteCommands: next }));
                  toast?.toggle?.(
                    "Suppression auto des commandes",
                    next,
                    next ? "Activée — Le message source de l'invocation sera nettoyé." : "Désactivée."
                  );
                }}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer",
                  botSettings.autoDeleteCommands ? "bg-rose-500" : "bg-[var(--text-primary)]/10"
                )}
              >
                <span
                  className={cn(
                    "block w-5 h-5 rounded-full bg-white transition-transform",
                    botSettings.autoDeleteCommands ? "translate-x-6" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* SECTION: GESTIONNAIRE DES RÔLES & PERMISSIONS MULTILINGUE */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/70 border border-[var(--panel-border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--panel-border)]/80">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                    Rôles du Serveur & Permissions d'Administration
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Détection multilingue automatique (FR, EN, ES, DE) et attribution des privilèges avec présets 1-clic
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  Préset actif : {activeRolePreset === "PRESET_STRICT" ? "Strict & Sécurisé" : activeRolePreset === "PRESET_BALANCED" ? "Équilibré (Recommandé)" : "Communautaire"}
                </span>
              </div>

              {/* 1-Click Preset Selection */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[var(--text-primary)]/85 block">
                  Appliquer un Préset Rapide en 1-Clic :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "PRESET_STRICT",
                      name: "🛡️ Strict & Sécurisé",
                      desc: "Seuls Owner & Admins accèdent à la modération et aux réglages critiques",
                      badge: "Haute Sécurité",
                    },
                    {
                      id: "PRESET_BALANCED",
                      name: "⚖️ Équilibré (Recommandé)",
                      desc: "Admins = contrôle total. Modérateurs = sanctions et gestion des messages",
                      badge: "Standard",
                    },
                    {
                      id: "PRESET_COMMUNITY",
                      name: "🌐 Communautaire",
                      desc: "Modération collaborative, accès souple pour VIPs et animateurs",
                      badge: "Flexible",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyRolePreset(preset.id, preset.name)}
                      disabled={applyingRolePreset}
                      className={cn(
                        "p-3 rounded-xl text-left border transition-all space-y-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
                        activeRolePreset === preset.id
                          ? "bg-[var(--accent-primary)]/40 border-[var(--accent-primary)]/60 shadow-sm"
                          : "bg-[var(--surface-raised)]/60 border-[var(--panel-border)]/80 hover:bg-[var(--surface-raised)]/60 hover:border-[var(--text-primary)]/16"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{preset.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--text-primary)]/10 text-[var(--text-muted)] font-mono">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detected Roles List with AI recommendations */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-[var(--text-primary)]/85 block">
                  Rôles Détectés & Recommandations Intelligentes :
                </span>
                <div className="stagger-children divide-y divide-[var(--panel-border)]/60 border border-[var(--panel-border)]/80 rounded-xl overflow-hidden bg-[var(--surface-raised)]/40">
                  {detectedRolesList.map((role) => (
                    <div key={role.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[var(--surface-raised)]/70 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/30 shadow-sm" style={{ backgroundColor: role.color }} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{role.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--text-primary)]/10 text-[var(--text-primary)]/85 border border-[var(--text-primary)]/8">
                              {role.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                            {role.recommendation}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {role.members} membre{role.members > 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-semibold">
                          Synchronisé
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Note */}
              <div className="p-3 rounded-xl bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 flex items-start gap-2.5">
                <Lock className="w-3.5 h-3.5 text-[var(--accent-primary)] mt-0.5 shrink-0" />
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  <strong className="text-[var(--text-primary)]">Verrouillage de Sécurité :</strong> Les commandes de modération (<code className="text-[var(--accent-primary)]">/ban</code>, <code className="text-[var(--accent-primary)]">/kick</code>, <code className="text-[var(--accent-primary)]">/clear</code>, <code className="text-[var(--accent-primary)]">/timeout</code>, etc.) sont hermétiquement bloquées pour tous les membres sans les permissions requises. Le créateur du bot et le propriétaire du serveur disposent d'un bypass automatique.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="stagger-children space-y-6">
          <Card variant="default" padding="none" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[var(--accent-primary)]" />
                  Assistant IA & Télémétrie des Tokens
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Moteur de raisonnement contextuel avec RAG Knowledge Base et Safety Guardrail
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  Modèle : {aiTelemetry.activeModel}
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80">
                <span className="text-[10px] text-[var(--text-muted)] block">Requêtes IA (24h)</span>
                <span className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1 block">{aiTelemetry.dailyRequests}</span>
                <span className="text-[10px] text-[var(--accent-primary)] mt-0.5 block font-medium">
                  {aiTelemetry.dailyRequests > 0 ? `${aiTelemetry.successRate}% de succès` : "Aucune requête sur 24 h"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80">
                <span className="text-[10px] text-[var(--text-muted)] block">Tokens Consommés</span>
                <span className="text-lg font-bold font-mono text-[var(--accent-primary)] mt-1 block">{aiTelemetry.dailyTokens.toLocaleString()}</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block font-mono">sur 24 h glissantes</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80">
                <span className="text-[10px] text-[var(--text-muted)] block">Latence Moyenne</span>
                <span className="text-lg font-bold font-mono text-[var(--accent-primary)] mt-1 block">{aiTelemetry.dailyRequests > 0 ? `${aiTelemetry.avgLatencyMs}ms` : "—"}</span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Temps d'inférence</span>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80">
                <span className="text-[10px] text-[var(--text-muted)] block">Coût estimé (24 h)</span>
                <span className="text-lg font-bold font-mono text-[var(--accent-primary)] mt-1 block">
                  {aiTelemetry.dailyTokens > 0 ? `≈ ${aiTelemetry.estimatedCostUsd.toFixed(3)} $` : "—"}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Estimation, pas une facture</span>
              </div>
            </div>

            {/* Daily Token Gauge */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text-primary)]">Budget estimé (24 h glissantes)</span>
                <span className="font-mono text-[var(--accent-primary)] font-semibold">
                  {aiTelemetry.budgetUsedPercent}% de {aiTelemetry.dailyBudgetUsd.toFixed(2)} $
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[var(--surface-raised)]/60 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#5865F2] transition-all duration-500"
                  style={{ width: `${Math.min(100, aiTelemetry.budgetUsedPercent)}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted)] block pt-1">
                Le coût est estimé à partir des jetons (répartition 50/50 entre question et réponse, tarifs supposés) sur une fenêtre glissante de 24 h : rien n'est facturé par ETHONE.
              </span>
            </div>

            {/* Security & RAG Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                    Bouclier Anti-Jailbreak & Injection
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-semibold">
                    Actif
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Filtre par motifs qui analyse chaque requête pour bloquer les tentatives de fuite du prompt système et d'injection, et nettoie les réponses (secrets, mots interdits).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--panel-border)]/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[var(--accent-primary)]" />
                    Base de Connaissances RAG
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-semibold">
                    Par serveur
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Index contextuel propre à chaque serveur (page Assistant IA) que l'assistant consulte pour répondre. Il réduit les erreurs mais ne les supprime pas.
                </p>
              </div>
            </div>

            {/* SECTION: SALON IA DÉDIÉ & GÉNÉRATION D'IMAGES */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/70 border border-[var(--panel-border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--panel-border)]/80">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[var(--accent-primary)]" />
                    Salon Public Dédié pour l'IA
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Permet à tous les membres d'échanger naturellement avec le bot sans préfixe ni mention
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    {dedicatedAiChannelEnabled ? "🟢 Salon Actif" : "⚪ Désactivé"}
                  </span>
                  <button
                    role="switch"
                    aria-checked={dedicatedAiChannelEnabled}
                    onClick={() => {
                      const nextEnabled = !dedicatedAiChannelEnabled;
                      setDedicatedAiChannelEnabled(nextEnabled);
                      saveAiBehaviorSettings({ dedicatedChannelId: nextEnabled ? dedicatedAiChannel || null : null });
                      toast?.toggle?.(
                        "Salon IA Dédié",
                        nextEnabled,
                        nextEnabled
                          ? "Activé — Les membres peuvent converser et générer des images ici."
                          : "Désactivé."
                      );
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                      dedicatedAiChannelEnabled ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/10"
                    )}
                  >
                    <span
                      className={cn(
                        "block w-4 h-4 rounded-full bg-white transition-transform",
                        dedicatedAiChannelEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-primary)]/85 block mb-1.5">
                    Canal Textuel Dédié
                  </label>
                  <ChannelPicker
                    value={dedicatedAiChannel}
                    onChange={(id) => {
                      setDedicatedAiChannel(id);
                      if (dedicatedAiChannelEnabled) {
                        saveAiBehaviorSettings({ dedicatedChannelId: id || null });
                      }
                    }}
                    channels={aiTextChannels}
                    placeholder="Sélectionner ou saisir l'ID..."
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    Les membres peuvent converser librement et demander des images directement ici.
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)]/80">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">Génération d'images (/imagine)</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Modèle Flux haute fidélité avec protection ToS
                    </span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={allowImageGen}
                    onClick={() => {
                      const next = !allowImageGen;
                      setAllowImageGen(next);
                      saveAiBehaviorSettings({ allowImageGeneration: next });
                      toast?.toggle?.(
                        "Génération d'images (/imagine)",
                        next,
                        next ? "Activée avec protection ToS." : "Désactivée."
                      );
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer",
                      allowImageGen ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/10"
                    )}
                  >
                    <span
                      className={cn(
                        "block w-4 h-4 rounded-full bg-white transition-transform",
                        allowImageGen ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION: HUMEUR DU THON */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/70 border border-[var(--panel-border)] space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Humeur & Tempérament du Thon
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Choisissez la personnalité qui régit les réponses de l'IA sur le serveur
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: "SAGE", name: "🐟 Sage & Bienveillant", desc: "Calme, poli, ultra-pédagogue et posé", color: "from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/20 border-[var(--accent-primary)]/30" },
                  { id: "GAMER_SARCASTIQUE", name: "🦈 Gamer Sarcastique", desc: "Humour piquant, pop-culture et esprit vif", color: "from-[var(--accent-primary)]/20 to-pink-500/20 border-[var(--accent-primary)]/30" },
                  { id: "PROTECTEUR", name: "🛡️ Protecteur & Sérieux", desc: "Vigilant, axé sécurité et respect des règles", color: "from-[var(--accent-primary)]/20 to-teal-500/20 border-[var(--accent-primary)]/30" },
                  { id: "CYBERPUNK", name: "⚡ Cyberpunk Futuriste", desc: "High-tech, style néon 2077 et réponses punchy", color: "from-amber-500/20 to-rose-500/20 border-amber-500/30" },
                ].map((moodItem) => (
                  <button
                    key={moodItem.id}
                    onClick={() => {
                      setThonMood(moodItem.id as any);
                      saveAiBehaviorSettings({ thonMood: moodItem.id });
                      toast?.success?.(`Humeur du Thon définie sur : ${moodItem.name}`);
                    }}
                    className={cn(
                      "p-3 rounded-xl text-left border transition-all relative overflow-hidden",
                      thonMood === moodItem.id
                        ? `bg-gradient-to-br ${moodItem.color} border-[var(--accent-primary)] shadow-md`
                        : "bg-[var(--surface-raised)]/60 border-[var(--panel-border)]/80 hover:bg-[var(--surface-raised)]/60"
                    )}
                  >
                    <span className="text-xs font-bold text-[var(--text-primary)] block">{moodItem.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block leading-relaxed">{moodItem.desc}</span>
                    {thonMood === moodItem.id && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION: SÉCURITÉ DLP & MOTS BANNIS AUTOMOD */}
            <div className="p-5 rounded-xl bg-[var(--bg-card)]/70 border border-[var(--panel-border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--panel-border)]/80">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Mots Bannis Personnalisés & Bouclier DLP
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Filtrage en temps réel des prompts et des réponses par l'AutoMod et protection des secrets (Discord ToS)
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  DLP Anti-Leak Actif
                </span>
              </div>

              {/* Form to add word */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBannedWordInput}
                  onChange={(e) => setNewBannedWordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddBannedWord()}
                  placeholder="Ajouter un mot ou expression bannie..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleAddBannedWord}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all active:scale-[0.97]"
                >
                  Bannir le mot
                </button>
              </div>

              {/* List of active banned words */}
              <div className="stagger-children flex flex-wrap gap-1.5 pt-1">
                {bannedWordsList.map((word) => (
                  <span
                    key={word}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-[var(--text-primary)]/85 text-[11px] flex items-center gap-1.5 font-mono"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => handleRemoveBannedWord(word)}
                      className="text-[var(--text-muted)] hover:text-rose-400 transition-[color,background-color,border-color,transform] active:scale-[0.97]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {bannedWordsList.length === 0 && (
                  <span className="text-[11px] text-[var(--text-muted)] italic">Aucun mot banni configuré</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
