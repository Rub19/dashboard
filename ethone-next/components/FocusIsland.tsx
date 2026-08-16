"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useFocus } from "./FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSound } from "@/lib/sound";
import { useSettings } from "@/components/SettingsProvider";
import { Icon } from "@/lib/icons";
import FocusPopover from "./FocusPopover";

export default function FocusIsland() {
  const i18n = useI18n();
  const { state } = useFocus();
  const { play } = useSound();
  const { settings } = useSettings();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [islandEl, setIslandEl] = useState<HTMLDivElement | null>(null);
  const prevPhase = useRef<typeof state.phase>(state.phase);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (state.paused) {
      t = setTimeout(() => setHidden(true), 30000);
    } else {
      setHidden(false);
    }
    return () => { if (t) clearTimeout(t); };
  }, [state.paused]);

  useEffect(() => {
    if (
      prevPhase.current === "focus" &&
      (state.phase === "shortBreak" || state.phase === "longBreak") &&
      settings.focusTimerSound
    ) {
      play("success");
    }
    prevPhase.current = state.phase;
  }, [state.phase, settings.focusTimerSound, play]);

  if (state.phase === "idle" && !hidden) return null;

  const phaseLabels: Record<string, string> = {
    focus: i18n("focus"),
    shortBreak: i18n("shortBreak"),
    longBreak: i18n("longBreak"),
    idle: i18n("ready"),
  };

  return (
    <>
      <motion.div
        ref={setIslandEl}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="v8-dynamic-island fixed left-1/2 top-4 z-[80] -translate-x-1/2 cursor-pointer overflow-hidden rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 shadow-2xl backdrop-blur-md transition-colors duration-150 hover:bg-[var(--panel-bg)]"
      >
        <div className="flex items-center gap-3">
          <Icon name="timer" className="h-4 w-4 text-[var(--accent)]" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tabular-nums">{state.format(state.remaining)}</span>
            <span className="text-[10px] text-[var(--muted)]">{phaseLabels[state.phase]}</span>
          </div>
        </div>
      </motion.div>

      <FocusPopover open={open} onClose={() => setOpen(false)} referenceRef={islandEl} />
    </>
  );
}
