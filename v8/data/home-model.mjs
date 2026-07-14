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
      initial: userName.slice(0, 1).toUpperCase()
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
    hasProfileData: Boolean(profile)
  });
}
