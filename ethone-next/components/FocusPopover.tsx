"use client";

import { useState, useRef, useEffect } from "react";
import { useFocus } from "./FocusProvider";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";

const PRESETS = [
  { id: "pomodoro", label: "Pomodoro", icon: "timer" },
  { id: "deep", label: "Deep Work", icon: "brain" },
  { id: "quick", label: "Sprint", icon: "zap" },
];

export default function FocusPopover({ children }: { children: React.ReactNode }) {
  const i18n = useI18n();
  const { state, start, pause, resume, stop, skip } = useFocus();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const phaseLabel = state.paused
    ? i18n("paused")
    : state.phase === "idle"
    ? i18n("ready")
    : state.phase === "focus"
    ? i18n("focus")
    : i18n("break");

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <div
          ref={popoverRef}
          role="menu"
          aria-label={i18n("focusTimer")}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-xl backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm">{i18n("focusTimer")}</strong>
            <span className="text-xs text-[var(--accent)]">{phaseLabel}</span>
          </div>
          <div className="mb-3 flex items-center justify-center rounded-xl bg-[var(--surface)] p-3">
            <span className="text-2xl font-bold tabular-nums">{state.format(state.remaining)}</span>
          </div>
          <div className="mb-2 text-xs text-[var(--muted)]">{i18n("start")}</div>
          <div className="mb-3 grid grid-cols-3 gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => { start(preset.id as typeof PRESETS[number]["id"]); setOpen(false); }}
                className="flex flex-col items-center gap-1 rounded-lg bg-[var(--surface)] p-2 text-[10px] hover:bg-[var(--surface-raised)]"
              >
                <Icon name={preset.icon} className="h-4 w-4 text-[var(--accent)]" />
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => { if (state.paused) resume(); else pause(); setOpen(false); }}
              className="rounded-lg bg-[var(--surface)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]"
            >
              {state.paused ? i18n("resume") : i18n("pause")}
            </button>
            <button
              type="button"
              onClick={() => { stop(); setOpen(false); }}
              className="rounded-lg bg-[var(--surface)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]"
            >
              {i18n("stop")}
            </button>
            <button
              type="button"
              onClick={() => { skip(); setOpen(false); }}
              className="rounded-lg bg-[var(--surface)] px-2 py-1.5 text-xs hover:bg-[var(--surface-raised)]"
            >
              {i18n("skip")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
