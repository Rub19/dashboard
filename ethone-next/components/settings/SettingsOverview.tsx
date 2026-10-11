"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { Icon } from "@/lib/icons";
import ClientImage from "@/components/ClientImage";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSound } from "@/lib/sound";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useLatestVersion } from "@/lib/hooks/useLatestVersion";
import { useSyncStore } from "@/lib/stores/sync";
import { useSettingsForm } from "./SettingsFormContext";
import { SETTINGS_GROUPS, categoryById } from "./SettingsRail";

/** Demande à la page Réglages d'afficher une catégorie (écouté par SettingsLayout). */
export const openSettingsCategory = (id: string) => window.dispatchEvent(new CustomEvent("settings:navigate", { detail: id }));

type SettingsOverviewProps = { onNavigate?: (id: string) => void };

/** Accueil des réglages : profil, interrupteurs rapides, état du système et toutes les catégories. */
export default function SettingsOverview({ onNavigate }: SettingsOverviewProps) {
  const router = useRouter();
  const i18n = useI18n();
  const reduced = useReducedMotion();
  const { settings } = useSettings();
  const form = useSettingsForm();
  const { ambientSound } = useSound();
  const { displayName, avatarUrl, email, initials } = useUserIdentity();
  const latestVersion = useLatestVersion();
  const syncStatus = useSyncStore((s) => s.status);
  const userStatus = USER_STATUS_CONFIG[settings.status] || USER_STATUS_CONFIG.online;
  const go = (id: string) => (onNavigate ? onNavigate(id) : openSettingsCategory(id));

  const toggles: Array<{ key: "soundEffects" | "notifications" | "haptics" | "reducedMotion" | "dockVisible" | "dynamicIslandVisible"; label: string; icon: string }> = [
    { key: "soundEffects", label: "Sons", icon: "volume-2" },
    { key: "notifications", label: "Notifications", icon: "bell" },
    { key: "haptics", label: "Vibrations", icon: "smartphone" },
    { key: "reducedMotion", label: "Animations réduites", icon: "zap" },
    { key: "dockVisible", label: "Dock", icon: "credit-card" },
    { key: "dynamicIslandVisible", label: "Dynamic Island", icon: "disc" },
  ];

  const syncLabel = { idle: "Synchronisé", syncing: "Synchronisation…", offline: "Hors ligne", error: "Erreur de synchro" }[syncStatus] ?? "Synchronisé";
  const tiles = [
    { id: "themes", label: "Thème", value: settings.theme.replace(/-/g, " "), icon: "palette" },
    { id: "sync", label: "Cloud", value: syncLabel, icon: "arrows-clockwise" },
    { id: "soundscapes", label: "Ambiance", value: ambientSound !== "none" ? ambientSound : "Aucune", icon: "cloud-rain" },
    { id: "language", label: "Langue", value: settings.language.toUpperCase(), icon: "globe" },
  ];

  const rise = (i: number) => ({
    initial: reduced ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, bounce: 0, duration: 0.45, delay: reduced ? 0 : 0.04 * i },
  });

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Profil */}
      <motion.div {...rise(0)} className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-gradient-to-br from-[var(--accent-primary)]/[0.12] via-[var(--panel-bg)] to-[var(--panel-bg)] p-5">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[var(--accent-primary)]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-primary)]/15 text-lg font-bold text-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30">
              {avatarUrl ? <ClientImage src={avatarUrl} alt="" width={64} height={64} className="h-full w-full object-cover" fallback={<span>{initials}</span>} /> : <span>{initials}</span>}
            </div>
            <span className={cn("absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[var(--bg-main)]", userStatus.dot)} title={userStatus.presence} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold tracking-tight text-[var(--text-primary)]">{displayName}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {email ? `${email} · ` : ""}
              <span className={userStatus.text}>{i18n(userStatus.labelKey, settings.status)}</span> · ETHONE {latestVersion}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => go("profile")} className="rounded-xl border border-[var(--panel-border)] bg-[var(--background)]/40 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50">
              Gérer le profil
            </button>
            <button type="button" onClick={() => router.push("/discord?onboarding=true")} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--background)]/40 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[#5865F2]/60">
              <Sparkles className="h-3.5 w-3.5 text-[#5865F2]" />
              Bot Discord
            </button>
          </div>
        </div>
      </motion.div>

      {/* Interrupteurs rapides */}
      <motion.div {...rise(1)}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Accès rapide</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {toggles.map((t) => {
            const on = Boolean(settings[t.key]);
            return (
              <button
                key={t.key}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => form.updateInstant(t.key, !on)}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.98]",
                  on ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10" : "border-[var(--panel-border)] bg-[var(--panel-bg)]/60 hover:bg-[var(--surface-hover)]"
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors", on ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "bg-[var(--surface-raised)] text-[var(--text-muted)]")}>
                  <Icon name={t.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)]">{t.label}</span>
                  <span className={cn("block text-[11px]", on ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]")}>{on ? "Activé" : "Désactivé"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* État */}
      <motion.div {...rise(2)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <button key={t.id} type="button" onClick={() => go(t.id)} className="group rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-3 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/40">
            <span className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              {t.label}
              <Icon name={t.icon} className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            </span>
            <span className="mt-1.5 block truncate text-sm font-semibold capitalize text-[var(--text-primary)]">{t.value}</span>
          </button>
        ))}
      </motion.div>

      {/* Toutes les catégories */}
      <motion.div {...rise(3)} className="space-y-4">
        {SETTINGS_GROUPS.filter((g) => g.id !== "you").map((g) => (
          <div key={g.id}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{g.label}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {g.ids.map((id) => {
                const c = categoryById(id);
                return (
                  <button key={id} type="button" onClick={() => go(id)} className="group flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 px-3 py-2.5 text-left transition-colors duration-200 hover:border-[var(--accent-primary)]/35 hover:bg-[var(--accent-primary)]/[0.05]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors group-hover:bg-[var(--accent-primary)]/15 group-hover:text-[var(--accent-primary)]">
                      <Icon name={c.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--text-primary)]">{c.label}</span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">{c.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
