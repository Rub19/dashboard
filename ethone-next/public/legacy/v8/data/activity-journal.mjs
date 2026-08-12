const ACTION_EVENTS = Object.freeze({
  "v8.notes.new": { source: "ethone", category: "productivity", icon: "notebook-pen", title: "Nouvelle note", description: "Une note a ete créée dans ETHONE." },
  "v8.notes.save": { source: "ethone", category: "productivity", icon: "save", title: "Note enregistree", description: "Les modifications sont conservees localement." },
  "v8.tasks.create": { source: "ethone", category: "productivity", icon: "circle-check-big", title: "Tache ajoutee", description: "Une nouvelle priorité rejoint votre liste." },
  "v8.calendar.create": { source: "calendar", category: "work", icon: "calendar-plus", title: "Événement ajoute", description: "Le planning local a ete mis a jour." },
  "v8.files.create": { source: "files", category: "productivity", icon: "folder-plus", title: "Ressource ajoutee", description: "Une ressource rejoint la bibliotheque." },
  "v8.space.personal": { source: "ethone", category: "system", icon: "user-round", title: "Space Personnel actif", description: "Le contexte Essentiel est restaure." },
  "v8.space.focus": { source: "ethone", category: "work", icon: "focus", title: "Space Focus actif", description: "Le contexte Deep Work est restaure." },
  "v8.space.studio": { source: "ethone", category: "productivity", icon: "sparkles", title: "Space Studio actif", description: "Le contexte Creation est restaure." },
  "v8.sync.refresh": { source: "ethone", category: "system", icon: "refresh-cw", title: "Synchronisation vérifiée", description: "Les données locales ont ete controlees." },
  "v8.theme.toggle": { source: "ethone", category: "system", icon: "palette", title: "Thème modifié", description: "L'apparence du système a ete adaptee." },
  "v8.appearance.cycle": { source: "ethone", category: "system", icon: "palette", title: "Accent modifié", description: "La couleur active a ete adaptee." }
});

const ROUTE_EVENTS = Object.freeze({
  home: { category: "system", icon: "layout-dashboard", title: "Session ETHONE ouverte", description: "Votre environnement personnel est pret." },
  notes: { category: "productivity", icon: "notebook-pen", title: "Notes ouvertes", description: "Votre espace de notes est au premier plan." },
  tasks: { category: "productivity", icon: "circle-check-big", title: "Taches ouvertes", description: "Votre liste de priorités est au premier plan." },
  calendar: { category: "work", icon: "calendar-days", title: "Calendrier ouvert", description: "Votre planning est au premier plan." },
  files: { category: "productivity", icon: "folder", title: "Fichiers ouverts", description: "Votre bibliotheque est au premier plan." },
  activity: { category: "system", icon: "activity", title: "Activity Hub ouvert", description: "Le journal local est au premier plan." },
  connections: { category: "system", icon: "plug", title: "Connections ouvertes", description: "Le catalogue des intégrations est au premier plan." },
  spaces: { category: "work", icon: "layers-3", title: "Spaces ouverts", description: "Vos environnements sont au premier plan." },
  flows: { category: "productivity", icon: "workflow", title: "Flows ouverts", description: "Vos contextes de travail sont au premier plan." },
  widgets: { category: "productivity", icon: "blocks", title: "Widgets ouverts", description: "Vos modules sont au premier plan." },
  brain: { category: "brain", icon: "brain", title: "Brain ouvert", description: "Votre synthèse contextuelle est au premier plan." },
  settings: { category: "system", icon: "settings-2", title: "Réglages ouverts", description: "Les préférences du système sont au premier plan." }
});

function safeDate(value, fallback) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function derivedEntries(snapshot, nowIso) {
  const entries = [];
  (snapshot.notes || []).slice(0, 8).forEach((note) => entries.push({
    id: `derived-note-${note.id}`,
    source: "notes",
    category: "productivity",
    icon: "notebook-pen",
    title: note.title,
    description: "Note disponible dans la memoire locale.",
    timestamp: safeDate(note.updatedAt || note.createdAt, nowIso),
    tone: "note"
  }));
  (snapshot.tasks || []).slice(0, 10).forEach((task) => entries.push({
    id: `derived-task-${task.id}`,
    source: "tasks",
    category: "productivity",
    icon: task.done ? "circle-check-big" : "circle",
    title: task.title,
    description: task.done ? "Tache terminée." : "Tache encore ouverte.",
    timestamp: safeDate(task.doneAt || task.createdAt, nowIso),
    tone: task.done ? "success" : "task"
  }));
  (snapshot.events || []).slice(0, 8).forEach((event) => entries.push({
    id: `derived-event-${event.id}`,
    source: "calendar",
    category: "work",
    icon: "calendar-days",
    title: event.title,
    description: "Événement present dans votre planning.",
    timestamp: safeDate(event.date, nowIso),
    tone: "calendar"
  }));
  (snapshot.files || []).slice(0, 8).forEach((file) => entries.push({
    id: `derived-file-${file.id}`,
    source: "files",
    category: "productivity",
    icon: "folder",
    title: file.name,
    description: "Ressource disponible dans la bibliotheque.",
    timestamp: safeDate(file.date, nowIso),
    tone: "file"
  }));
  return entries;
}

export function createActivityJournal(repository, options = {}) {
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const subscribers = new Set();

  function entries() {
    const snapshot = repository.snapshot();
    const nowIso = now().toISOString();
    const combined = [...(snapshot.activities || []), ...derivedEntries(snapshot, nowIso)];
    const unique = combined.filter((entry, index, list) => entry?.id && list.findIndex((candidate) => candidate?.id === entry.id) === index);
    return Object.freeze(unique
      .sort((left, right) => String(right.timestamp || "").localeCompare(String(left.timestamp || "")))
      .slice(0, 120)
      .map((entry) => Object.freeze({ ...entry })));
  }

  function emit() {
    const next = entries();
    subscribers.forEach((subscriber) => subscriber(next));
    return next;
  }

  function record(event) {
    const saved = repository.activities?.record?.(event);
    if (saved?.ok) emit();
    return saved;
  }

  function capture(actionId, actionResult) {
    if (!actionResult?.ok) return null;
    const template = ACTION_EVENTS[actionId];
    if (!template) return null;
    return record({ ...template, timestamp: now().toISOString() });
  }

  function captureRoute(route) {
    const template = ROUTE_EVENTS[route];
    if (!template) return null;
    return record({ source: "ethone", tone: "navigation", ...template, timestamp: now().toISOString() });
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  return Object.freeze({
    entries,
    record,
    capture,
    captureRoute,
    subscribe,
    destroy: () => subscribers.clear(),
    subscriberCount: () => subscribers.size
  });
}
