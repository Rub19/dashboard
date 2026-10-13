"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";
import AudioVisualizer from "@/components/AudioVisualizer";
import { useDynamicIslandStore } from "@/lib/stores/dynamic-island";
import { useIslandQueueStore } from "@/lib/stores/dynamic-island-queue";
import { triggerIslandMail, triggerIslandNotification, triggerIslandClipboard } from "@/lib/island-notify";

type PreviewState =
  | "spotify"
  | "mail"
  | "notification"
  | "upload"
  | "sync"
  | "brain"
  | "pomodoro"
  | "clipboard"
  | "battery";

export default function DynamicIslandSettings() {
  const { settings, update } = useSettings();
  const i18n = useI18n();
  const { success } = useToast();
  const [previewState, setPreviewState] = useState<PreviewState>("spotify");
  const [isExpanded, setIsExpanded] = useState(false);
  const { setVisible } = useDynamicIslandStore();

  const handleTestReal = () => {
    update({ dynamicIslandVisible: true });
    setVisible(true);

    if (previewState === "mail") {
      triggerIslandMail({
        id: `test-mail-${Date.now()}`,
        sender: i18n("sIslandMailSender", "Équipe ETHONE"),
        subject: "Bienvenue sur ETHONE OS — Vos services sont synchronisés",
        unreadCount: 1,
        duration: 8000,
        status: "received",
      });
    } else if (previewState === "notification") {
      triggerIslandNotification({
        id: `test-notif-${Date.now()}`,
        title: "Alerte système",
        message: "Sauvegarde locale et synchronisation cloud effectuées",
        variant: "success",
        priority: "important",
        duration: 6000,
      });
    } else if (previewState === "clipboard") {
      triggerIslandClipboard("Token API copié dans le presse-papiers");
    } else if (previewState === "spotify") {
      useIslandQueueStore.getState().register({
        id: "spotify",
        type: "spotify",
        priority: 6,
        duration: 8000,
      });
    } else if (previewState === "upload") {
      useIslandQueueStore.getState().register({
        id: "upload",
        type: "upload",
        priority: 7,
        duration: 7000,
      });
    } else if (previewState === "sync") {
      useIslandQueueStore.getState().register({
        id: "sync",
        type: "sync",
        priority: 7,
        duration: 6000,
      });
    } else if (previewState === "brain") {
      useIslandQueueStore.getState().register({
        id: "brain",
        type: "brain",
        priority: 7,
        duration: 7000,
      });
    } else if (previewState === "pomodoro") {
      useIslandQueueStore.getState().register({
        id: "pomodoro",
        type: "pomodoro",
        priority: 7,
        duration: 8000,
      });
    } else if (previewState === "battery") {
      useIslandQueueStore.getState().register({
        id: "battery",
        type: "battery",
        priority: 7,
        duration: 6000,
      });
    }

    success(
      i18n("sIslandTestReal", "Tester sur la vraie Dynamic Island"),
      "Regardez en haut de l'écran : la capsule est active !",
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-gradient-to-b from-[var(--surface-raised)]/60 to-[var(--bg-main)] p-8 shadow-inner">
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_5px_var(--glow-color)]" />
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {i18n("sIslandSimulator", "Simulateur en direct")}
          </span>
        </div>

        <div className="my-6 flex items-center justify-center">
          <motion.div
            layout
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "relative cursor-pointer overflow-hidden border border-[var(--panel-border)]/[0.3] bg-[var(--bg-main)] text-[var(--text-primary)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.55),0_0_20px_-6px_var(--glow-color)] backdrop-blur-3xl transition-colors duration-200 select-none",
              isExpanded ? "rounded-3xl p-4 w-64 sm:w-80" : "h-10 rounded-full px-3.5 flex items-center gap-2.5 min-w-[140px]"
            )}
          >
            <AnimatePresence mode="wait">
              {!isExpanded ? (
                <motion.div
                  key={`compact-${previewState}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex w-full items-center gap-2.5"
                >
                  {previewState === "spotify" && (
                    <>
                      <div className="h-6 w-6 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)]">
                        <Icon name="music" className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs font-semibold">Midnight City · M83</span>
                      <AudioVisualizer isPlaying bars={4} barWidth={2} gap={1.5} className="h-3.5 opacity-90 ml-auto" />
                    </>
                  )}
                  {previewState === "mail" && (
                    <>
                      <div className="h-6 w-6 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] animate-pulse">
                        <Icon name="envelope-simple" className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs font-semibold">{i18n("sIslandMailSender", "Équipe ETHONE")}</span>
                      <span className="ml-auto rounded-full bg-[var(--accent-primary)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--accent-contrast)]">
                        1
                      </span>
                    </>
                  )}
                  {previewState === "notification" && (
                    <>
                      <div className="h-6 w-6 rounded-lg bg-[var(--success)]/20 flex items-center justify-center text-[var(--success)]">
                        <Icon name="bell" className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs font-semibold">Sauvegarde cloud réussie</span>
                    </>
                  )}
                  {previewState === "clipboard" && (
                    <>
                      <div className="h-6 w-6 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)]">
                        <Icon name="clipboard-check" className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs font-semibold">Copié dans le presse-papiers</span>
                    </>
                  )}
                  {previewState === "upload" && (
                    <>
                      <Icon name="upload-cloud" className="h-4 w-4 text-[var(--info)] animate-pulse" />
                      <span className="truncate text-xs font-semibold">design_v2.fig</span>
                      <span className="ml-auto text-[10px] font-mono text-[var(--info)]">64%</span>
                    </>
                  )}
                  {previewState === "sync" && (
                    <>
                      <Icon name="arrows-clockwise" className="h-4 w-4 text-[var(--info)] animate-spin" />
                      <span className="truncate text-xs font-semibold">{i18n("sIslandSync", "Synchronisation")}</span>
                    </>
                  )}
                  {previewState === "brain" && (
                    <>
                      <Icon name="brain" className="h-4 w-4 text-[var(--accent-secondary)] animate-pulse" />
                      <span className="truncate text-xs font-semibold">{i18n("sIslandGenerating", "Génération en cours...")}</span>
                    </>
                  )}
                  {previewState === "pomodoro" && (
                    <>
                      <Icon name="timer" className="h-4 w-4 text-[var(--accent-primary)]" />
                      <span className="truncate text-xs font-semibold tabular-nums">24:18</span>
                    </>
                  )}
                  {previewState === "battery" && (
                    <>
                      <Icon name="battery-charging" className="h-4 w-4 text-[var(--success)]" />
                      <span className="truncate text-xs font-semibold tabular-nums">100% En charge</span>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={`expanded-${previewState}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                      {previewState}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{i18n("sIslandTapToClose", "Cliquez pour refermer")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center text-[var(--accent-primary)]">
                      <Icon
                        name={
                          previewState === "spotify"
                            ? "music"
                            : previewState === "mail"
                            ? "envelope-simple"
                            : previewState === "notification"
                            ? "bell"
                            : previewState === "clipboard"
                            ? "clipboard-check"
                            : previewState === "upload"
                            ? "upload-cloud"
                            : previewState === "sync"
                            ? "arrows-clockwise"
                            : previewState === "brain"
                            ? "brain"
                            : previewState === "pomodoro"
                            ? "timer"
                            : "battery-charging"
                        }
                        className="h-6 w-6"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {previewState === "spotify"
                          ? "Midnight City"
                          : previewState === "mail"
                          ? i18n("sIslandNewMessage", "Nouveau message")
                          : previewState === "notification"
                          ? "Sauvegarde cloud réussie"
                          : previewState === "clipboard"
                          ? "Texte copié dans le presse-papiers"
                          : previewState === "battery"
                          ? "Batterie à 100%"
                          : i18n("sIslandTaskRunning", "Tâche en cours")}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {previewState === "spotify"
                          ? "M83 — Hurry Up, We're Dreaming"
                          : previewState === "mail"
                          ? "Bienvenue sur ETHONE OS — Vos services sont synchronisés"
                          : i18n("sIslandTapToOpen", "Cliquez pour ouvrir l'application")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
          {(
            [
              { id: "spotify", label: "🎵 Spotify" },
              { id: "mail", label: "📧 Mail" },
              { id: "notification", label: "🔔 Alerte" },
              { id: "upload", label: "📁 Upload" },
              { id: "sync", label: "🔄 Sync" },
              { id: "brain", label: "🧠 Brain" },
              { id: "pomodoro", label: "⏱️ Focus" },
              { id: "clipboard", label: "📋 Presse-papiers" },
              { id: "battery", label: "🔋 Batterie" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setPreviewState(s.id);
                setIsExpanded(false);
              }}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                previewState === s.id
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleTestReal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/80 px-4 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <Icon name="sparkles" className="h-4 w-4" />
          <span>{i18n("sIslandTestReal", "Tester sur la vraie Dynamic Island")}</span>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {i18n("sIslandBehavior", "Options de comportement")}
        </h4>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {i18n("sIslandEnable", "Activer la Dynamic Island")}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {i18n("sIslandEnableDesc", "Affiche la capsule intelligente en haut de l'écran")}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.dynamicIslandVisible}
              onChange={(e) => {
                update({ dynamicIslandVisible: e.target.checked });
                setVisible(e.target.checked);
              }}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {i18n("sIslandSpotify", "Afficher le lecteur Spotify")}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {i18n("sIslandSpotifyDesc", "Montre automatiquement le titre et le visualiseur en lecture")}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.islandShowSpotify}
              onChange={(e) => update({ islandShowSpotify: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {i18n("sIslandNotifs", "Notifications et alertes")}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {i18n("sIslandNotifsDesc", "Afficher les nouveaux messages et alertes système dans la capsule")}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.islandShowNotifications}
              onChange={(e) => update({ islandShowNotifications: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {i18n("sIslandUploads", "Progression des uploads et synchro")}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {i18n("sIslandUploadsDesc", "Indicateur de transfert de fichiers en temps réel")}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.islandShowUploads}
              onChange={(e) => update({ islandShowUploads: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
