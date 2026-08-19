"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useCallback,
  type ReactNode,
} from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useNotifications } from "@/lib/hooks/useNotifications";
import {
  type SignalKey,
  type PresenceSignals,
  type SignalMeta,
  type SignalValue,
  type PresenceStore,
  SIGNAL_KEYS,
  createPresenceStore,
  mergePresenceSignals,
  getDominantSignal,
} from "@/lib/presence-engine";
import { USER_STATUS_CONFIG } from "@/lib/settings";

export type PresenceStatus = "online" | "away" | "dnd" | "offline";

export type PresenceState = PresenceSignals & {
  status?: PresenceStatus;
  typing?: boolean;
};

export type DerivedPresence = PresenceState & {
  dominant: SignalKey;
  value: SignalValue;
  meta: SignalMeta;
  icon: string;
  badge?: number;
  animate: boolean;
  label: string;
};

type PresenceContextValue = {
  state: PresenceState;
  presence: DerivedPresence;
  setSignal: <K extends SignalKey>(key: K, value?: PresenceSignals[K]) => void;
  setBrain: (value?: PresenceSignals["brain"]) => void;
  setSync: (value?: PresenceSignals["sync"]) => void;
  setMedia: (value?: PresenceSignals["media"]) => void;
  setCalendar: (value?: PresenceSignals["calendar"]) => void;
  setMail: (value?: PresenceSignals["mail"], autoClearMs?: number) => void;
  setNotification: (value?: PresenceSignals["notification"], autoClearMs?: number) => void;
  setActivity: (value?: PresenceSignals["activity"]) => void;
  setStatus: (value?: PresenceStatus) => void;
  setTyping: (value?: boolean) => void;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

function normalizeStatus(status: string): PresenceStatus {
  if (status in USER_STATUS_CONFIG) {
    return USER_STATUS_CONFIG[status as keyof typeof USER_STATUS_CONFIG].presence;
  }
  return "online";
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used within a PresenceProvider");
  return ctx;
}

export default function PresenceProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const focus = useFocus();
  const { syncing, pendingCount } = useActivityJournal();
  const { nowPlaying, records, loading: liveLoading } = useLiveData(120_000);
  const { unreadCount, importantCount, activeItems } = useNotifications();

  const store = useMemo<PresenceStore>(() => createPresenceStore(), []);
  const explicit = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const [status, setStatusState] = useState<PresenceStatus | undefined>(() =>
    normalizeStatus(settings.status)
  );
  const [typing, setTypingState] = useState(false);

  useEffect(() => {
    setStatusState(normalizeStatus(settings.status));
  }, [settings.status]);

  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const derived = useMemo<PresenceSignals>(() => {
    const next: PresenceSignals = {};

    if (settings.brainEnabled) {
      next.brain = "ready";
    }

    if (syncing) {
      next.sync = "syncing";
    }

    if (nowPlaying?.isPlaying) {
      next.media = "playing";
    }

    const calendarRecord = records.find((record) => record.id === "google-calendar");
    if (calendarRecord) {
      if (calendarRecord.status === "connected" || liveLoading) {
        next.calendar = "active";
      }
    }

    const mailCount = activeItems.filter(
      (item) =>
        (item.category === "mail" || item.type === "mail") && !item.read
    ).length;
    if (mailCount > 0) {
      next.mail = "new";
    }

    if (unreadCount > 0 || importantCount > 0) {
      next.notification = "important";
    }

    if (focus.state.phase !== "idle") {
      next.activity = "focus";
    } else if (settings.status === "focus") {
      next.activity = "focus";
    } else if (settings.status === "busy") {
      next.activity = "busy";
    } else if (pendingCount > 0) {
      next.activity = "busy";
    } else {
      next.activity = "idle";
    }

    return next;
  }, [
    settings.brainEnabled,
    settings.status,
    syncing,
    nowPlaying,
    records,
    liveLoading,
    activeItems,
    unreadCount,
    importantCount,
    focus.state.phase,
    pendingCount,
  ]);

  const state = useMemo<PresenceState>(() => {
    const merged = mergePresenceSignals(derived, explicit) as PresenceState;
    merged.status = status;
    merged.typing = typing;
    return merged;
  }, [derived, explicit, status, typing]);

  const presence = useMemo<DerivedPresence>(() => {
    const dominant = getDominantSignal(state, {
      key: "activity",
      value: state.activity ?? "idle",
    });
    const meta = dominant.meta;
    const badge =
      dominant.key === "notification"
        ? unreadCount
        : dominant.key === "mail"
        ? activeItems.filter(
            (item) =>
              (item.category === "mail" || item.type === "mail") && !item.read
          ).length
        : undefined;

    return {
      ...state,
      dominant: dominant.key,
      value: dominant.value,
      meta,
      icon: meta.icon,
      badge,
      animate: meta.animation !== undefined,
      label: meta.label,
    };
  }, [state, unreadCount, activeItems]);

  const clearTimeoutFor = useCallback((key: string) => {
    if (timeouts.current[key]) {
      clearTimeout(timeouts.current[key]);
      delete timeouts.current[key];
    }
  }, []);

  const setSignal = useCallback(
    <K extends SignalKey>(key: K, value?: PresenceSignals[K]) => {
      store.setSignal(key, value as SignalValue);
    },
    [store]
  );

  const setBrain = useCallback(
    (value?: PresenceSignals["brain"]) => store.setSignal("brain", value),
    [store]
  );

  const setSync = useCallback(
    (value?: PresenceSignals["sync"]) => store.setSignal("sync", value),
    [store]
  );

  const setMedia = useCallback(
    (value?: PresenceSignals["media"]) => store.setSignal("media", value),
    [store]
  );

  const setCalendar = useCallback(
    (value?: PresenceSignals["calendar"]) => store.setSignal("calendar", value),
    [store]
  );

  const setMail = useCallback(
    (value?: PresenceSignals["mail"], autoClearMs?: number) => {
      store.setSignal("mail", value);
      clearTimeoutFor("mail");
      if (value && autoClearMs) {
        timeouts.current.mail = setTimeout(() => {
          store.setSignal("mail", undefined);
        }, autoClearMs);
      }
    },
    [store, clearTimeoutFor]
  );

  const setNotification = useCallback(
    (value?: PresenceSignals["notification"], autoClearMs?: number) => {
      store.setSignal("notification", value);
      clearTimeoutFor("notification");
      if (value && autoClearMs) {
        timeouts.current.notification = setTimeout(() => {
          store.setSignal("notification", undefined);
        }, autoClearMs);
      }
    },
    [store, clearTimeoutFor]
  );

  const setActivity = useCallback(
    (value?: PresenceSignals["activity"]) => store.setSignal("activity", value),
    [store]
  );

  const setStatus = useCallback((value?: PresenceStatus) => {
    setStatusState(value);
  }, []);

  const setTyping = useCallback((value?: boolean) => {
    setTypingState(!!value);
    clearTimeoutFor("typing");
    if (value) {
      timeouts.current.typing = setTimeout(() => {
        setTypingState(false);
      }, 2000);
    }
  }, [clearTimeoutFor]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.setAttribute("data-presence-engine", settings.reducedMotion ? "paused" : "active");

    for (const key of SIGNAL_KEYS) {
      const value = state[key];
      if (value !== undefined) {
        html.setAttribute(`data-presence-${key}`, value);
      } else {
        html.removeAttribute(`data-presence-${key}`);
      }
    }

    if (state.status) {
      html.setAttribute("data-presence-status", state.status);
    } else {
      html.removeAttribute("data-presence-status");
    }

    if (state.typing) {
      html.setAttribute("data-presence-typing", "true");
    } else {
      html.removeAttribute("data-presence-typing");
    }

    if (presence.dominant) {
      html.setAttribute("data-presence-dominant", presence.dominant);
    } else {
      html.removeAttribute("data-presence-dominant");
    }

    return () => {
      html.removeAttribute("data-presence-engine");
      for (const key of SIGNAL_KEYS) {
        html.removeAttribute(`data-presence-${key}`);
      }
      html.removeAttribute("data-presence-status");
      html.removeAttribute("data-presence-typing");
      html.removeAttribute("data-presence-dominant");
    };
  }, [settings.reducedMotion, state, presence.dominant]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      state,
      presence,
      setSignal,
      setBrain,
      setSync,
      setMedia,
      setCalendar,
      setMail,
      setNotification,
      setActivity,
      setStatus,
      setTyping,
    }),
    [
      state,
      presence,
      setSignal,
      setBrain,
      setSync,
      setMedia,
      setCalendar,
      setMail,
      setNotification,
      setActivity,
      setStatus,
      setTyping,
    ]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
