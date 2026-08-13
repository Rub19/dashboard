const MUSIC_SOURCES = new Set(["spotify", "lastfm"]);
const DAILY_BRIEFING_STORAGE_PREFIX = "ethone:v8:daily-briefing:";

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeText(value: unknown, fallback = "", limit = 180): string {
  const clean = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || fallback).slice(0, limit);
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayRange(date: Date, offset = 0): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function timestamp(value: unknown): number {
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function inRange(value: unknown, range: { start: number; end: number }): boolean {
  const time = timestamp(value);
  return time >= range.start && time < range.end;
}

export type BriefingSignal = {
  id: string;
  label: string;
  icon: string;
  actionId: string;
  value: string;
  metaValue?: string;
  detail: string;
  userContent: boolean;
  state: "ready" | "empty" | "unavailable";
};

export type BriefingSuggestion = {
  icon: string;
  title: string;
  detail: string;
  actionId: string;
  label: string;
  userContent: boolean;
};

export type DailyBriefing = {
  dayKey: string;
  profileId: string;
  generatedAt: string;
  title: string;
  summary: string;
  items: BriefingSignal[];
  suggestion: BriefingSuggestion;
};

function recentActivity(activities: unknown[], sources: string[], earliest: number, latest: number) {
  const allowed = new Set(sources);
  return (safeArray<Record<string, unknown>>(activities)
    .filter((entry) => allowed.has(String(entry?.source || "").toLowerCase()))
    .filter((entry) => {
      const time = timestamp(entry?.timestamp);
      return time >= earliest && time <= latest;
    })
    .sort((left, right) => timestamp(right?.timestamp) - timestamp(left?.timestamp))[0] as Record<string, unknown> | undefined) || null;
}

function hasConnection(connections: unknown[], sources: string[]): boolean {
  const allowed = new Set(sources);
  return safeArray<Record<string, unknown>>(connections).some(
    (connection) => allowed.has(String(connection?.id || "").toLowerCase()) && connection?.status === "connected"
  );
}

function providerSignal(params: {
  id: string;
  label: string;
  icon: string;
  actionId: string;
  activity: Record<string, unknown> | null;
  connected: boolean;
  emptyValue?: string;
}): BriefingSignal {
  const { id, label, icon, actionId, activity, connected, emptyValue = "Aucune activité" } = params;
  if (activity) {
    return {
      id,
      label,
      icon,
      actionId,
      value: safeText(activity.title, emptyValue),
      detail: "Synchronise",
      userContent: true,
      state: "ready",
    };
  }
  return {
    id,
    label,
    icon,
    actionId,
    value: connected ? emptyValue : "Non connectée",
    detail: connected ? "Synchronise" : "Configurer",
    userContent: false,
    state: connected ? "empty" : "unavailable",
  };
}

function taskOrder(left: Record<string, unknown>, right: Record<string, unknown>): number {
  const priority = { high: 0, normal: 1, low: 2 } as Record<string, number>;
  const priorityDelta = (priority[left?.priority as string] ?? 1) - (priority[right?.priority as string] ?? 1);
  if (priorityDelta) return priorityDelta;
  const leftDue = /^\d{4}-\d{2}-\d{2}$/.test(left?.due as string) ? (left.due as string) : "9999-12-31";
  const rightDue = /^\d{4}-\d{2}-\d{2}$/.test(right?.due as string) ? (right.due as string) : "9999-12-31";
  return leftDue.localeCompare(rightDue);
}

export type DailyBriefingSnapshot = {
  events?: unknown[];
  tasks?: unknown[];
  activities?: unknown[];
  connections?: unknown[];
  notes?: unknown[];
  profile?: { id?: string };
};

export function createDailyBriefing(options: { date?: Date; snapshot?: DailyBriefingSnapshot } = {}): DailyBriefing {
  const date = options.date instanceof Date && !Number.isNaN(options.date.getTime()) ? options.date : new Date();
  const snapshot = options.snapshot && typeof options.snapshot === "object" ? options.snapshot : {};
  const today = dayRange(date);
  const now = date.getTime();
  const sevenDaysAgo = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7).getTime();

  const events = safeArray<Record<string, unknown>>(snapshot.events)
    .filter((event) => safeText(event?.date || event?.start) === localDayKey(date))
    .sort((left, right) => safeText(left?.title).localeCompare(safeText(right?.title)));
  const tasks = safeArray<Record<string, unknown>>(snapshot.tasks)
    .filter((task) => task?.done !== true && task?.completed !== true)
    .slice()
    .sort(taskOrder);
  const activities = safeArray<Record<string, unknown>>(snapshot.activities);
  const connections = safeArray<Record<string, unknown>>(snapshot.connections);

  const weather = recentActivity(activities, ["weather"], today.start, now);
  const music = recentActivity(activities, [...MUSIC_SOURCES], sevenDaysAgo, now);
  const github = recentActivity(activities, ["github"], sevenDaysAgo, now);

  const yesterday = dayRange(date, -1);
  const yesterdayCount =
    activities.filter((entry) => inRange(entry?.timestamp, yesterday)).length +
    safeArray<Record<string, unknown>>(snapshot.tasks).filter((task) => task?.done === true && inRange(task?.doneAt, yesterday)).length +
    safeArray<Record<string, unknown>>(snapshot.notes).filter((note) => inRange(note?.updatedAt, yesterday)).length;

  const eventSignal: BriefingSignal = {
    id: "events",
    label: "Agenda",
    icon: "calendar-days",
    actionId: "v8.calendar.open",
    value: events[0] ? safeText(events[0].title, "Événement") : "Aucun événement aujourd'hui",
    metaValue: String(events.length),
    detail: events.length === 1 ? "événement aujourd'hui" : "événements aujourd'hui",
    userContent: Boolean(events[0]),
    state: events.length ? "ready" : "empty",
  };

  const taskSignal: BriefingSignal = {
    id: "tasks",
    label: "Priorités",
    icon: "circle-check-big",
    actionId: "v8.tasks.open",
    value: tasks[0] ? safeText(tasks[0].title, "Tâche") : "Aucune tâche prioritaire",
    metaValue: String(tasks.length),
    detail: tasks.length === 1 ? "priorité ouverte" : "priorités ouvertes",
    userContent: Boolean(tasks[0]),
    state: tasks.length ? "ready" : "empty",
  };

  let suggestion: BriefingSuggestion;
  if ((tasks[0]?.priority as string) === "high") {
    suggestion = {
      icon: "circle-check-big",
      title: "Commencer par la priorité principale",
      detail: safeText(tasks[0].title),
      actionId: "v8.tasks.open",
      label: "Voir la tache",
      userContent: true,
    };
  } else if (events[0]) {
    suggestion = {
      icon: "calendar-check-2",
      title: "Preparer le prochain événement",
      detail: safeText(events[0].title),
      actionId: "v8.calendar.open",
      label: "Voir l'agenda",
      userContent: true,
    };
  } else if (tasks[0]) {
    suggestion = {
      icon: "focus",
      title: "Créer un bloc Focus",
      detail: safeText(tasks[0].title),
      actionId: "v8.space.focus",
      label: "Activer Focus",
      userContent: true,
    };
  } else {
    suggestion = {
      icon: "focus",
      title: "Preserver un bloc calme",
      detail: "Protegez un moment sans interruption.",
      actionId: "v8.space.focus",
      label: "Activer Focus",
      userContent: false,
    };
  }

  const items: BriefingSignal[] = [
    providerSignal({
      id: "weather",
      label: "Météo",
      icon: "cloud-sun",
      actionId: "v8.connections.open",
      activity: weather,
      connected: hasConnection(connections, ["weather"]),
    }),
    eventSignal,
    taskSignal,
    providerSignal({
      id: "music",
      label: "Musique",
      icon: "audio-lines",
      actionId: "v8.connections.open",
      activity: music,
      connected: hasConnection(connections, [...MUSIC_SOURCES]),
      emptyValue: "Aucune ecoute",
    }),
    providerSignal({
      id: "github",
      label: "GitHub",
      icon: "github",
      actionId: "v8.connections.open",
      activity: github,
      connected: hasConnection(connections, ["github"]),
    }),
    {
      id: "yesterday",
      label: "Hier",
      icon: "chart-no-axes-column-increasing",
      actionId: "v8.activity.open",
      value: String(yesterdayCount),
      detail: yesterdayCount === 1 ? "action enregistree" : "actions enregistrees",
      userContent: false,
      state: yesterdayCount ? "ready" : "empty",
    },
  ];

  return {
    dayKey: localDayKey(date),
    profileId: safeText(snapshot.profile?.id, "local", 80),
    generatedAt: date.toISOString(),
    title: "Briefing quotidien",
    summary: "Votre journee en un regard.",
    items,
    suggestion,
  };
}

export function claimDailyBriefing(storage: Storage | undefined, briefing: DailyBriefing): boolean {
  if (!briefing?.dayKey || !briefing?.profileId) return false;
  const profileId = safeText(briefing.profileId, "local", 80).replace(/[^a-z0-9._-]/gi, "-");
  const key = `${DAILY_BRIEFING_STORAGE_PREFIX}${profileId}`;
  try {
    if (storage?.getItem?.(key) === briefing.dayKey) return false;
    storage?.setItem?.(key, briefing.dayKey);
    return true;
  } catch {
    return true;
  }
}
