"use client";

import { useEffect, useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import Tooltip from "@/components/Tooltip";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { InteractionsHeatmap, type HeatmapRange } from "@/lib/interactions-heatmap";

const WEEKDAY_KEYS = ["dayShortMon", "dayShortTue", "dayShortWed", "dayShortThu", "dayShortFri", "dayShortSat", "dayShortSun"];

const INTERACTION_KINDS = [
  "like",
  "comment",
  "share",
  "noteCreate",
  "noteSave",
  "taskCreate",
  "taskComplete",
  "taskDelete",
  "eventCreate",
  "fileCreate",
  "spaceSwitch",
  "sync",
  "uiCustomize",
];

function intensityBg(level: number) {
  const map = [
    "bg-[var(--heatmap-0)]",
    "bg-[var(--heatmap-1)]",
    "bg-[var(--heatmap-2)]",
    "bg-[var(--heatmap-3)]",
    "bg-[var(--heatmap-4)]",
  ];
  return map[level] || map[0];
}

function getKind(record: { data?: Record<string, unknown> }) {
  const data = record.data || {};
  if (typeof data.action === "string") {
    const map: Record<string, string> = {
      note_create: "noteCreate",
      note_save: "noteSave",
      task_create: "taskCreate",
      task_complete: "taskComplete",
      task_delete: "taskDelete",
      event_create: "eventCreate",
      file_create: "fileCreate",
      space_switch: "spaceSwitch",
      sync: "sync",
      ui_customize: "uiCustomize",
    };
    if (map[data.action]) return map[data.action];
  }
  if (typeof data.kind === "string" && INTERACTION_KINDS.includes(data.kind)) return data.kind;
  return "sync";
}

export default function InteractionsPage() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { medium } = useHaptics();
  const { success, error: showError } = useToast();
  const { items: reactions, loading, error, create, remove, reload } = useUserData("interaction");
  const [newTarget, setNewTarget] = useState("");
  const [newKind, setNewKind] = useState<string>("like");
  const [live, setLive] = useState(false);
  const [range, setRange] = useState<HeatmapRange>(30);
  const [expanded, setExpanded] = useState(true);
  const [filterKind, setFilterKind] = useState<string>("all");

  const filteredReactions = useMemo(() => {
    if (filterKind === "all") return reactions;
    return reactions.filter((r) => getKind(r) === filterKind);
  }, [reactions, filterKind]);

  const engine = useMemo(() => new InteractionsHeatmap(), []);

  const { heatmap, matrix, stats } = useMemo(() => {
    engine.setRecords(filteredReactions);
    return engine.build(range, filterKind);
  }, [engine, filteredReactions, range, filterKind]);

  const kindStats = useMemo(() => {
    return Object.entries(stats.byKind).sort((a, b) => b[1] - a[1]);
  }, [stats.byKind]);

  const maxInDay = stats.maxInDay || 10;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      reload();
    }, 5000);
    return () => clearInterval(id);
  }, [live, reload]);

  async function addReaction() {
    if (!newTarget.trim()) return;
    try {
      await create(newTarget, "", { kind: newKind, target: newTarget });
      setNewTarget("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteReaction(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  function toggleLive() {
    const next = !live;
    setLive(next);
    success(i18n(next ? "connected" : "disconnected"));
  }

  function iconFor(kind: string) {
    const map: Record<string, string> = {
      like: "heart",
      comment: "message-circle",
      share: "share-2",
      noteCreate: "file-text",
      noteSave: "save",
      taskCreate: "check-square",
      taskComplete: "check-circle-2",
      taskDelete: "trash-2",
      eventCreate: "calendar",
      fileCreate: "file-plus",
      spaceSwitch: "layout-grid",
      sync: "refresh-cw",
      uiCustomize: "sliders-horizontal",
    };
    return <Icon name={map[kind] || "flame"} className={`h-5 w-5 ${colorFor(kind)}`} />;
  }

  function colorFor(kind: string) {
    if (kind === "like") return "text-[var(--interaction-like)]";
    if (kind === "comment") return "text-[var(--interaction-comment)]";
    if (kind === "share") return "text-[var(--interaction-share)]";
    return "text-[var(--interaction-default)]";
  }

  const weekdays = WEEKDAY_KEYS.map((k) => i18n(k));

  function formatDayLabel(dateStr?: string) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(settings.language, { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{i18n("interactionsTitle")}</h1>
        <button
          type="button"
          onClick={() => { reload(); success(i18n("refreshed")); }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
        >
          <Icon name="refresh-cw" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {i18n("refresh")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="calendar" className="h-6 w-6 text-rose-400" />
            <div>
              <p className="text-2xl font-bold">{stats.today}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("today")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="flame" className="h-6 w-6 text-sky-400" />
            <div>
              <p className="text-2xl font-bold">{stats.streak}{i18n("days") === "days" ? "D" : i18n("days").charAt(0)}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("active")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="bar-chart-2" className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold">{stats.thisWeekPercent}%</p>
              <p className="text-xs text-[var(--muted)]">{i18n("thisWeek")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="target" className="h-6 w-6 text-violet-400" />
            <div>
              <p className="text-2xl font-bold">{stats.consistency}%</p>
              <p className="text-xs text-[var(--muted)]">{i18n("consistency")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      {kindStats.length > 0 && (
        <Card3D>
          <p className="mb-3 text-sm font-medium">{i18n("byKind")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kindStats.map(([kind, count]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFilterKind(kind)}
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-xs transition-colors ${
                  filterKind === kind ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                {iconFor(kind)}
                <span className="font-medium">{i18n(kind)}</span>
                <span className="ml-auto font-bold">{count}</span>
              </button>
            ))}
          </div>
        </Card3D>
      )}

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">{i18n("interactionsTitle")}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{i18n("interactionsDescription")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <select
              aria-label={i18n("kind")}
              value={newKind}
              onChange={(e) => setNewKind(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              {INTERACTION_KINDS.map((k) => (
                <option key={k} value={k}>{i18n(k)}</option>
              ))}
            </select>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReaction()}
              aria-label={i18n("target")} placeholder={i18n("target")}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              aria-label={i18n("add")}
              onClick={() => { medium(); addReaction(); }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { medium(); toggleLive(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)]"
            >
              <Icon name="radio" className={`h-4 w-4 ${live ? "animate-pulse text-emerald-400" : "text-[var(--muted)]"}`} />
              {live ? i18n("stop") : i18n("live")}
            </button>
            <button
              type="button"
              onClick={() => { medium(); reload(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)]"
            >
              <Icon name="refresh-cw" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {i18n("refresh")}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={i18n("kind")}
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="all">{i18n("all")}</option>
              {INTERACTION_KINDS.map((k) => (
                <option key={k} value={k}>{i18n(k)}</option>
              ))}
            </select>
            <div className="flex gap-1">
              {[30, 90, 365].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r as 30 | 90 | 365)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)]"
                  }`}
                >
                  {i18n(r === 30 ? "range30" : "range90")}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent)]"
            >
              <Icon name={expanded ? "chevron-up" : "chevron-down"} className="h-3.5 w-3.5" />
              {i18n(expanded ? "collapse" : "expand")}
            </button>
          </div>
        </div>
      </Card3D>

      {expanded && (
        <Card3D>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{i18n("heatmap")}</h2>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((level) => (
                <div key={level} className={`h-2.5 w-2.5 rounded-sm ${intensityBg(level)}`} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekdays.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-[var(--muted)]">{d}</div>
            ))}
            {matrix.flat().map((day, i) => (
              <div key={i}>
                {day ? (
                  <Tooltip label={`${formatDayLabel(day.date)}: ${day.count}`} position="top">
                    <button
                      type="button"
                      onPointerDown={medium}
                      aria-label={`${formatDayLabel(day.date)}: ${day.count} ${i18n("interactions")}`}
                      title={`${formatDayLabel(day.date)}: ${day.count}`}
                      className={`aspect-square w-full rounded-md transition-all hover:scale-125 hover:shadow-lg hover:brightness-110 ${intensityBg(InteractionsHeatmap.intensity(day.count, maxInDay))}`}
                    />
                  </Tooltip>
                ) : (
                  <div className="aspect-square w-full" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{formatDayLabel(heatmap[0]?.date)}</span>
            <span>{formatDayLabel(heatmap[heatmap.length - 1]?.date)}</span>
          </div>
        </Card3D>
      )}

      <div className="space-y-3">
        {filteredReactions.map((r) => {
          const kind = getKind(r);
          const data = r.data as { target?: string } | undefined;
          return (
            <Card3D key={r.id}>
              <div className="flex items-center gap-3">
                <span className={colorFor(kind)}>{iconFor(kind)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i18n(kind)}</p>
                  <p className="text-xs text-[var(--muted)]">{(data as { target?: string })?.target || r.label}</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{new Date(r.created_at).toLocaleDateString(settings.language)}</span>
                <button type="button" onPointerDown={medium} onClick={() => deleteReaction(r.id)} className="text-[var(--muted)] hover:text-red-400">
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            </Card3D>
          );
        })}
        {filteredReactions.length === 0 && !loading && (
          <Card3D>
            <p className="text-sm text-[var(--muted)]">{i18n("noInteractions")}</p>
          </Card3D>
        )}
      </div>
    </div>
  );
}
