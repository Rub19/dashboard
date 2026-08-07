import { createDailyBriefing } from "./daily-briefing.mjs";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return (text || fallback).slice(0, 120);
}

export function timeContext(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return Object.freeze({ period: "morning", greeting: "Bonjour", tone: "Un départ calme, puis l'essentiel." });
  }
  if (hour >= 12 && hour < 18) {
    return Object.freeze({ period: "afternoon", greeting: "Bon après-midi", tone: "Gardez le cap sur ce qui compte." });
  }
  if (hour >= 18 && hour < 23) {
    return Object.freeze({ period: "evening", greeting: "Bonsoir", tone: "Le bon moment pour conclure sans se presser." });
  }
  return Object.freeze({ period: "night", greeting: "Encore éveillé", tone: "ETHONE reste discret pendant que vous avancez." });
}

function noteModel(note, index) {
  return Object.freeze({
    id: safeText(note?.id, `note-${index}`),
    title: safeText(note?.title || note?.name, "Note sans titre"),
    updatedAt: safeText(note?.updatedAt || note?.date, "")
  });
}

function taskModel(task, index) {
  return Object.freeze({
    id: safeText(task?.id, `task-${index}`),
    title: safeText(task?.text || task?.title, "Tâche sans titre"),
    done: task?.done === true || task?.completed === true,
    due: safeText(task?.due || task?.date, "")
  });
}

function eventModel(event, index) {
  return Object.freeze({
    id: safeText(event?.id, `event-${index}`),
    title: safeText(event?.title || event?.name, "Événement"),
    start: safeText(event?.start || event?.date, "")
  });
}

const SOURCE_NAME = Object.freeze({
  spotify: "Spotify", discord: "Discord", weather: "Météo", minecraft: "Minecraft", steam: "Steam",
  github: "GitHub", "google-calendar": "Google Calendar", notion: "Notion", todoist: "Todoist",
  valorant: "Valorant", lol: "LoL", twitch: "Twitch", lastfm: "Last.fm", "tracker-gg": "Tracker.gg",
  "google-drive": "Google Drive", youtube: "YouTube", reddit: "Reddit"
});

function sourceName(id) { return SOURCE_NAME[id] || String(id); }

function connectedNames(connections) {
  return safeArray(connections).filter((connection) => connection?.status === "connected").map((connection) => sourceName(connection?.id));
}

function computeRecommendation({ openTasks, todayEvents, connections }) {
  const connected = connectedNames(connections);
  const reasons = [];
  let title, detail, actionId, label, icon;

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

  return Object.freeze({ title, detail, reasons: Object.freeze(reasons), actionId, label, icon });
}

function isSameDay(value, date) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getFullYear() === date.getFullYear()
    && parsed.getMonth() === date.getMonth()
    && parsed.getDate() === date.getDate();
}

export function createHomeModel(options = {}) {
  const date = options.date instanceof Date ? options.date : new Date();
  const snapshot = options.snapshot && typeof options.snapshot === "object" ? options.snapshot : {};
  const profile = snapshot.profile && typeof snapshot.profile === "object" ? snapshot.profile : null;
  const notes = safeArray(snapshot.notes).map(noteModel);
  const tasks = safeArray(snapshot.tasks).map(taskModel);
  const events = safeArray(snapshot.events).map(eventModel);
  const context = timeContext(date);
  const userName = safeText(profile?.name, "Rub");

  const recentNotes = notes
    .slice()
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .slice(0, 3);
  const openTasks = tasks.filter((task) => !task.done);
  const todayEvents = events.filter((event) => isSameDay(event.start, date));

  return Object.freeze({
    generatedAt: date.toISOString(),
    context,
    user: Object.freeze({
      id: safeText(profile?.id, "local"),
      name: userName,
      initial: userName.slice(0, 1).toUpperCase(),
      avatar: profile?.avatar && typeof profile.avatar === "object" ? profile.avatar : null,
      banner: typeof profile?.banner === "string" ? profile.banner : null
    }),
    summary: Object.freeze({
      openTasks: openTasks.length,
      notes: notes.length,
      todayEvents: todayEvents.length
    }),
    nextTasks: Object.freeze(openTasks.slice(0, 4)),
    todayEvents: Object.freeze(todayEvents.slice(0, 4)),
    recentNotes: Object.freeze(recentNotes),
    briefing: createDailyBriefing({ snapshot, date }),
    recommendation: computeRecommendation({ openTasks, todayEvents, connections: snapshot.connections }),
    hasProfileData: Boolean(profile)
  });
}
