"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useBrain } from "@/lib/hooks/useBrain";
import { useBrainActivityStore } from "@/lib/stores/brain-activity";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import BentoCard from "@/components/BentoCard";
import { cn } from "@/lib/utils";
import type { CloudDashboard, NowPlaying } from "@/lib/hooks/useDashboard";

function formatStorage(bytes = 0) {
  const usedGB = bytes / (1024 * 1024 * 1024);
  if (usedGB >= 1) {
    return `${usedGB.toFixed(1)} Go / 1 To`;
  }
  const usedMB = bytes / (1024 * 1024);
  return `${usedMB.toFixed(1)} Mo / 1 Go`;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((d) => (
        <motion.span
          key={d}
          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-color,var(--accent))]"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.5, delay: d * 0.1, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

export type HeroBriefingCardProps = {
  greeting: { label: string; tone: string };
  dashboard: CloudDashboard | null;
  nowPlaying?: NowPlaying | null;
  loading: boolean;
  openTasksCount: number;
  todayEventsCount: number;
  notesCount: number;
  className?: string;
  scrollable?: boolean;
};

export default function HeroBriefingCard({
  greeting,
  dashboard,
  nowPlaying,
  loading,
  openTasksCount,
  todayEventsCount,
  notesCount,
  className = "",
  scrollable = true,
}: HeroBriefingCardProps) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const brain = useBrain();
  const setIsThinking = useBrainActivityStore((s) => s.setIsThinking);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    setIsThinking(brain.loading);
  }, [brain.loading, setIsThinking]);

  const date = useMemo(
    () =>
      new Date().toLocaleDateString(settings.language || "fr", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [settings.language]
  );

  const latestAssistant = useMemo(() => {
    for (let i = brain.messages.length - 1; i >= 0; i--) {
      if (brain.messages[i]?.role === "assistant") return brain.messages[i]?.content || "";
    }
    return "";
  }, [brain.messages]);

  const storageLabel = loading ? "-" : formatStorage(dashboard?.totalSize);

  const counters = [
    { icon: "circle-check", label: i18n("openTasks"), value: openTasksCount, text: "text-[var(--accent-primary)]", bg: "bg-[var(--accent-primary)]/10" },
    { icon: "calendar", label: i18n("todayEvents"), value: todayEventsCount, text: "text-[var(--info)]", bg: "bg-[var(--info)]/10" },
    { icon: "notebook-pen", label: i18n("notes"), value: notesCount, text: "text-[var(--accent-secondary)]", bg: "bg-[var(--accent-secondary)]/10" },
    { icon: "hard-drive", label: i18n("storageUsed"), value: storageLabel, text: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10" },
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || brain.loading) return;
    brain.send(text);
    setPrompt("");
  }

  return (
    <BentoCard noHeader scrollable={scrollable} className={cn("h-full", className)}>
      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{date}</p>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">{greeting.label}</h2>
          <p className="text-sm text-[var(--muted)]">{greeting.tone}</p>
          {nowPlaying?.title && (
            <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
              <Icon name="disc" className="h-3.5 w-3.5 animate-spin-slow" />
              <span className="truncate">{nowPlaying.title}</span>
              <span>·</span>
              <span className="truncate">{nowPlaying.artist}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Poser une question ou un objectif..."
            icon="brain"
            className="min-w-0 flex-1 rounded-full"
            inputClassName="placeholder:text-[var(--muted)]"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || brain.loading}
            style={{ backgroundColor: "var(--accent-color, var(--accent-primary))" }}
            className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-[var(--accent-contrast)] shadow-[0_0_12px_var(--glow-color)] transition-all hover:opacity-90 hover:shadow-[0_0_20px_var(--glow-color)] disabled:opacity-40 sm:h-9 sm:w-auto"
          >
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Brain
          </button>
        </form>

        {(brain.loading || latestAssistant || brain.error) && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs text-[var(--text-primary)]">
            {brain.loading && (
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <TypingDots />
                <span>{i18n("loading")}</span>
              </div>
            )}
            {!brain.loading && brain.error && (
              <p className="text-[var(--danger)]">{brain.error.message}</p>
            )}
            {!brain.loading && latestAssistant && !brain.error && (
              <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed">{latestAssistant}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="v8-inset flex animate-pulse items-center gap-2 p-2"
                >
                  <div className="h-7 w-7 rounded-lg bg-[var(--text-primary)]/10" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-4 w-8 rounded bg-[var(--text-primary)]/10" />
                    <div className="h-2 w-12 rounded bg-[var(--text-primary)]/10" />
                  </div>
                </div>
              ))
            : counters.map((c) => (
                <div
                  key={c.label}
                  className="v8-inset flex items-center gap-2 p-2"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.text}`}
                  >
                    <Icon name={c.icon} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold tabular-nums leading-none text-[var(--text-primary)]">{c.value}</p>
                    <p className="text-[9px] text-[var(--muted)]">{c.label}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </BentoCard>
  );
}
