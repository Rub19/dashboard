"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { activityJournal } from "@/lib/activity-journal";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useFocus } from "@/components/FocusProvider";
import { type SessionMode } from "@/lib/settings";
import WeatherDetailPopover from "@/components/WeatherDetailPopover";

const ROUTE_ICONS: Record<string, string> = {
  home: "house",
  notes: "notebook-pen",
  tasks: "circle-check",
  calendar: "calendar-days",
  files: "folder",
  bills: "receipt",
  activity: "activity",
  interactions: "flame",
  connections: "plug",
  plugins: "puzzle",
  spaces: "layout-grid",
  flows: "workflow",
  brain: "brain",
  team: "users",
  mail: "mail",
  settings: "settings",
  focus: "timer",
  profile: "user",
  weather: "cloud-sun",
  system: "monitor",
  changelog: "sparkles",
};

const WORKSPACE_FLOWS: Record<string, string> = {
  personal: "v8FlowPersonal",
  focus: "v8FlowFocus",
  studio: "v8FlowStudio",
};

const SESSION_MODE_ICONS: Record<SessionMode, string> = {
  default: "circle",
  focus: "target",
  intense: "zap",
  zen: "coffee",
  night: "moon",
};

type Tone = "online" | "offline" | "syncing" | "warning" | "error" | "muted";

function toneClass(tone: Tone) {
  switch (tone) {
    case "online":
      return "text-emerald-400";
    case "syncing":
      return "text-sky-400";
    case "warning":
      return "text-amber-400";
    case "error":
    case "offline":
      return "text-rose-400";
    default:
      return "text-[var(--muted)]";
  }
}

function weatherIcon(condition?: string) {
  if (!condition) return "cloud-sun";
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "cloud-lightning";
  if (c.includes("rain") || c.includes("drizzle")) return "cloud-rain";
  if (c.includes("snow")) return "snowflake";
  if (c.includes("fog") || c.includes("mist")) return "cloud";
  if (c.includes("cloud")) return "cloud";
  if (c.includes("clear") || c.includes("sun")) return "sun";
  return "cloud-sun";
}

function useClientClock() {
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function ContextItem({
  icon,
  label,
  value,
  tone = "muted",
  title,
  mono,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: Tone;
  title?: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
      data-tone={tone}
      title={title}
    >
      <Icon name={icon} className={`h-3.5 w-3.5 ${toneClass(tone)}`} />
      <div className="hidden flex-col xl:flex">
        <span className="text-[9px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <span className={`font-medium ${mono ? "font-mono" : ""}`} translate={mono ? "no" : undefined}>
          {value}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  active,
  label,
  onClick,
}: {
  icon: string;
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tooltip={label}
      data-interactive
      aria-pressed={active}
      className={`relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-raised)] ${
        active ? "border-[var(--accent)] text-[var(--accent)]" : ""
      }`}
      aria-label={label}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

function WeatherButton({
  weather,
  condition,
  temp,
}: {
  weather: Record<string, unknown> | null;
  condition: string;
  temp: string;
}) {
  const i18n = useI18n();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={setRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-tooltip={i18n("weather")}
        data-interactive
        aria-label={`${i18n("weather")} ${temp}`}
        className="relative flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
      >
        <Icon name={weatherIcon(condition)} className="h-4 w-4" />
        <span className="text-sm font-medium tabular-nums">{temp}</span>
      </button>
      <WeatherDetailPopover
        open={open}
        onClose={() => setOpen(false)}
        referenceRef={ref}
        weather={weather}
      />
    </>
  );
}

export default function V8Breadcrumbs() {
  const i18n = useI18n();
  const pathname = usePathname() ?? "/";
  const { settings, update } = useSettings();
  const { activeProfile } = useActiveProfile();
  const { user } = useAuth();
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const { weather, lastUpdated } = useLiveData(300000);
  const { syncing, sync } = useActivityJournal();
  const focus = useFocus();
  const time = useClientClock();
  const online = useOnlineStatus();

  const previousSpaceRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = previousSpaceRef.current;
    previousSpaceRef.current = activeSpace;
    if (!prev) return;
    const spaceMap: Record<string, string> = {
      personal: "v8.space.personal",
      focus: "v8.space.focus",
      studio: "v8.space.studio",
    };
    const actionId = spaceMap[activeSpace];
    if (actionId) {
      activityJournal.capture(actionId, { ok: true });
    }
  }, [activeSpace]);

  const page = useMemo(
    () => (pathname === "/" ? "home" : pathname.split("/").filter(Boolean)[0] || "home"),
    [pathname]
  );
  const pageIcon = ROUTE_ICONS[page] || "gauge";
  const pageLabel = i18n(page) || page;

  const profileName = activeProfile?.name || user?.email || i18n("guest");
  const spaceFlow = WORKSPACE_FLOWS[activeSpace] || "v8FlowPersonal";
  const spaceLabel = i18n(activeSpace) || activeSpace;

  const weatherCondition = String(weather?.description || weather?.condition || "");
  const weatherTemp =
    typeof weather?.temperature === "number" ? `${weather.temperature}°C` : "--";

  const isZen = settings.zenMode;
  const isFocus = focus.state.phase !== "idle";

  const syncStatus = useMemo<"syncing" | "synced" | "offline">(() => {
    if (!online) return "offline";
    if (syncing) return "syncing";
    if (lastUpdated) return "synced";
    return "offline";
  }, [online, syncing, lastUpdated]);

  const syncMeta = useMemo(() => {
    if (syncStatus === "syncing") {
      return { icon: "refresh-cw", tone: "syncing" as Tone, value: i18n("v8Syncing") };
    }
    if (syncStatus === "offline") {
      return { icon: "wifi-off", tone: "offline" as Tone, value: i18n("v8Offline") };
    }
    return { icon: "cloud", tone: "online" as Tone, value: i18n("v8Synced") };
  }, [syncStatus, i18n]);

  const presetName = useMemo(
    () => i18n(focus.state.activePreset) || focus.state.activePreset || i18n("pomodoro"),
    [focus.state.activePreset, i18n]
  );

  const sessionLabel = useMemo(() => {
    if (isFocus) {
      const base = i18n("v8SessionActive").replace("{{preset}}", presetName);
      return `${base} · ${focus.state.format(focus.state.remaining)}`;
    }
    return i18n("v8SessionIdle");
  }, [isFocus, focus.state, presetName, i18n]);

  const sessionModeIcon = SESSION_MODE_ICONS[settings.sessionMode] || SESSION_MODE_ICONS.default;

  const handleZen = () => update({ zenMode: !isZen });
  const handleFocus = () => {
    if (isFocus) focus.stop();
    else focus.start(settings.focusPreset || "pomodoro");
  };
  const handleNotifications = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("v8:open-notifications"));
    }
  };
  const handleSync = () => {
    sync().catch(() => {});
  };

  return (
    <nav
      data-v8-breadcrumbs
      data-v8-bar
      aria-label={i18n("v8BreadcrumbAria")}
      className="v8-breadcrumbs flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
          aria-label={i18n("home")}
        >
          <Icon name="house" className="h-4 w-4 text-[var(--accent)]" />
          <span className="hidden text-sm font-semibold sm:inline">ETHONE</span>
        </Link>
        <span className="text-[var(--border)]">/</span>
        <span className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[var(--foreground)]">
          <Icon name={pageIcon} className="h-4 w-4 text-[var(--muted)]" />
          <span className="max-w-[8rem] truncate text-sm font-medium capitalize">{pageLabel}</span>
        </span>
      </div>

      <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
        <ContextItem icon="briefcase-business" label={i18n("v8Workspace")} value={spaceLabel} />
        <ContextItem icon="layout-grid" label={i18n("v8DataSpace")} value={spaceLabel} />
        <ContextItem icon="zap" label={i18n("v8Mode")} value={i18n(spaceFlow)} />
        <ContextItem
          icon={syncMeta.icon}
          label={i18n("sync")}
          value={syncMeta.value}
          tone={syncMeta.tone}
          title={i18n("sync")}
        />
        <ContextItem
          icon={isFocus ? "timer" : sessionModeIcon}
          label={i18n("v8Session")}
          value={sessionLabel}
          tone={isFocus ? "online" : "muted"}
        />
        <ContextItem
          icon={online ? "wifi" : "wifi-off"}
          label={i18n("connection")}
          value={online ? i18n("v8NetworkOnline") : i18n("v8NetworkOffline")}
          tone={online ? "online" : "offline"}
        />
        <ContextItem icon="clock" label={i18n("time")} value={time} mono />
        <ContextItem icon="user" label={i18n("profile")} value={profileName} />
      </div>

      <div className="flex shrink-0 items-center gap-1" aria-label={i18n("v8QuickActions")}>
        <QuickAction
          icon={isZen ? "moon" : "sun"}
          active={isZen}
          label={i18n("zenMode")}
          onClick={handleZen}
        />
        <QuickAction
          icon="timer"
          active={isFocus}
          label={i18n("focus")}
          onClick={handleFocus}
        />
        <QuickAction
          icon={syncing ? "refresh-cw" : "cloud"}
          active={syncing}
          label={i18n("sync")}
          onClick={handleSync}
        />
        <QuickAction
          icon="bell"
          label={i18n("notifications")}
          onClick={handleNotifications}
        />
        <WeatherButton
          weather={weather}
          condition={weatherCondition}
          temp={weatherTemp}
        />
      </div>
    </nav>
  );
}
