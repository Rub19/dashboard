"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useAuth } from "@/components/AuthProvider";
import { useFocus } from "@/components/FocusProvider";
import { usePresence } from "@/components/PresenceProvider";

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

function StatusItem({
  icon,
  tone = "muted",
  label,
  value,
}: {
  icon: string;
  tone?: Tone;
  label?: string;
  value?: string;
}) {
  return (
    <div className="v8-status-item flex items-center gap-1.5" data-tone={tone}>
      <Icon name={icon} className={`h-3.5 w-3.5 ${toneClass(tone)}`} />
      {label && <span className="hidden text-[10px] uppercase tracking-wider text-[var(--muted)] sm:inline">{label}</span>}
      {value && (
        <span className="font-medium text-[var(--foreground)]" translate={value.includes(":") ? "no" : undefined}>
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
  const { state: presence } = usePresence();
  const focus = useFocus();
  const { unreadCount } = useNotifications();
  const time = useClientClock();
  const online = useOnlineStatus();

  const profileName = activeProfile?.name || user?.email || i18n("guest");
  const syncing = presence.sync === "syncing";
  const isFocus = focus.state.phase !== "idle";

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
      />

      <div className="flex items-center gap-3">
        <StatusItem
          icon={syncing ? "refresh-cw" : "cloud"}
          tone={syncing ? "syncing" : "online"}
          label={i18n("sync")}
          value={syncing ? i18n("v8Syncing") : i18n("v8Synced")}
        />
        <StatusItem icon="user" tone="muted" label={i18n("profile")} value={profileName} />
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

      <div className="flex items-center gap-3">
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
