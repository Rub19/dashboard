"use client";

import { fetchWorker } from "@/lib/api";

export const ACTION_EVENTS = Object.freeze({
  "v8.notes.new": { source: "ethone", category: "productivity", icon: "notebook-pen", title: "Nouvelle note", description: "Une note a été créée dans ETHONE." },
  "v8.notes.save": { source: "ethone", category: "productivity", icon: "save", title: "Note enregistrée", description: "Les modifications sont conservées localement." },
  "v8.tasks.create": { source: "ethone", category: "productivity", icon: "circle-check-big", title: "Tâche ajoutée", description: "Une nouvelle priorité rejoint votre liste." },
  "v8.tasks.complete": { source: "ethone", category: "productivity", icon: "circle-check-big", title: "Tâche terminée", description: "Une priorité a été clôturée." },
  "v8.calendar.create": { source: "calendar", category: "work", icon: "calendar-plus", title: "Événement ajouté", description: "Le planning local a été mis à jour." },
  "v8.files.create": { source: "files", category: "productivity", icon: "folder-plus", title: "Ressource ajoutée", description: "Une ressource rejoint la bibliothèque." },
  "v8.space.personal": { source: "ethone", category: "system", icon: "user-round", title: "Space Personnel actif", description: "Le contexte Essentiel est restauré." },
  "v8.space.focus": { source: "ethone", category: "work", icon: "focus", title: "Space Focus actif", description: "Le contexte Deep Work est restauré." },
  "v8.space.studio": { source: "ethone", category: "productivity", icon: "sparkles", title: "Space Studio actif", description: "Le contexte Création est restauré." },
  "v8.sync.refresh": { source: "ethone", category: "system", icon: "refresh-cw", title: "Synchronisation vérifiée", description: "Les données locales ont été contrôlées." },
  "v8.theme.toggle": { source: "ethone", category: "system", icon: "palette", title: "Thème modifié", description: "L'apparence du système a été adaptée." },
  "v8.appearance.cycle": { source: "ethone", category: "system", icon: "palette", title: "Accent modifié", description: "La couleur active a été adaptée." },
  "v8.brain.call": { source: "ethone", category: "brain", icon: "brain", title: "Brain sollicité", description: "Une question a été posée à Brain." },
});

export const ROUTE_EVENTS = Object.freeze({
  home: { category: "system", icon: "layout-dashboard", title: "Session ETHONE ouverte", description: "Votre environnement personnel est prêt." },
  notes: { category: "productivity", icon: "notebook-pen", title: "Notes ouvertes", description: "Votre espace de notes est au premier plan." },
  tasks: { category: "productivity", icon: "circle-check-big", title: "Tâches ouvertes", description: "Votre liste de priorités est au premier plan." },
  calendar: { category: "work", icon: "calendar-days", title: "Calendrier ouvert", description: "Votre planning est au premier plan." },
  files: { category: "productivity", icon: "folder", title: "Fichiers ouverts", description: "Votre bibliothèque est au premier plan." },
  activity: { category: "system", icon: "activity", title: "Activity Hub ouvert", description: "Le journal local est au premier plan." },
  connections: { category: "system", icon: "plug", title: "Connections ouvertes", description: "Le catalogue des intégrations est au premier plan." },
  spaces: { category: "work", icon: "layers-3", title: "Spaces ouverts", description: "Vos environnements sont au premier plan." },
  flows: { category: "productivity", icon: "workflow", title: "Flows ouverts", description: "Vos contextes de travail sont au premier plan." },
  widgets: { category: "productivity", icon: "blocks", title: "Widgets ouverts", description: "Vos modules sont au premier plan." },
  brain: { category: "brain", icon: "brain", title: "Brain ouvert", description: "Votre synthèse contextuelle est au premier plan." },
  settings: { category: "system", icon: "settings-2", title: "Réglages ouverts", description: "Les préférences du système sont au premier plan." },
});

export type ActivityCategory = "productivity" | "work" | "system" | "brain";

export type ActivityEntry = {
  id: string;
  source: string;
  category: ActivityCategory;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  tone?: string;
  eventType?: string;
  details?: Record<string, unknown>;
  synced?: boolean;
};

export type ActivitySnapshot = {
  notes?: Array<{ id: string; title: string; updatedAt?: string; createdAt?: string }>;
  tasks?: Array<{ id: string; title: string; done?: boolean; doneAt?: string; createdAt?: string; updatedAt?: string }>;
  events?: Array<{ id: string; title: string; date?: string }>;
  files?: Array<{ id: string; name: string; date?: string; createdAt?: string; updatedAt?: string }>;
};

const STORAGE_KEY = "ethone-activity-journal-v1";
const MAX_ENTRIES = 120;
const SYNC_BATCH_LIMIT = 50;

function safeDate(value: unknown, fallback: string): string {
  const raw = value instanceof Date ? value : typeof value === "string" || typeof value === "number" ? value : fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

type JournalState = {
  entries: ActivityEntry[];
};

function loadState(): JournalState {
  if (!isClient()) return { entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as JournalState;
    return { entries: Array.isArray(parsed?.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function saveState(state: JournalState) {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: state.entries }));
  } catch {
    // ignore quota/storage errors
  }
}

export function derivedEntries(snapshot: ActivitySnapshot, nowIso: string): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  (snapshot.notes || []).slice(0, 8).forEach((note) => {
    entries.push({
      id: `derived-note-${note.id}`,
      source: "notes",
      category: "productivity",
      icon: "notebook-pen",
      title: note.title || "Note",
      description: "Note disponible dans la mémoire locale.",
      timestamp: safeDate(note.updatedAt || note.createdAt, nowIso),
      tone: "note",
      eventType: "derived:note",
    });
  });
  (snapshot.tasks || []).slice(0, 10).forEach((task) => {
    entries.push({
      id: `derived-task-${task.id}`,
      source: "tasks",
      category: "productivity",
      icon: task.done ? "circle-check-big" : "circle",
      title: task.title || "Tâche",
      description: task.done ? "Tâche terminée." : "Tâche encore ouverte.",
      timestamp: safeDate(task.doneAt || task.updatedAt || task.createdAt, nowIso),
      tone: task.done ? "success" : "task",
      eventType: "derived:task",
    });
  });
  (snapshot.events || []).slice(0, 8).forEach((event) => {
    entries.push({
      id: `derived-event-${event.id}`,
      source: "calendar",
      category: "work",
      icon: "calendar-days",
      title: event.title || "Événement",
      description: "Événement présent dans votre planning.",
      timestamp: safeDate(event.date, nowIso),
      tone: "calendar",
      eventType: "derived:event",
    });
  });
  (snapshot.files || []).slice(0, 8).forEach((file) => {
    entries.push({
      id: `derived-file-${file.id}`,
      source: "files",
      category: "productivity",
      icon: "folder",
      title: file.name || "Fichier",
      description: "Ressource disponible dans la bibliothèque.",
      timestamp: safeDate(file.date || file.updatedAt || file.createdAt, nowIso),
      tone: "file",
      eventType: "derived:file",
    });
  });
  return entries;
}

export interface ActivityJournal {
  entries: (snapshot?: ActivitySnapshot) => ActivityEntry[];
  record: (event: Partial<Omit<ActivityEntry, "category">> & { category?: string; title: string }) => ActivityEntry;
  capture: (actionId: string, metadata?: Record<string, unknown> & { ok?: boolean }) => ActivityEntry | null;
  captureRoute: (route: string) => ActivityEntry | null;
  subscribe: (subscriber: (entries: ActivityEntry[]) => void) => () => void;
  sync: () => Promise<{ ok: boolean; count: number }>;
  pending: () => ActivityEntry[];
  pendingCount: () => number;
  syncing: () => boolean;
  subscribeSync: (subscriber: (syncing: boolean) => void) => () => void;
  destroy: () => void;
}

export function createActivityJournal(): ActivityJournal {
  const state = loadState();
  const subscribers = new Set<(entries: ActivityEntry[]) => void>();
  let isSyncing = false;
  const syncSubscribers = new Set<(syncing: boolean) => void>();

  function entries(snapshot?: ActivitySnapshot): ActivityEntry[] {
    const now = nowIso();
    const derived = snapshot ? derivedEntries(snapshot, now) : [];
    const combined = [...state.entries, ...derived];
    const unique = combined.filter((entry, index, list) =>
      entry?.id && list.findIndex((candidate) => candidate?.id === entry.id) === index
    );
    return unique
      .sort((left, right) => String(right.timestamp || "").localeCompare(String(left.timestamp || "")))
      .slice(0, MAX_ENTRIES)
      .map((entry) => ({ ...entry }));
  }

  function emit() {
    const next = entries();
    subscribers.forEach((subscriber) => subscriber(next));
    return next;
  }

  function record(event: Partial<Omit<ActivityEntry, "category">> & { category?: string; title: string }): ActivityEntry {
    const entry: ActivityEntry = {
      id: event.id || generateId(),
      source: event.source || "ethone",
      category: (event.category as ActivityCategory) || "system",
      icon: event.icon || "activity",
      title: event.title,
      description: event.description || "",
      timestamp: event.timestamp || nowIso(),
      tone: event.tone,
      eventType: event.eventType || event.title,
      details: event.details || {},
      synced: false,
    };
    state.entries.unshift(entry);
    state.entries = state.entries.slice(0, MAX_ENTRIES);
    saveState(state);
    emit();
    return { ...entry };
  }

  function capture(actionId: string, metadata?: Record<string, unknown> & { ok?: boolean }): ActivityEntry | null {
    const { ok, ...rest } = metadata || {};
    if (ok === false) return null;
    const template = ACTION_EVENTS[actionId as keyof typeof ACTION_EVENTS];
    if (!template) return null;
    return record({
      ...template,
      eventType: actionId,
      details: Object.keys(rest).length > 0 ? rest : undefined,
    });
  }

  function captureRoute(route: string): ActivityEntry | null {
    const template = ROUTE_EVENTS[route as keyof typeof ROUTE_EVENTS];
    if (!template) return null;
    return record({
      source: "ethone",
      tone: "navigation",
      ...template,
      eventType: `route:${route}`,
    });
  }

  function subscribe(subscriber: (entries: ActivityEntry[]) => void): () => void {
    if (typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    subscriber(entries());
    return () => subscribers.delete(subscriber);
  }

  function pending(): ActivityEntry[] {
    return state.entries.filter((entry) => !entry.synced);
  }

  function pendingCount(): number {
    return pending().length;
  }

  function notifySync(value: boolean) {
    syncSubscribers.forEach((subscriber) => subscriber(value));
  }

  function setSyncing(value: boolean) {
    if (isSyncing === value) return;
    isSyncing = value;
    notifySync(isSyncing);
  }

  function syncing(): boolean {
    return isSyncing;
  }

  function subscribeSync(subscriber: (syncing: boolean) => void): () => void {
    if (typeof subscriber !== "function") return () => {};
    syncSubscribers.add(subscriber);
    subscriber(isSyncing);
    return () => syncSubscribers.delete(subscriber);
  }

  async function sync(): Promise<{ ok: boolean; count: number; error: Error | null }> {
    if (isSyncing) return { ok: true, count: 0, error: null };
    const unsynced = pending().slice(0, SYNC_BATCH_LIMIT);
    if (unsynced.length === 0) return { ok: true, count: 0, error: null };

    const events = unsynced.map((entry) => ({
      eventType: entry.eventType || entry.title,
      createdAt: entry.timestamp,
      details: entry.details || {},
    }));

    setSyncing(true);
    try {
      await fetchWorker("/api/cloud/activity", {
        method: "POST",
        body: JSON.stringify({ events }),
      });
      unsynced.forEach((entry) => {
        const stored = state.entries.find((e) => e.id === entry.id);
        if (stored) stored.synced = true;
      });
      saveState(state);
      emit();
      return { ok: true, count: unsynced.length, error: null };
    } catch (err) {
      return { ok: false, count: 0, error: err instanceof Error ? err : new Error(String(err)) };
    } finally {
      setSyncing(false);
    }
  }

  function destroy() {
    subscribers.clear();
    syncSubscribers.clear();
  }

  return Object.freeze({
    entries,
    record,
    capture,
    captureRoute,
    subscribe,
    sync,
    pending,
    pendingCount,
    syncing,
    subscribeSync,
    destroy,
  });
}

export const activityJournal = createActivityJournal();
