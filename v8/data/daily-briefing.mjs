const MUSIC_SOURCES = Object.freeze(["spotify", "lastfm"]);
const DAILY_BRIEFING_STORAGE_PREFIX = "ethone:v8:daily-briefing:";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "", limit = 180) {
  const clean = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, limit);
}

function localDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayRange(date, offset = 0) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset + 1);
  return Object.freeze({ start: start.getTime(), end: end.getTime() });
}

function timestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function inRange(value, range) {
  const time = timestamp(value);
  return time >= range.start && time < range.end;
}

function recentActivity(activities, sources, earliest, latest) {
  const allowed = new Set(sources);
  return safeArray(activities)
    .filter((entry) => allowed.has(String(entry?.source || "").toLowerCase()))
    .filter((entry) => {
      const time = timestamp(entry?.timestamp);
      return time >= earliest && time <= latest;
    })
    .sort((left, right) => timestamp(right?.timestamp) - timestamp(left?.timestamp))[0] || null;
}

function hasConnection(connections, sources) {
  const allowed = new Set(sources);
  return safeArray(connections).some((connection) => allowed.has(String(connection?.id || "").toLowerCase()) && connection?.status === "connected");
}

function providerSignal({ id, label, icon, actionId, activity, connected, emptyValue = "Aucune activite" }) {
  if (activity) {
    return Object.freeze({
      id,
      label,
      icon,
      actionId,
      value: safeText(activity.title, emptyValue),
      detail: "Synchronise",
      userContent: true,
      state: "ready"
    });
  }
  return Object.freeze({
    id,
    label,
    icon,
    actionId,
    value: connected ? emptyValue : "Non connectee",
    detail: connected ? "Synchronise" : "Configurer",
    userContent: false,
    state: connected ? "empty" : "unavailable"
  });
}

function taskOrder(left, right) {
  const priority = { high: 0, normal: 1, low: 2 };
  const priorityDelta = (priority[left?.priority] ?? 1) - (priority[right?.priority] ?? 1);
  if (priorityDelta) return priorityDelta;
  const leftDue = /^\d{4}-\d{2}-\d{2}$/.test(left?.due || "") ? left.due : "9999-12-31";
  const rightDue = /^\d{4}-\d{2}-\d{2}$/.test(right?.due || "") ? right.due : "9999-12-31";
  return leftDue.localeCompare(rightDue);
}

function freezeSuggestion(value) {
  return Object.freeze(value);
}

export function createDailyBriefing(options = {}) {
  const date = options.date instanceof Date && !Number.isNaN(options.date.getTime()) ? options.date : new Date();
  const snapshot = options.snapshot && typeof options.snapshot === "object" ? options.snapshot : {};
  const today = dayRange(date);
  const yesterday = dayRange(date, -1);
  const now = date.getTime();
  const sevenDaysAgo = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7).getTime();
  const events = safeArray(snapshot.events)
    .filter((event) => safeText(event?.date || event?.start) === localDayKey(date))
    .sort((left, right) => safeText(left?.title).localeCompare(safeText(right?.title)));
  const tasks = safeArray(snapshot.tasks).filter((task) => task?.done !== true && task?.completed !== true).slice().sort(taskOrder);
  const activities = safeArray(snapshot.activities);
  const connections = safeArray(snapshot.connections);
  const weather = recentActivity(activities, ["weather"], today.start, now);
  const music = recentActivity(activities, MUSIC_SOURCES, sevenDaysAgo, now);
  const github = recentActivity(activities, ["github"], sevenDaysAgo, now);
  const yesterdayCount = activities.filter((entry) => inRange(entry?.timestamp, yesterday)).length
    + safeArray(snapshot.tasks).filter((task) => task?.done === true && inRange(task?.doneAt, yesterday)).length
    + safeArray(snapshot.notes).filter((note) => inRange(note?.updatedAt, yesterday)).length;

  const eventSignal = Object.freeze({
    id: "events",
    label: "Agenda",
    icon: "calendar-days",
    actionId: "v8.calendar.open",
    value: events[0] ? safeText(events[0].title, "Evenement") : "Aucun evenement aujourd'hui",
    metaValue: String(events.length),
    detail: events.length === 1 ? "evenement aujourd'hui" : "evenements aujourd'hui",
    userContent: Boolean(events[0]),
    state: events.length ? "ready" : "empty"
  });
  const taskSignal = Object.freeze({
    id: "tasks",
    label: "Priorites",
    icon: "circle-check-big",
    actionId: "v8.tasks.open",
    value: tasks[0] ? safeText(tasks[0].title, "Tache") : "Aucune tache prioritaire",
    metaValue: String(tasks.length),
    detail: tasks.length === 1 ? "priorite ouverte" : "priorites ouvertes",
    userContent: Boolean(tasks[0]),
    state: tasks.length ? "ready" : "empty"
  });

  let suggestion;
  if (tasks[0]?.priority === "high") {
    suggestion = freezeSuggestion({ icon: "circle-check-big", title: "Commencer par la priorite principale", detail: safeText(tasks[0].title), actionId: "v8.tasks.open", label: "Voir la tache", userContent: true });
  } else if (events[0]) {
    suggestion = freezeSuggestion({ icon: "calendar-check-2", title: "Preparer le prochain evenement", detail: safeText(events[0].title), actionId: "v8.calendar.open", label: "Voir l'agenda", userContent: true });
  } else if (tasks[0]) {
    suggestion = freezeSuggestion({ icon: "focus", title: "Creer un bloc Focus", detail: safeText(tasks[0].title), actionId: "v8.space.focus", label: "Activer Focus", userContent: true });
  } else {
    suggestion = freezeSuggestion({ icon: "focus", title: "Preserver un bloc calme", detail: "Protegez un moment sans interruption.", actionId: "v8.space.focus", label: "Activer Focus", userContent: false });
  }

  const items = Object.freeze([
    providerSignal({ id: "weather", label: "Meteo", icon: "cloud-sun", actionId: "v8.connections.open", activity: weather, connected: hasConnection(connections, ["weather"]) }),
    eventSignal,
    taskSignal,
    providerSignal({ id: "music", label: "Musique", icon: "audio-lines", actionId: "v8.connections.open", activity: music, connected: hasConnection(connections, MUSIC_SOURCES), emptyValue: "Aucune ecoute" }),
    providerSignal({ id: "github", label: "GitHub", icon: "github", actionId: "v8.connections.open", activity: github, connected: hasConnection(connections, ["github"]) }),
    Object.freeze({
      id: "yesterday",
      label: "Hier",
      icon: "chart-no-axes-column-increasing",
      actionId: "v8.activity.open",
      value: String(yesterdayCount),
      detail: yesterdayCount === 1 ? "action enregistree" : "actions enregistrees",
      userContent: false,
      state: yesterdayCount ? "ready" : "empty"
    })
  ]);

  return Object.freeze({
    dayKey: localDayKey(date),
    profileId: safeText(snapshot.profile?.id, "local", 80),
    generatedAt: date.toISOString(),
    title: "Briefing quotidien",
    summary: "Votre journee en un regard.",
    items,
    suggestion
  });
}

export function claimDailyBriefing(storage, briefing) {
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
