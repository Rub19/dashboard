"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type HistoryEntry = {
  id: string;
  duration: number;
  preset: string;
  goal?: string;
  completedAt: string;
};

type Filter = "today" | "week" | "month" | "all";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isWithin(iso: string, filter: Filter) {
  const d = new Date(iso);
  const now = new Date();
  if (filter === "all") return true;
  if (filter === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }
  if (filter === "month") {
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return d >= monthAgo;
  }
  return true;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "7 jours" },
  { id: "month", label: "30 jours" },
  { id: "all", label: "Tout" },
];

export default function FocusHistoryView() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("week");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ethone-focus-history") || "[]";
      setHistory(JSON.parse(raw));
    } catch {
      setHistory([]);
    }
  }, []);

  const filtered = history.filter((h) => isWithin(h.completedAt, filter));

  const totalFocused = filtered.reduce((acc, h) => acc + h.duration, 0);
  const todaySessions = history.filter((h) => isWithin(h.completedAt, "today")).length;

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
            <Icon name="clock" className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Historique Focus
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all",
                filter === f.id
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-[var(--surface-raised)]/60 p-3 text-center">
            <div className="text-base font-bold text-[var(--accent-primary)]">{filtered.length}</div>
            <div className="text-[10px] text-[var(--text-muted)]">Sessions</div>
          </div>
          <div className="rounded-xl bg-[var(--surface-raised)]/60 p-3 text-center">
            <div className="text-base font-bold text-[var(--accent-primary)]">{formatDuration(totalFocused)}</div>
            <div className="text-[10px] text-[var(--text-muted)]">Focalisé</div>
          </div>
          <div className="rounded-xl bg-[var(--surface-raised)]/60 p-3 text-center">
            <div className="text-base font-bold text-[var(--accent-primary)]">{todaySessions}</div>
            <div className="text-[10px] text-[var(--text-muted)]">Aujourd'hui</div>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
          <Icon name="clock" className="h-8 w-8 opacity-30" />
          <p className="text-sm">Aucune session sur cette période.</p>
          <p className="text-xs opacity-70">Démarrez une session pour créer votre historique.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto os-scroll">
          {filtered.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)]/50 bg-[var(--surface-raised)]/40 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Icon name="timer" className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {formatDuration(entry.duration)}
                  </span>
                  <span className="rounded-full bg-[var(--accent-primary)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-primary)]">
                    {entry.preset}
                  </span>
                </div>
                {entry.goal && (
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)] italic">
                    {entry.goal}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                {formatDate(entry.completedAt)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
