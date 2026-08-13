import { createDailyBriefing, type DailyBriefingSnapshot } from "./daily-briefing";

export type TimeContext = {
  period: "morning" | "afternoon" | "evening" | "night";
  greeting: string;
  tone: string;
};

export function timeContext(date = new Date()): TimeContext {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return { period: "morning", greeting: "Bonjour", tone: "Un départ calme, puis l'essentiel." };
  }
  if (hour >= 12 && hour < 18) {
    return { period: "afternoon", greeting: "Bon après-midi", tone: "Gardez le cap sur ce qui compte." };
  }
  if (hour >= 18 && hour < 23) {
    return { period: "evening", greeting: "Bonsoir", tone: "Le bon moment pour conclure sans se presser." };
  }
  return { period: "night", greeting: "Encore éveillé", tone: "ETHONE reste discret pendant que vous avancez." };
}

function safeText(value: unknown, fallback = "", limit = 120): string {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return (text || fallback).slice(0, limit);
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

type NoteInput = { id?: string; title?: string; name?: string; updatedAt?: string; date?: string };
type TaskInput = { id?: string; text?: string; title?: string; done?: boolean; completed?: boolean; due?: string; date?: string };
type EventInput = { id?: string; title?: string; name?: string; start?: string; date?: string };

function noteModel(note: NoteInput, index: number) {
  return {
    id: safeText(note?.id, `note-${index}`),
    title: safeText(note?.title || note?.name, "Note sans titre"),
    updatedAt: safeText(note?.updatedAt || note?.date, ""),
  };
}

function taskModel(task: TaskInput, index: number) {
  return {
    id: safeText(task?.id, `task-${index}`),
    title: safeText(task?.text || task?.title, "Tâche sans titre"),
    done: task?.done === true || task?.completed === true,
    due: safeText(task?.due || task?.date, ""),
  };
}

function eventModel(event: EventInput, index: number) {
  return {
    id: safeText(event?.id, `event-${index}`),
    title: safeText(event?.title || event?.name, "Événement"),
    start: safeText(event?.start || event?.date, ""),
  };
}

const SOURCE_NAME: Record<string, string> = {
  spotify: "Spotify",
  discord: "Discord",
  weather: "Météo",
  minecraft: "Minecraft",
  steam: "Steam",
  github: "GitHub",
  "google-calendar": "Google Calendar",
  notion: "Notion",
  todoist: "Todoist",
  valorant: "Valorant",
  lol: "LoL",
  twitch: "Twitch",
  lastfm: "Last.fm",
  "tracker-gg": "Tracker.gg",
  "google-drive": "Google Drive",
  youtube: "YouTube",
  reddit: "Reddit",
};

function sourceName(id: string): string {
  return SOURCE_NAME[id] || String(id);
}

function connectedNames(connections: unknown[]): string[] {
  return safeArray<Record<string, unknown>>(connections)
    .filter((connection) => connection?.status === "connected")
    .map((connection) => sourceName(String(connection?.id)));
}

export type HomeRecommendation = {
  title: string;
  detail: string;
  actionId: string;
  label: string;
  icon: string;
  reasons: string[];
};

function computeRecommendation({
  openTasks,
  todayEvents,
  connections,
}: {
  openTasks: ReturnType<typeof taskModel>[];
  todayEvents: ReturnType<typeof eventModel>[];
  connections: unknown[];
}): HomeRecommendation {
  const connected = connectedNames(connections);
  const reasons: string[] = [];
  let title: string;
  let detail: string;
  let actionId: string;
  let label: string;
  let icon: string;

  if (openTasks.length > 0 && todayEvents.length > 0) {
    reasons.push(`${openTasks.length} tâche${openTasks.length > 1 ? "s" : ""} ouverte${openTasks.length > 1 ? "s" : ""}`);
    reasons.push(`${todayEvents.length} événement${todayEvents.length > 1 ? "s" : ""} aujourd'hui`);
    title = "Focus sur votre journée";
    detail = "Vous avez du travail et des rendez-vous : commencez par l'essentiel.";
    actionId = "v8.tasks.open";
    label = "Voir les priorités";
    icon = "circle-check-big";
  } else if (connected.includes("GitHub") && connected.includes("Notion")) {
    reasons.push("GitHub connecté");
    reasons.push("Notion connecté");
    title = "Vos outils de dev et de notes";
    detail = "GitHub et Notion sont actifs : liez vos issues et vos notes.";
    actionId = "v8.notes.open";
    label = "Ouvrir les notes";
    icon = "notebook-pen";
  } else if (connected.includes("Spotify")) {
    reasons.push("Spotify connecté");
    title = "Session musicale";
    detail = "Spotify est prêt : lancez un Pomodoro en musique.";
    actionId = "v8.focus.start.pomodoro";
    label = "Pomodoro";
    icon = "timer";
  } else if (openTasks.length > 0) {
    reasons.push(`${openTasks.length} tâche${openTasks.length > 1 ? "s" : ""} ouverte${openTasks.length > 1 ? "s" : ""}`);
    title = "Vos tâches vous attendent";
    detail = "Commencez par la première tâche du jour.";
    actionId = "v8.tasks.open";
    label = "Ouvrir les tâches";
    icon = "circle-check-big";
  } else if (todayEvents.length > 0) {
    reasons.push(`${todayEvents.length} événement${todayEvents.length > 1 ? "s" : ""} aujourd'hui`);
    title = "Journée bien remplie";
    detail = "Préparez vos prochains rendez-vous.";
    actionId = "v8.calendar.open";
    label = "Voir l'agenda";
    icon = "calendar-days";
  } else if (connected.length > 0) {
    connected.slice(0, 3).forEach((name) => reasons.push(`${name} connecté`));
    title = "Vos sources sont connectées";
    detail = `${connected.length} source${connected.length > 1 ? "s" : ""} alimente${connected.length > 1 ? "nt" : ""} ETHONE.`;
    actionId = "v8.connections.open";
    label = "Gérer les connexions";
    icon = "plug";
  } else {
    title = "Connectez vos outils";
    detail = "ETHONE gagne en contexte avec vos intégrations.";
    actionId = "v8.connections.open";
    label = "Ajouter une source";
    icon = "plug";
  }

  return { title, detail, reasons, actionId, label, icon };
}

function isSameDay(value: unknown, date: Date): boolean {
  if (!value) return false;
  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth() &&
    parsed.getDate() === date.getDate()
  );
}

export type HomeModel = {
  generatedAt: string;
  context: TimeContext;
  user: {
    id: string;
    name: string;
    initial: string;
    avatar: unknown | null;
    banner: string | null;
  };
  summary: {
    openTasks: number;
    notes: number;
    todayEvents: number;
  };
  nextTasks: ReturnType<typeof taskModel>[];
  todayEvents: ReturnType<typeof eventModel>[];
  recentNotes: ReturnType<typeof noteModel>[];
  briefing: ReturnType<typeof createDailyBriefing>;
  recommendation: HomeRecommendation;
  hasProfileData: boolean;
};

export function createHomeModel(options: { date?: Date; snapshot?: DailyBriefingSnapshot } = {}): HomeModel {
  const date = options.date instanceof Date ? options.date : new Date();
  const snapshot = options.snapshot && typeof options.snapshot === "object" ? options.snapshot : {};
  const profile = snapshot.profile && typeof snapshot.profile === "object" ? snapshot.profile : null;
  const notes = safeArray<NoteInput>(snapshot.notes).map(noteModel);
  const tasks = safeArray<TaskInput>(snapshot.tasks).map(taskModel);
  const events = safeArray<EventInput>(snapshot.events).map(eventModel);
  const context = timeContext(date);
  const userName = safeText((profile as Record<string, unknown>)?.name, "Rub");

  const recentNotes = notes
    .slice()
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 3);
  const openTasks = tasks.filter((task) => !task.done);
  const todayEvents = events.filter((event) => isSameDay(event.start, date));

  return {
    generatedAt: date.toISOString(),
    context,
    user: {
      id: safeText((profile as Record<string, unknown>)?.id, "local"),
      name: userName,
      initial: userName.slice(0, 1).toUpperCase(),
      avatar: (profile as Record<string, unknown>)?.avatar && typeof (profile as Record<string, unknown>)?.avatar === "object" ? (profile as Record<string, unknown>)?.avatar : null,
      banner: typeof (profile as Record<string, unknown>)?.banner === "string" ? (profile as Record<string, unknown>)?.banner as string : null,
    },
    summary: {
      openTasks: openTasks.length,
      notes: notes.length,
      todayEvents: todayEvents.length,
    },
    nextTasks: openTasks.slice(0, 4),
    todayEvents: todayEvents.slice(0, 4),
    recentNotes,
    briefing: createDailyBriefing({ snapshot, date }),
    recommendation: computeRecommendation({ openTasks, todayEvents, connections: (snapshot.connections as unknown[]) || [] }),
    hasProfileData: Boolean(profile),
  };
}
