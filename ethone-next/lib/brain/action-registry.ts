import { type BrainPermissions } from "./preferences";

type ActionHandler = (parameters: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;

export type BrainActionDefinition = {
  id: string;
  title: string;
  description: string;
  permission: BrainPermission | BrainPermission[] | null;
  confirmation: boolean;
  parameters: Record<string, string>;
  run: ActionHandler;
};

type BrainPermission = keyof BrainPermissions;

function clean(value: unknown, fallback = "", limit = 400): string {
  return (String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || fallback).slice(0, limit);
}

function requireId(value: unknown): string {
  const id = clean(value, "", 80);
  if (!id) throw new Error("Identifiant requis.");
  return id;
}

function validDate(value: unknown): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
}

function outcome(ok: boolean, message: string) {
  return Object.freeze({ ok, message });
}

export function createBrainActionRegistry(options: {
  permissions: BrainPermissions;
  createNote: (input: { title: string; body: string }) => Promise<unknown>;
  updateNote: (id: string, patch: { title?: string; body?: string }) => Promise<unknown>;
  createTask: (input: { title: string; priority?: string; due?: string }) => Promise<unknown>;
  completeTask: (id: string) => Promise<unknown>;
  createEvent: (input: { title: string; date: string }) => Promise<unknown>;
  changeSetting: (setting: string, value: string) => Promise<unknown>;
  navigate: (route: string) => void;
}) {
  const definitions = new Map<string, BrainActionDefinition>();

  function add(
    id: string,
    title: string,
    description: string,
    permission: BrainPermission | BrainPermission[] | null,
    confirmation: boolean,
    parameters: Record<string, string>,
    run: ActionHandler
  ) {
    definitions.set(id, { id, title, description, permission, confirmation, parameters, run });
  }

  add(
    "note.create",
    "Créer une note",
    "Ajoute une note.",
    "notes",
    false,
    { title: "string", content: "string" },
    async (p) => {
      await options.createNote({ title: clean(p.title, "Note Brain", 160), body: clean(p.content, "", 4000) });
      return outcome(true, "Note créée.");
    }
  );

  add(
    "note.update",
    "Modifier une note",
    "Met à jour une note.",
    "notes",
    true,
    { id: "id", title: "string?", content: "string?" },
    async (p) => {
      const patch: { title?: string; body?: string } = {};
      if (Object.hasOwn(p, "title")) patch.title = clean(p.title, "Note sans titre", 160);
      if (Object.hasOwn(p, "content")) patch.body = clean(p.content, "", 4000);
      await options.updateNote(requireId(p.id), patch);
      return outcome(true, "Note mise à jour.");
    }
  );

  add(
    "task.create",
    "Créer une tâche",
    "Ajoute une tâche.",
    "tasks",
    false,
    { title: "string", priority: "low|normal|high", due: "date" },
    async (p) => {
      await options.createTask({
        title: clean(p.title, "Nouvelle tâche", 240),
        priority: ["low", "normal", "high"].includes(String(p.priority)) ? String(p.priority) : "normal",
        due: validDate(p.due),
      });
      return outcome(true, "Tâche créée.");
    }
  );

  add(
    "task.complete",
    "Terminer une tâche",
    "Marque une tâche comme terminée.",
    "tasks",
    true,
    { id: "id" },
    async (p) => {
      await options.completeTask(requireId(p.id));
      return outcome(true, "Tâche terminée.");
    }
  );

  add(
    "event.create",
    "Créer un événement",
    "Ajoute un événement.",
    "calendar",
    false,
    { title: "string", date: "YYYY-MM-DD" },
    async (p) => {
      const date = validDate(p.date);
      if (!date) throw new Error("Date valide requise.");
      await options.createEvent({ title: clean(p.title, "Événement Brain", 180), date });
      return outcome(true, "Événement créé.");
    }
  );

  add(
    "setting.change",
    "Changer un réglage",
    "Modifie un réglage autorisé.",
    "settings",
    true,
    { setting: "thème|accent|density|language", value: "string" },
    async (p) => {
      await options.changeSetting(String(p.setting), String(p.value));
      return outcome(true, "Réglage appliqué.");
    }
  );

  add(
    "page.open",
    "Ouvrir une page",
    "Navigue vers une page.",
    null,
    false,
    { route: "route" },
    async (p) => {
      options.navigate(String(p.route));
      return outcome(true, "Navigation effectuée.");
    }
  );

  add(
    "planning.prepare",
    "Préparer un planning",
    "Crée des tâches et événements.",
    ["tasks", "calendar"],
    true,
    { tasks: "task[]", events: "event[]" },
    async (p) => {
      const tasks = (Array.isArray(p.tasks) ? p.tasks : []).slice(0, 6).map((item) => ({
        title: clean(item?.title, "Priorité", 240),
        priority: ["low", "normal", "high"].includes(item?.priority) ? item.priority : "normal",
        due: validDate(item?.due),
      }));
      const events = (Array.isArray(p.events) ? p.events : []).slice(0, 6).map((item) => {
        const date = validDate(item?.date);
        if (!date) throw new Error("Date événement invalide.");
        return { title: clean(item?.title, "Événement", 180), date };
      });
      for (const task of tasks) await options.createTask(task);
      for (const event of events) await options.createEvent(event);
      return outcome(true, `${tasks.length} tâches et ${events.length} événements créés.`);
    }
  );

  function review(id: string) {
    const definition = definitions.get(String(id || ""));
    if (!definition) return outcome(false, "Action Brain non autorisée.");
    const permissions = Array.isArray(definition.permission) ? definition.permission : definition.permission ? [definition.permission] : [];
    const denied = permissions.find((permission) => options.permissions[permission] !== true);
    if (denied) return outcome(false, `Accès ${denied} désactivé.`);
    return outcome(true, definition.description);
  }

  async function execute(id: string, parameters: Record<string, unknown> = {}, confirmed = false) {
    const definition = definitions.get(String(id || ""));
    if (!definition) return outcome(false, "Action Brain non autorisée.");
    if (definition.confirmation && !confirmed) return outcome(false, "Confirmation requise.");
    try {
      return await definition.run(parameters);
    } catch (error) {
      return outcome(false, error instanceof Error ? error.message : "Action Brain échouée.");
    }
  }

  return {
    review,
    execute,
    definitions: () => [...definitions.values()],
  };
}
