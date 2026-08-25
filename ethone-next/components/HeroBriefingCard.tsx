"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useBrain } from "@/lib/hooks/useBrain";
import { useBrainActivityStore } from "@/lib/stores/brain-activity";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import BentoCard from "@/components/BentoCard";
import LiveClock from "@/components/LiveClock";
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

const BRAIN_BUTTON_STYLE = { backgroundColor: "var(--accent-color, var(--accent-primary))" };
const TYPING_DOTS = [0, 1, 2];
const TYPING_ANIMATE = { y: [0, -3, 0] };

const TypingDots = memo(function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {TYPING_DOTS.map((d) => (
        <motion.span
          key={d}
          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-color,var(--accent))]"
          animate={TYPING_ANIMATE}
          transition={{ repeat: Infinity, duration: 0.5, delay: d * 0.1, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
});

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

const HeroBriefingCard = memo(function HeroBriefingCard({
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const contextMessage = useMemo(() => {
    if (loading) return i18n("loadingBrief", "Chargement de votre journée…");
    if (todayEventsCount > 0) {
      return i18n("todayEventsMessage", "{count} événement(s) aujourd'hui.")
        .replace("{count}", String(todayEventsCount));
    }
    if (openTasksCount > 0) {
      return i18n("openTasksMessage", "{count} tâche(s) en cours.")
        .replace("{count}", String(openTasksCount));
    }
    if (nowPlaying?.title) {
      return i18n("nowPlayingMessage", "En écoute : {title}.")
        .replace("{title}", nowPlaying.title);
    }
    return greeting.tone;
  }, [loading, todayEventsCount, openTasksCount, nowPlaying, greeting.tone, i18n]);

  const counters = useMemo(
    () => [
      { icon: "circle-check", label: i18n("openTasks"), value: openTasksCount, text: "text-[var(--accent-primary)]", bg: "bg-[var(--accent-primary)]/10" },
      { icon: "calendar", label: i18n("todayEvents"), value: todayEventsCount, text: "text-[var(--info)]", bg: "bg-[var(--info)]/10" },
      { icon: "notebook-pen", label: i18n("notes"), value: notesCount, text: "text-[var(--accent-secondary)]", bg: "bg-[var(--accent-secondary)]/10" },
      { icon: "hard-drive", label: i18n("storageUsed"), value: storageLabel, text: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10" },
    ],
    [i18n, openTasksCount, todayEventsCount, notesCount, storageLabel]
  );

  const quickActions = useMemo(
    () => [
      { id: "task", icon: "circle-check", label: i18n("newTask", "Tâche"), href: "/tasks" },
      { id: "note", icon: "notebook-pen", label: i18n("newNote", "Note"), href: "/notes" },
      { id: "event", icon: "calendar", label: i18n("newEvent", "Événement"), href: "/calendar" },
      { id: "focus", icon: "timer", label: i18n("focus", "Focus"), href: "/focus" },
      { id: "drop", icon: "upload", label: i18n("upload", "Upload"), href: "/drop" },
    ],
    [i18n]
  );

  const focusBrain = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = prompt.trim();
      if (!text || brain.loading) return;
      brain.send(text);
      setPrompt("");
    },
    [prompt, brain]
  );

  return (
    <BentoCard noHeader scrollable={scrollable} className={cn("h-full", className)}>
      <div className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-[var(--text-muted)]">{date}</p>
            <span className="rounded-md bg-[var(--text-primary)]/[0.04] px-1.5 py-0.5">
              <LiveClock language={settings.language} />
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">{greeting.label}</h2>
          <p className="text-sm text-[var(--text-muted)]">{contextMessage}</p>
          {nowPlaying?.title && (
            <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Icon pack="phosphor" name="disc" className="h-3.5 w-3.5 animate-spin-slow" />
              <span className="truncate">{nowPlaying.title}</span>
              <span>·</span>
              <span className="truncate">{nowPlaying.artist}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Poser une question ou un objectif..."
            icon="brain"
            className="min-w-0 flex-1 rounded-full"
            inputClassName="placeholder:text-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || brain.loading}
            style={BRAIN_BUTTON_STYLE}
            className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-[var(--accent-contrast)] shadow-[0_0_12px_var(--glow-color)] transition-all hover:opacity-90 hover:shadow-[0_0_20px_var(--glow-color)] disabled:opacity-40 sm:h-9 sm:w-auto"
          >
            <Icon pack="phosphor" name="sparkles" className="h-3.5 w-3.5" />
            Brain
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => {
            const base = "inline-flex items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--accent-primary)]";
            return (
              <Link key={a.id} href={a.href} className={base} aria-label={a.label}>
                <Icon pack="phosphor" name={a.icon} className="h-3 w-3" />
                {a.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={focusBrain}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--accent-primary)]"
            aria-label={i18n("brain", "Brain")}
          >
            <Icon pack="phosphor" name="brain" className="h-3 w-3" />
            {i18n("brain", "Brain")}
          </button>
        </div>

        {(brain.loading || latestAssistant || brain.error) && (
          <div className="rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-2.5 text-xs text-[var(--text-primary)]">
            {brain.loading && (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
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
                    <Icon pack="phosphor" name={c.icon} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold tabular-nums leading-none text-[var(--text-primary)]">{c.value}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{c.label}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </BentoCard>
  );
});

export default HeroBriefingCard;
