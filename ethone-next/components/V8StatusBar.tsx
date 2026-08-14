"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useActiveProfile, useSettings } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useFocus } from "@/components/FocusProvider";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useItems } from "@/lib/hooks/useItems";
import { usePresence } from "@/components/PresenceProvider";
import PresenceIndicator from "@/components/PresenceIndicator";
import Tooltip from "@/components/Tooltip";
import { type SessionMode } from "@/lib/settings";
import { useClock } from "@/lib/hooks/useClock";

const SESSION_MODE_LABELS: Record<SessionMode, string> = {
  default: "sessionModeDefault",
  focus: "sessionModeFocus",
  intense: "sessionModeIntense",
  zen: "sessionModeZen",
  night: "sessionModeNight",
};

const SESSION_MODE_ICONS: Record<SessionMode, string> = {
  default: "circle",
  focus: "target",
  intense: "zap",
  zen: "coffee",
  night: "moon",
};

type Tone = "online" | "offline" | "syncing" | "warning" | "error" | "important" | "muted";

function toneClass(tone: Tone) {
  switch (tone) {
    case "online":
      return "text-emerald-400";
    case "syncing":
      return "text-sky-400";
    case "warning":
    case "important":
      return "text-amber-400";
    case "error":
    case "offline":
      return "text-rose-400";
    default:
      return "text-[var(--muted)]";
  }
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

function StatusItem({
  icon,
  tone = "muted",
  label,
  value,
  maxValueWidth = "6rem",
}: {
  icon: string;
  tone?: Tone;
  label?: string;
  value?: string;
  maxValueWidth?: string;
}) {
  return (
    <div className="v8-status-item flex min-w-0 items-center gap-1.5" data-tone={tone}>
      <Icon name={icon} className={`h-3.5 w-3.5 shrink-0 ${toneClass(tone)}`} />
      {label && <span className="hidden text-[10px] uppercase tracking-wider text-[var(--muted)] 2xl:inline">{label}</span>}
      {value && (
        <span
          className="truncate font-medium text-[var(--foreground)]"
          style={{ maxWidth: maxValueWidth }}
          translate={value.includes(":") ? "no" : undefined}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export default function V8StatusBar() {
  const i18n = useI18n();
  const { activeProfile } = useActiveProfile();
  const { user } = useAuth();
  const { settings } = useSettings();
  const focus = useFocus();
  const { unreadCount } = useNotifications();
  const { syncing } = useActivityJournal();
  const { lastUpdated } = useLiveData(300000);
  const { loading: notesLoading } = useItems("notes");
  const { loading: tasksLoading } = useItems("tasks");
  const { presence } = usePresence();
  const clock = useClock();
  const time = clock?.time ?? "--:--";
  const online = useOnlineStatus();

  const profileName = activeProfile?.name || user?.email || i18n("guest");
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

  const savePending = notesLoading || tasksLoading;
  const saveMeta = useMemo(() => {
    if (savePending) {
      return { icon: "loader-2", tone: "syncing" as Tone, value: i18n("v8Saving") };
    }
    return { icon: "check", tone: "online" as Tone, value: i18n("v8Saved") };
  }, [savePending, i18n]);

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

  const sessionModeLabel = i18n(SESSION_MODE_LABELS[settings.sessionMode] || SESSION_MODE_LABELS.default);
  const sessionModeIcon = SESSION_MODE_ICONS[settings.sessionMode] || SESSION_MODE_ICONS.default;

  return (
    <footer
      data-v8-status-bar
      data-v8-bar
      className="v8-status-bar fixed bottom-0 left-0 z-30 hidden w-full items-center justify-between border-t border-[var(--border)] bg-[var(--background)]/90 px-4 py-1.5 text-[10px] text-[var(--muted)] backdrop-blur-md md:flex"
    >
      <StatusItem
        icon="timer"
        tone={isFocus ? "online" : "muted"}
        label={i18n("v8Session")}
        value={sessionLabel}
        maxValueWidth="10rem"
      />

      <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden">
        <StatusItem
          icon={sessionModeIcon}
          tone="muted"
          label={i18n("sessionMode")}
          value={sessionModeLabel}
        />
        <StatusItem
          icon={saveMeta.icon}
          tone={saveMeta.tone}
          label={i18n("v8Save")}
          value={saveMeta.value}
        />
        <StatusItem
          icon={syncMeta.icon}
          tone={syncMeta.tone}
          label={i18n("sync")}
          value={syncMeta.value}
        />
        <StatusItem icon="user" tone="muted" label={i18n("profile")} value={profileName} maxValueWidth="8rem" />
        <Tooltip
          label={`${i18n("presence")}: ${i18n(presence.label)}${
            presence.badge ? ` (${presence.badge})` : ""
          }`}
        >
          <span className="inline-flex">
            <PresenceIndicator size="sm" />
          </span>
        </Tooltip>
        <StatusItem
          icon="bell"
          tone={unreadCount > 0 ? "important" : "muted"}
          label={i18n("notifications")}
          value={unreadCount > 0 ? String(unreadCount) : i18n("allCaughtUp")}
        />
        <StatusItem
          icon={online ? "wifi" : "wifi-off"}
          tone={online ? "online" : "offline"}
          label={i18n("network")}
          value={online ? i18n("v8NetworkOnline") : i18n("v8NetworkOffline")}
        />
      </div>

      <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden">
        <StatusItem icon="badge-check" tone="muted" value={i18n("v8Version")} />
        <time
          dateTime={time}
          className="v8-status-clock font-mono text-[var(--foreground)]"
          translate="no"
        >
          {time}
        </time>
      </div>
    </footer>
  );
}
