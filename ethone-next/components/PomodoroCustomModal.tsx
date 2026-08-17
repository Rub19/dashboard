"use client";

import React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, X, BellRing, PlayCircle, Volume2, Minus, Plus } from "lucide-react";
import { useFocus } from "@/components/FocusProvider";
import type { AmbientSound, PresetConfig } from "@/lib/focus-timer";

export type PomodoroCustomModalProps = {
  open: boolean;
  onClose: () => void;
};

const AMBIENT_OPTIONS: { id: AmbientSound; label: string }[] = [
  { id: "none", label: "Aucun" },
  { id: "rain", label: "Pluie" },
  { id: "white-noise", label: "Bruit blanc" },
  { id: "cafe", label: "Café" },
  { id: "forest", label: "Forêt" },
];

type ToggleRowProps = {
  icon: React.ElementType;
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

function ToggleRow({ icon: Icon, color, label, active, onClick }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-100/80 p-3 transition-colors hover:border-zinc-300/80 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.10]"
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      </div>
      <span
        className={`relative h-5 w-9 rounded-xl transition-colors ${
          active ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <motion.span
          layout
          className="absolute top-1 h-3 w-3 rounded-full bg-white"
          animate={{ left: active ? "calc(100% - 14px)" : "4px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}

export default function PomodoroCustomModal({ open, onClose }: PomodoroCustomModalProps) {
  const { setCustomConfig, start, customConfig } = useFocus();
  const [draft, setDraft] = useState<Required<PresetConfig>>({
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    cycles: 4,
    autoStartBreaks: true,
    autoStartFocus: true,
    soundAlert: true,
    ambientSound: "none",
  });

  useEffect(() => {
    if (!open) return;
    const config = customConfig();
    setDraft({
      work: config.work,
      shortBreak: config.shortBreak,
      longBreak: config.longBreak,
      cycles: config.cycles,
      autoStartBreaks: config.autoStartBreaks,
      autoStartFocus: config.autoStartFocus,
      soundAlert: config.soundAlert,
      ambientSound: config.ambientSound,
    });
  }, [open, customConfig]);

  function adjust(field: "work" | "shortBreak" | "longBreak", delta: number) {
    setDraft((prev) => ({
      ...prev,
      [field]: Math.max(1, Math.min(120, (prev[field] || 0) + delta)),
    }));
  }

  function handleSave() {
    setCustomConfig({
      work: draft.work,
      shortBreak: draft.shortBreak,
      longBreak: draft.longBreak,
      cycles: draft.cycles,
      autoStartBreaks: draft.autoStartBreaks,
      autoStartFocus: draft.autoStartFocus,
      soundAlert: draft.soundAlert,
      ambientSound: draft.ambientSound,
    });
    start("custom");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 select-none"
          >
            <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.12)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-zinc-950/90 dark:shadow-[0_16px_50px_rgba(0,0,0,0.7)]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Personnaliser le Pomodoro</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-200/80 hover:text-zinc-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Durations */}
              <div className="mb-5 grid grid-cols-3 gap-2.5">
                {([
                  { field: "work" as const, label: "Focus" },
                  { field: "shortBreak" as const, label: "Pause courte" },
                  { field: "longBreak" as const, label: "Pause longue" },
                ] as const).map(({ field, label }) => (
                  <div
                    key={field}
                    className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200/60 bg-zinc-100/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
                  >
                    <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => adjust(field, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200/60 text-zinc-600 transition hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[3ch] text-center font-mono text-base font-bold text-zinc-900 dark:text-white">
                        {draft[field]}m
                      </span>
                      <button
                        type="button"
                        onClick={() => adjust(field, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200/60 text-zinc-600 transition hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cycles */}
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
                  Cycles avant pause longue
                </p>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, cycles: n }))}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        draft.cycles === n
                          ? "bg-emerald-500 text-zinc-950"
                          : "border border-zinc-200/60 bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="mb-5 space-y-2">
                <ToggleRow
                  icon={BellRing}
                  color="text-emerald-700 dark:text-emerald-400"
                  label="Signal sonore à la fin du cycle"
                  active={draft.soundAlert}
                  onClick={() => setDraft((prev) => ({ ...prev, soundAlert: !prev.soundAlert }))}
                />
                <ToggleRow
                  icon={PlayCircle}
                  color="text-cyan-700 dark:text-cyan-400"
                  label="Enchaînement automatique des pauses"
                  active={draft.autoStartBreaks}
                  onClick={() => setDraft((prev) => ({ ...prev, autoStartBreaks: !prev.autoStartBreaks }))}
                />
              </div>

              {/* Ambient */}
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Son d&apos;ambiance</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {AMBIENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, ambientSound: opt.id }))}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all ${
                        draft.ambientSound === opt.id
                          ? "border-purple-600/20 bg-purple-500/15 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300"
                          : "border-zinc-200/60 bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full rounded-xl py-2.5 text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "var(--accent-color, #10b981)", color: "#09090b" }}
              >
                Enregistrer & Appliquer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
