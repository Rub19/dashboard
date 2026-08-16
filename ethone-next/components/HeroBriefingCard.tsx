"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useBrain } from "@/lib/hooks/useBrain";
import { Icon } from "@/lib/icons";
import BentoCard from "@/components/BentoCard";
import type { CloudDashboard, NowPlaying } from "@/lib/hooks/useDashboard";

function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
}: HeroBriefingCardProps) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const brain = useBrain();
  const [prompt, setPrompt] = useState("");

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

  const counters = [
    { icon: "circle-check", label: i18n("openTasks"), value: openTasksCount, color: { text: "text-emerald-400", bg: "bg-emerald-500/10" } },
    { icon: "calendar", label: i18n("todayEvents"), value: todayEventsCount, color: { text: "text-sky-400", bg: "bg-sky-500/10" } },
    { icon: "notebook-pen", label: i18n("notes"), value: notesCount, color: { text: "text-violet-400", bg: "bg-violet-500/10" } },
    { icon: "hard-drive", label: i18n("storageUsed"), value: loading ? "-" : formatBytes(dashboard?.totalSize), color: { text: "text-amber-400", bg: "bg-amber-500/10" } },
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || brain.loading) return;
    brain.send(text);
    setPrompt("");
  }

  return (
    <BentoCard noHeader className={`${className}`}>
      <div className="flex h-full min-h-0 flex-col justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">{date}</p>
          <h2 className="text-2xl font-bold tracking-tight text-white">{greeting.label}</h2>
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

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={i18n("brainAvailableDesc") || "Demandez à Brain…"}
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 pl-9 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/20"
            />
            <Icon name="brain" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || brain.loading}
            style={{ backgroundColor: "var(--accent-color, var(--accent))" }}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Brain
          </button>
        </form>

        {(brain.loading || latestAssistant || brain.error) && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs text-zinc-200">
            {brain.loading && (
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <TypingDots />
                <span>{i18n("loading")}</span>
              </div>
            )}
            {!brain.loading && brain.error && (
              <p className="text-red-400">{brain.error.message}</p>
            )}
            {!brain.loading && latestAssistant && !brain.error && (
              <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed">{latestAssistant}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {counters.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.color.bg} ${c.color.text}`}
              >
                <Icon name={c.icon} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold tabular-nums leading-none">{c.value}</p>
                <p className="text-[9px] text-[var(--muted)]">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
