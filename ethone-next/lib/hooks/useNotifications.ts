"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserState, setUserState } from "@/lib/user-state";

export type NotificationCategory =
  | "mail"
  | "security"
  | "tracker"
  | "system"
  | "brain"
  | "integration"
  | "important"
  | "messages"
  | "activity";

export type NotificationPriority = "critical" | "important" | "normal" | "silent";

export type NotificationType =
  | "info"
  | "success"
  | "error"
  | "warning"
  | "mail"
  | "security"
  | "brain"
  | "system"
  | "tracker"
  | "integration"
  | "github-pr"
  | "calendar";

export type SnoozeDuration = "10m" | "1h" | "tonight" | "tomorrow";

export type Notification = {
  id: string;
  title: string;
  message: string;
  body?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  type?: NotificationType;
  read: boolean;
  archived: boolean;
  snoozedUntil?: number;
  demo?: boolean;
  source?: string;
  icon?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  timestamp: number;
};

const KEY = "ethone-notifications-v1";
const STATE_KEY = "notifications";
const MUTED_KEY = "ethone-notifications-muted";
const DEDUPE_MS = 30000;
const MAX_ITEMS = 300;

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  "important",
  "messages",
  "activity",
  "system",
  "brain",
  "security",
  "integration",
  "tracker",
  "mail",
];

const SNOOZE_OPTIONS: SnoozeDuration[] = ["10m", "1h", "tonight", "tomorrow"];

function isClient() {
  return typeof window !== "undefined";
}

function migrate(item: Partial<Notification> & { snoozed?: boolean }): Notification {
  const now = Date.now();
  const timestamp = item.timestamp || new Date(item.createdAt || now).getTime() || now;
  const priority = normalizePriority(item.priority, item.type);

  let snoozedUntil = item.snoozedUntil;
  if (!snoozedUntil && item.snoozed) {
    snoozedUntil = now + 60 * 60 * 1000;
  }

  return {
    id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: item.title || "ETHONE",
    message: item.message || item.body || "",
    body: item.body || item.message || "",
    category: (item.category as NotificationCategory) || "system",
    priority,
    type: (item.type as NotificationType) || "info",
    read: !!item.read,
    archived: !!item.archived,
    snoozedUntil,
    demo: !!item.demo,
    source: item.source,
    icon: item.icon,
    data: item.data,
    createdAt: item.createdAt || new Date().toISOString(),
    timestamp,
  };
}

function normalizePriority(value?: string, type?: string): NotificationPriority {
  if (value === "critical" || value === "high") return "critical";
  if (value === "important" || value === "medium") return "important";
  if (value === "normal") return "normal";
  if (value === "silent" || value === "low") return "silent";
  if (type === "error") return "critical";
  if (type === "warning") return "important";
  if (type === "brain" || type === "tracker") return "silent";
  return "normal";
}

function snoozeWakeTimestamp(duration: SnoozeDuration): number | null {
  const now = Date.now();
  const map: Record<SnoozeDuration, () => number> = {
    "10m": () => now + 10 * 60 * 1000,
    "1h": () => now + 60 * 60 * 1000,
    tonight: () => {
      const d = new Date();
      d.setHours(22, 0, 0, 0);
      if (d.getTime() <= now) d.setDate(d.getDate() + 1);
      return d.getTime();
    },
    tomorrow: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    },
  };
  return map[duration]?.() ?? null;
}

function loadMuted(): Set<NotificationCategory> {
  if (!isClient()) return new Set();
  try {
    const raw = localStorage.getItem(MUTED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as NotificationCategory[]);
  } catch {
    return new Set();
  }
}

function saveMuted(muted: Set<NotificationCategory>) {
  if (!isClient()) return;
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify([...muted]));
  } catch {
    // ignore
  }
}

function load(): Notification[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (Partial<Notification> & { snoozed?: boolean; priority?: string })[];
    return parsed.map(migrate);
  } catch {
    return [];
  }
}

function save(items: Notification[]) {
  if (!isClient()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    // ignore
  }
}

async function loadAsync(): Promise<Notification[]> {
  try {
    const raw = await getUserState<(Partial<Notification> & { snoozed?: boolean; priority?: string })[]>(STATE_KEY, []);
    return raw.map(migrate);
  } catch {
    return load();
  }
}

async function saveAsync(items: Notification[]) {
  save(items);
  try {
    await setUserState(STATE_KEY, items.slice(-MAX_ITEMS));
  } catch {
    // localStorage fallback
  }
}

function postToWorker(msg: unknown) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const send = (target?: ServiceWorker | null) => {
    target?.postMessage?.(msg);
  };

  if (navigator.serviceWorker.controller) {
    send(navigator.serviceWorker.controller);
    return;
  }

  navigator.serviceWorker.ready.then((reg) => {
    if (reg.active) send(reg.active);
  });
}

function isSnoozed(item: Notification) {
  return (item.snoozedUntil || 0) > Date.now();
}

function mergeRecord(existing: Notification | undefined, incoming: Notification): Notification {
  if (!existing) return incoming;
  if (incoming.timestamp > existing.timestamp) {
    return {
      ...incoming,
      read: existing.read || incoming.read,
      archived: existing.archived || incoming.archived,
      snoozedUntil: Math.max(existing.snoozedUntil || 0, incoming.snoozedUntil || 0) || undefined,
    };
  }
  return {
    ...existing,
    read: existing.read || incoming.read,
    archived: existing.archived || incoming.archived,
    snoozedUntil: Math.max(existing.snoozedUntil || 0, incoming.snoozedUntil || 0) || undefined,
  };
}

function mergeLists(local: Notification[], remote: Notification[]): Notification[] {
  const map = new Map(local.map((n) => [n.id, n]));
  for (const n of remote) {
    map.set(n.id, mergeRecord(map.get(n.id), n));
  }
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_ITEMS);
}

export type NotificationInput = Partial<Omit<Notification, "id">> & {
  title: string;
  message: string;
  category: NotificationCategory;
};

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMutedState] = useState<Set<NotificationCategory>>(() => loadMuted());

  const isMuted = useCallback(
    (category: NotificationCategory) => muted.has(category),
    [muted]
  );

  const persist = useCallback(
    (next: Notification[]) => {
      save(next);
      saveAsync(next);
      postToWorker({ type: "SYNC_NOTIFICATIONS", items: next });
    },
    []
  );

  useEffect(() => {
    const local = load();
    const unique = mergeLists([], local);
    const withoutDemo = unique.filter((n) => !n.demo);
    if (withoutDemo.length !== local.length) {
      save(withoutDemo);
      saveAsync(withoutDemo);
    }
    setItems(withoutDemo);
    setLoaded(true);
    loadAsync().then((remote) => {
      if (remote && remote.length > 0) {
        const cleaned = remote.filter((n) => !n.demo);
        setItems((prev) => mergeLists(prev, cleaned));
      }
    });

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "PUSH_NOTIFICATION" && data.item) {
        setItems((prev) => {
          const merged = mergeLists(prev, [data.item as Notification]);
          save(merged);
          saveAsync(merged);
          return merged;
        });
      } else if (data.type === "SYNC_NOTIFICATIONS" && Array.isArray(data.items)) {
        setItems((prev) => {
          const merged = mergeLists(prev, data.items as Notification[]);
          save(merged);
          saveAsync(merged);
          return merged;
        });
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
      }
    };
  }, [persist]);

  useEffect(() => {
    if (!loaded) return;
    postToWorker({ type: "REQUEST_SYNC" });
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    save(items);
    saveAsync(items);
  }, [items, loaded]);

  const activeItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((n) => {
      if (!n.id || seen.has(n.id)) return false;
      if (n.demo || n.archived || isSnoozed(n) || isMuted(n.category)) return false;
      seen.add(n.id);
      return true;
    });
  }, [items, isMuted]);

  const unreadCount = useMemo(
    () => activeItems.filter((n) => !n.read).length,
    [activeItems]
  );

  const importantCount = useMemo(
    () => activeItems.filter((n) => !n.read && (n.priority === "critical" || n.priority === "important")).length,
    [activeItems]
  );

  const add = useCallback(
    (input: NotificationInput) => {
      const record = migrate({
        ...input,
        priority: normalizePriority(input.priority, input.type),
        timestamp: input.timestamp || Date.now(),
        createdAt: input.createdAt || new Date().toISOString(),
        read: input.read ?? false,
        archived: input.archived ?? false,
      });

      let next: Notification[];
      setItems((prev) => {
        const existing = prev.find((n) => n.id === record.id);
        if (existing) {
          next = prev.map((n) => (n.id === record.id ? mergeRecord(n, record) : n));
        } else {
          const duplicate = prev.find(
            (n) =>
              !n.archived &&
              n.title === record.title &&
              n.message === record.message &&
              n.type === record.type &&
              n.category === record.category &&
              n.priority === record.priority &&
              Math.abs(record.timestamp - n.timestamp) < DEDUPE_MS
          );
          if (duplicate) {
            next = prev.map((n) => (n.id === duplicate.id ? mergeRecord(n, record) : n));
          } else {
            next = [record, ...prev].slice(0, MAX_ITEMS);
          }
        }
        return next;
      });

      setTimeout(() => {
        postToWorker({ type: "PUSH_NOTIFICATION", item: record });
      }, 0);

      return record.id;
    },
    []
  );

  const markRead = useCallback(
    (id: string | string[], read = true) => {
      const ids = Array.isArray(id) ? id : [id];
      setItems((prev) => {
        const next = prev.map((n) => (ids.includes(n.id) ? { ...n, read } : n));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => (n.archived ? n : { ...n, read: true }));
      persist(next);
      return next;
    });
  }, [persist]);

  const archive = useCallback(
    (id: string | string[]) => {
      const ids = Array.isArray(id) ? id : [id];
      setItems((prev) => {
        const next = prev.map((n) =>
          ids.includes(n.id) ? { ...n, archived: true, read: true, snoozedUntil: undefined } : n
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const remove = useCallback(
    (id: string | string[]) => {
      const ids = Array.isArray(id) ? id : [id];
      setItems((prev) => {
        const next = prev.filter((n) => !ids.includes(n.id));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, [persist]);

  const snooze = useCallback(
    (id: string, duration: SnoozeDuration) => {
      const until = snoozeWakeTimestamp(duration);
      if (!until) return false;
      setItems((prev) => {
        const next = prev.map((n) =>
          n.id === id ? { ...n, snoozedUntil: until, read: true } : n
        );
        persist(next);
        return next;
      });
      return true;
    },
    [persist]
  );

  const markImportant = useCallback(
    (id: string | string[]) => {
      const ids = Array.isArray(id) ? id : [id];
      setItems((prev) => {
        const next = prev.map((n) => (ids.includes(n.id) ? { ...n, priority: "important" as const } : n));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const muteCategory = useCallback(
    (category: NotificationCategory) => {
      setMutedState((prev) => {
        const next = new Set(prev);
        next.add(category);
        saveMuted(next);
        return next;
      });
    },
    []
  );

  const unmuteCategory = useCallback(
    (category: NotificationCategory) => {
      setMutedState((prev) => {
        const next = new Set(prev);
        next.delete(category);
        saveMuted(next);
        return next;
      });
    },
    []
  );

  const getCategories = useCallback(() => DEFAULT_CATEGORIES, []);

  return {
    items,
    activeItems,
    unreadCount,
    importantCount,
    add,
    markRead,
    markAllRead,
    archive,
    remove,
    clear,
    snooze,
    markImportant,
    isMuted,
    muteCategory,
    unmuteCategory,
    getCategories,
  };
}

export { SNOOZE_OPTIONS, DEFAULT_CATEGORIES };
