export type BrainSignal = "ready" | "thinking" | "responding";
export type SyncSignal = "idle" | "syncing";
export type MediaSignal = "idle" | "playing";
export type CalendarSignal = "idle" | "active" | "upcoming";
export type MailSignal = "idle" | "new";
export type NotificationSignal = "idle" | "important" | "new";
export type ActivitySignal = "idle" | "focus" | "busy";

export const SIGNAL_KEYS = [
  "brain",
  "sync",
  "media",
  "calendar",
  "mail",
  "notification",
  "activity",
] as const;

export type SignalKey = (typeof SIGNAL_KEYS)[number];
export type SignalValue =
  | BrainSignal
  | SyncSignal
  | MediaSignal
  | CalendarSignal
  | MailSignal
  | NotificationSignal
  | ActivitySignal;

export type PresenceSignals = {
  brain?: BrainSignal;
  sync?: SyncSignal;
  media?: MediaSignal;
  calendar?: CalendarSignal;
  mail?: MailSignal;
  notification?: NotificationSignal;
  activity?: ActivitySignal;
};

export type SignalMeta = {
  icon: string;
  dot: string;
  iconClass: string;
  priority: number;
  animation?: "pulse" | "spin" | "ping";
  label: string;
};

export const PRESENCE_META: Record<SignalKey, Record<string, SignalMeta>> = {
  brain: {
    ready: {
      icon: "brain",
      dot: "bg-[var(--accent)]",
      iconClass: "text-[var(--accent)]",
      priority: 30,
      label: "presenceBrainReady",
    },
    thinking: {
      icon: "loader-2",
      dot: "bg-sky-400",
      iconClass: "text-sky-400",
      priority: 100,
      animation: "spin",
      label: "presenceBrainThinking",
    },
    responding: {
      icon: "brain",
      dot: "bg-emerald-400",
      iconClass: "text-emerald-400",
      priority: 95,
      animation: "pulse",
      label: "presenceBrainResponding",
    },
  },
  sync: {
    idle: {
      icon: "check",
      dot: "bg-[var(--muted)]",
      iconClass: "text-[var(--muted)]",
      priority: 0,
      label: "presenceSyncIdle",
    },
    syncing: {
      icon: "refresh-cw",
      dot: "bg-sky-400",
      iconClass: "text-sky-400",
      priority: 80,
      animation: "spin",
      label: "presenceSyncing",
    },
  },
  media: {
    idle: {
      icon: "disc",
      dot: "bg-[var(--muted)]",
      iconClass: "text-[var(--muted)]",
      priority: 0,
      label: "presenceMediaIdle",
    },
    playing: {
      icon: "play",
      dot: "bg-emerald-400",
      iconClass: "text-emerald-400",
      priority: 70,
      animation: "pulse",
      label: "presencePlaying",
    },
  },
  calendar: {
    idle: {
      icon: "calendar",
      dot: "bg-[var(--muted)]",
      iconClass: "text-[var(--muted)]",
      priority: 0,
      label: "presenceCalendarIdle",
    },
    active: {
      icon: "calendar-days",
      dot: "bg-amber-400",
      iconClass: "text-amber-400",
      priority: 60,
      animation: "pulse",
      label: "presenceCalendarActive",
    },
    upcoming: {
      icon: "calendar-clock",
      dot: "bg-amber-400",
      iconClass: "text-amber-400",
      priority: 65,
      animation: "pulse",
      label: "presenceCalendarUpcoming",
    },
  },
  mail: {
    idle: {
      icon: "mail",
      dot: "bg-[var(--muted)]",
      iconClass: "text-[var(--muted)]",
      priority: 0,
      label: "presenceMailIdle",
    },
    new: {
      icon: "mail",
      dot: "bg-rose-400",
      iconClass: "text-rose-400",
      priority: 85,
      animation: "pulse",
      label: "presenceNewMail",
    },
  },
  notification: {
    idle: {
      icon: "bell",
      dot: "bg-[var(--muted)]",
      iconClass: "text-[var(--muted)]",
      priority: 0,
      label: "presenceNotificationIdle",
    },
    important: {
      icon: "bell",
      dot: "bg-amber-400",
      iconClass: "text-amber-400",
      priority: 90,
      animation: "pulse",
      label: "presenceImportant",
    },
    new: {
      icon: "bell",
      dot: "bg-rose-400",
      iconClass: "text-rose-400",
      priority: 88,
      animation: "pulse",
      label: "presenceNewNotification",
    },
  },
  activity: {
    idle: {
      icon: "radio",
      dot: "bg-[var(--muted)]",
      iconClass: "text-[var(--muted)]",
      priority: 0,
      label: "presenceActivityIdle",
    },
    focus: {
      icon: "target",
      dot: "bg-[var(--accent)]",
      iconClass: "text-[var(--accent)]",
      priority: 50,
      animation: "pulse",
      label: "presenceFocus",
    },
    busy: {
      icon: "zap",
      dot: "bg-amber-400",
      iconClass: "text-amber-400",
      priority: 55,
      animation: "pulse",
      label: "presenceBusy",
    },
  },
};

const DEFAULT_META: SignalMeta = {
  icon: "radio",
  dot: "bg-[var(--muted)]",
  iconClass: "text-[var(--muted)]",
  priority: 0,
  label: "presence",
};

export function createPresenceSnapshot(initial: Partial<PresenceSignals> = {}): PresenceSignals {
  const snapshot = Object.fromEntries(
    SIGNAL_KEYS.map((key) => [key, undefined])
  ) as Record<SignalKey, SignalValue | undefined>;
  return mergePresenceSignals(snapshot as PresenceSignals, initial);
}

export function mergePresenceSignals(
  base: PresenceSignals,
  patch: Partial<PresenceSignals>
): PresenceSignals {
  const next = { ...base } as Record<SignalKey, SignalValue | undefined>;
  for (const key of Object.keys(patch) as SignalKey[]) {
    const value = patch[key];
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next as PresenceSignals;
}

export function getDominantSignal(
  signals: PresenceSignals,
  fallback: { key: SignalKey; value: SignalValue } = { key: "activity", value: "idle" }
): { key: SignalKey; value: SignalValue; meta: SignalMeta } {
  let bestKey: SignalKey = fallback.key;
  let bestValue: SignalValue = fallback.value;
  let bestMeta: SignalMeta = PRESENCE_META[fallback.key]?.[fallback.value] ?? DEFAULT_META;
  let bestPriority = bestMeta.priority;

  const map = signals as Record<SignalKey, SignalValue | undefined>;
  for (const key of SIGNAL_KEYS) {
    const value = map[key];
    if (value === undefined) continue;
    const meta = PRESENCE_META[key]?.[value];
    if (!meta) continue;
    if (meta.priority > bestPriority) {
      bestKey = key;
      bestValue = value;
      bestMeta = meta;
      bestPriority = meta.priority;
    }
  }

  return { key: bestKey, value: bestValue, meta: bestMeta };
}

export type PresenceStore = {
  getState: () => PresenceSignals;
  setSignal: (key: SignalKey, value?: SignalValue) => void;
  setSignals: (patch: Partial<PresenceSignals>) => void;
  subscribe: (listener: () => void) => () => void;
};

function shallowEqual(a: Record<SignalKey, SignalValue | undefined>, b: Record<SignalKey, SignalValue | undefined>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key as SignalKey] === b[key as SignalKey]);
}

export function createPresenceStore(initial: Partial<PresenceSignals> = {}): PresenceStore {
  let state = createPresenceSnapshot(initial) as Record<SignalKey, SignalValue | undefined>;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  return {
    getState: () => state as PresenceSignals,
    setSignal: (key, value) => {
      const current = state[key];
      if (current === value && (value !== undefined || !(key in state))) return;
      if (value === undefined) {
        if (!(key in state)) return;
        const next = { ...state };
        delete next[key];
        state = next;
      } else {
        state = { ...state, [key]: value };
      }
      notify();
    },
    setSignals: (patch) => {
      const next = mergePresenceSignals(state as PresenceSignals, patch) as Record<SignalKey, SignalValue | undefined>;
      if (shallowEqual(state, next)) return;
      state = next;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
