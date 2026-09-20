"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import ClientImage from "@/components/ClientImage";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSound } from "@/lib/sound";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CHANGELOG } from "@/data/changelog";
import { useSyncStore } from "@/lib/stores/sync";

interface SettingsOverviewProps {
  onNavigate: (categoryId: string) => void;
}

export default function SettingsOverview({ onNavigate }: SettingsOverviewProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { settings } = useSettings();
  const { ambientSound } = useSound();
  const { displayName, avatarUrl, email, initials } = useUserIdentity();

  const userStatus = USER_STATUS_CONFIG[settings.status] || USER_STATUS_CONFIG.online;
  const syncStatus = useSyncStore((s) => s.status);
  const SYNC_STATUS_CONFIG = {
    idle: { label: i18n("sOvConnected", "Connecté"), detail: i18n("sOvSupabaseActive", "Supabase actif"), color: "text-[var(--success)]" },
    syncing: { label: i18n("sOvSyncing", "Synchronisation..."), detail: i18n("sOvSupabaseActive", "Supabase actif"), color: "text-[var(--info)]" },
    offline: { label: i18n("sOvOffline", "Hors ligne"), detail: i18n("sOvWaiting", "En attente de connexion"), color: "text-[var(--warning)]" },
    error: { label: i18n("sOvSyncError", "Erreur de sync"), detail: i18n("sOvSeeCloudSync", "Voir Synchronisation Cloud"), color: "text-[var(--danger)]" },
  }[syncStatus];

  const quickActions = [
    {
      id: "discord-onboarding",
      label: i18n("sOvQaDiscord", "Onboarding Discord Bot"),
      desc: i18n("sOvQaDiscordDesc", "Revoir l'introduction interactive 2.0"),
      icon: "sparkles",
      color: "#5865F2",
      onClick: () => router.push("/discord?onboarding=true"),
    },
    {
      id: "appearance",
      label: i18n("sOvQaAppearance", "Personnaliser l'apparence"),
      desc: i18n("sOvQaAppearanceDesc", "Thèmes, couleurs d'accent & rayon"),
      icon: "palette",
      color: "var(--accent-primary)",
    },
    {
      id: "soundscapes",
      label: i18n("sOvQaSound", "Soundscapes & Mixeur"),
      desc: i18n("sOvQaSoundDesc", "14 ambiances sonores & presets"),
      icon: "cloud-rain",
      color: "var(--info)",
    },
    {
      id: "dynamic-island",
      label: i18n("sOvQaIsland", "Dynamic Island"),
      desc: i18n("sOvQaIslandDesc", "Comportement & prévisualisation"),
      icon: "disc",
      color: "var(--accent-secondary)",
    },
    {
      id: "dock",
      label: i18n("sOvQaDock", "Personnaliser le Dock"),
      desc: i18n("sOvQaDockDesc", "Échelle, position & transparence"),
      icon: "credit-card",
      color: "var(--accent-primary)",
    },
    {
      id: "connections",
      label: i18n("sOvQaConnections", "Gérer les connexions"),
      desc: i18n("sOvQaConnectionsDesc", "Spotify, Drive, Discord & APIs"),
      icon: "plug",
      color: "var(--warning)",
    },
    {
      id: "privacy",
      label: i18n("sOvQaPrivacy", "Confidentialité & Sécurité"),
      desc: i18n("sOvQaPrivacyDesc", "Sessions, passkeys & télémétrie"),
      icon: "shield",
      color: "var(--success)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Control Center Banner */}
      <div className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-gradient-to-br from-[var(--surface-raised)] to-[var(--panel-bg)] p-5 shadow-lg">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Same identity source as the TopBar profile menu (useUserIdentity +
                ClientImage), so the real profile picture / name / email show here
                instead of a generic user glyph. */}
            <div className="relative h-14 w-14 shrink-0">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30 text-lg font-bold">
                {avatarUrl ? (
                  <ClientImage
                    src={avatarUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    fallback={<span>{initials}</span>}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[var(--bg-main)]",
                  userStatus.dot
                )}
                title={userStatus.presence}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-[var(--text-primary)]">
                  {displayName}
                </h2>
                <span className="rounded-full bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                  ETHONE Control Center · {CHANGELOG[0]?.version || "v1.24.0"}
                </span>
              </div>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {email ? <>{email} · </> : null}
                {i18n("sOvStatus", "Statut")} : <span className={userStatus.text}>{i18n(userStatus.labelKey, settings.status)}</span> · {i18n("sOvMode", "Mode")} {settings.sessionMode}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate("profile")}
              className="flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-colors"
            >
              <Icon name="user" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              {i18n("sOvManageProfile", "Gérer le profil")}
            </button>
            <button
              type="button"
              onClick={() => onNavigate("performance")}
              className="flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-colors"
            >
              <Icon name="cpu" className="h-3.5 w-3.5 text-[var(--info)]" />
              {i18n("sOvDiagnostic", "Diagnostic")}
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-primary)]/10 blur-3xl" />
      </div>

      {/* Live System Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Theme Indicator */}
        <div
          onClick={() => onNavigate("themes")}
          className="group flex cursor-pointer flex-col justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sOvTheme", "Thème")}</span>
            <Icon name="palette" className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <div className="mt-2">
            <p className="text-xs font-semibold capitalize text-[var(--text-primary)]">
              {settings.theme}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">{i18n("sOvAccent", "Accent")} {settings.accentColor}</span>
          </div>
        </div>

        {/* Sync Indicator */}
        <div
          onClick={() => onNavigate("sync")}
          className="group flex cursor-pointer flex-col justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sOvSyncCloud", "Sync Cloud")}</span>
            <Icon
              name="arrows-clockwise"
              className={cn("h-4 w-4", SYNC_STATUS_CONFIG.color, syncStatus === "syncing" ? "animate-spin" : "")}
            />
          </div>
          <div className="mt-2">
            <p className={cn("text-xs font-semibold", syncStatus === "syncing" ? "animate-pulse" : "", SYNC_STATUS_CONFIG.color)}>
              {SYNC_STATUS_CONFIG.label}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">{SYNC_STATUS_CONFIG.detail}</span>
          </div>
        </div>

        {/* Audio / Soundscape Indicator */}
        <div
          onClick={() => onNavigate("soundscapes")}
          className="group flex cursor-pointer flex-col justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sOvAmbience", "Ambiance")}</span>
            <Icon name="cloud-rain" className="h-4 w-4 text-[var(--info)]" />
          </div>
          <div className="mt-2">
            <p className="text-xs font-semibold capitalize text-[var(--text-primary)]">
              {ambientSound !== "none" ? ambientSound : i18n("sOvSoundOff", "Désactivé")}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">{i18n("sOvSoundscapes", "14 soundscapes")}</span>
          </div>
        </div>

        {/* Island Indicator */}
        <div
          onClick={() => onNavigate("dynamic-island")}
          className="group flex cursor-pointer flex-col justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sOvIsland", "Island")}</span>
            <Icon name="disc" className="h-4 w-4 text-[var(--accent-secondary)]" />
          </div>
          <div className="mt-2">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {settings.dynamicIslandVisible ? i18n("sOvIslandActive", "Active") : i18n("sOvIslandHidden", "Masquée")}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">{i18n("sOvPreviewLive", "Preview live")}</span>
          </div>
        </div>

        {/* Dock Indicator */}
        <div
          onClick={() => onNavigate("dock")}
          className="group flex cursor-pointer flex-col justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sOvDock", "Dock")}</span>
            <Icon name="credit-card" className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <div className="mt-2">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {settings.dockVisible ? i18n("sOvDockVisible", "Visible") : i18n("sOvDockHidden", "Masqué")}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">{settings.dockScale}</span>
          </div>
        </div>

        {/* Language & Locale */}
        <div
          onClick={() => onNavigate("language")}
          className="group flex cursor-pointer flex-col justify-between rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 transition-all hover:border-[var(--accent-primary)]/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">{i18n("sOvLanguage", "Langue")}</span>
            <Icon name="globe" className="h-4 w-4 text-[var(--warning)]" />
          </div>
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase text-[var(--text-primary)]">
              {settings.language}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">
              {i18n(`lang${settings.language.charAt(0).toUpperCase()}${settings.language.slice(1)}`, settings.language)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {i18n("sOvQuickTitle", "Raccourcis de configuration rapide")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => ("onClick" in action && action.onClick ? action.onClick() : onNavigate(action.id))}
              className="group flex items-start gap-3.5 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-left transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)]/30 hover:shadow-md"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] transition-transform group-hover:scale-105"
                style={{ color: action.color }}
              >
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {action.label}
                </h4>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{action.desc}</p>
              </div>
              <Icon
                name="caret-right"
                className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
