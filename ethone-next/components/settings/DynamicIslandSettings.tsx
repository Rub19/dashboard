"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";
import AudioVisualizer from "@/components/AudioVisualizer";

type PreviewState = "spotify" | "mail" | "upload" | "sync" | "brain" | "pomodoro";

export default function DynamicIslandSettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const [previewState, setPreviewState] = useState<PreviewState>("spotify");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Live Interactive Simulator */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-gradient-to-b from-[var(--surface-raised)]/60 to-[var(--bg-main)] p-8 shadow-inner">
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Simulateur en direct
          </span>
        </div>

        {/* Dynamic Island Capsule in Preview */}
        <div className="my-6 flex items-center justify-center">
          <motion.div
            layout
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "relative cursor-pointer overflow-hidden border border-[var(--panel-border)]/[0.3] bg-[var(--bg-main)] text-[var(--text-primary)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.55),0_0_20px_-6px_var(--glow-color)] backdrop-blur-3xl transition-colors duration-200 select-none",
              isExpanded ? "rounded-3xl p-4 w-80" : "h-10 rounded-full px-3.5 flex items-center gap-2.5 min-w-[140px]"
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
                      <span className="truncate text-xs font-semibold">Équipe ETHONE</span>
                      <span className="ml-auto rounded-full bg-[var(--accent-primary)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--accent-contrast)]">
                        1
                      </span>
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
                      <span className="truncate text-xs font-semibold">Synchronisation</span>
                    </>
                  )}
                  {previewState === "brain" && (
                    <>
                      <Icon name="brain" className="h-4 w-4 text-[var(--accent-secondary)] animate-pulse" />
                      <span className="truncate text-xs font-semibold">Génération en cours...</span>
                    </>
                  )}
                  {previewState === "pomodoro" && (
                    <>
                      <Icon name="timer" className="h-4 w-4 text-[var(--accent-primary)]" />
                      <span className="truncate text-xs font-semibold tabular-nums">24:18</span>
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
                    <span className="text-[10px] text-[var(--text-muted)]">Cliquez pour refermer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center text-[var(--accent-primary)]">
                      <Icon name={previewState === "spotify" ? "music" : previewState === "mail" ? "envelope-simple" : "sparkles"} className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {previewState === "spotify" ? "Midnight City" : previewState === "mail" ? "Nouveau message" : "Tâche en cours"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {previewState === "spotify" ? "M83 — Hurry Up, We're Dreaming" : "Cliquez pour ouvrir l'application"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* State Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {(
            [
              { id: "spotify", label: "🎵 Spotify" },
              { id: "mail", label: "📧 Mail" },
              { id: "upload", label: "📁 Upload" },
              { id: "sync", label: "🔄 Sync" },
              { id: "brain", label: "🧠 Brain" },
              { id: "pomodoro", label: "⏱️ Focus" },
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
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                previewState === s.id
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Island Settings Controls */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Options de comportement
        </h4>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Activer la Dynamic Island
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Affiche la capsule intelligente en haut de l&apos;écran
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.dynamicIslandVisible}
              onChange={(e) => update({ dynamicIslandVisible: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Afficher le lecteur Spotify
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Montre automatiquement le titre et le visualiseur en lecture
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Notifications et alertes
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Afficher les nouveaux messages et alertes système dans la capsule
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Progression des uploads et synchro
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Indicateur de transfert de fichiers en temps réel
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
