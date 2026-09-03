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

export type BrainMailClient = {
  analyzeMessage: (id: string) => Promise<{ data?: { summary?: string; text?: string } }>;
  suggestReplies: (id: string) => Promise<{ data?: { suggestions?: string[] } }>;
  sendMail: (input: { to: string[]; subject: string; text?: string }) => Promise<unknown>;
  moveMessages: (ids: string[], folder: string) => Promise<unknown>;
  getAnalytics: (period?: number) => Promise<{ data?: Record<string, unknown> }>;
  blockSender: (input: { email?: string; domain?: string; reason?: string }) => Promise<unknown>;
  trustSender: (input: { email?: string; domain?: string }) => Promise<unknown>;
  search: (q: string) => Array<{ id: string; subject?: string; from?: string; receivedAt?: string }>;
};

export function createBrainActionRegistry(options: {
  permissions: BrainPermissions;
  createNote: (input: { title: string; body: string }) => Promise<unknown>;
  updateNote: (id: string, patch: { title?: string; body?: string }) => Promise<unknown>;
  createTask: (input: { title: string; priority?: string; due?: string }) => Promise<unknown>;
  completeTask: (id: string) => Promise<unknown>;
  createEvent: (input: { title: string; date: string }) => Promise<unknown>;
  changeSetting: (setting: string, value: string) => Promise<unknown>;
  navigate: (route: string) => void;
  startFocus?: (preset: string) => void;
  stopFocus?: () => void;
  selectTheme?: (themeId: string) => void;
  selectAccent?: (accentId: string) => void;
  mailClient?: BrainMailClient;
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
    "focus.start",
    "Lancer une session Focus",
    "Démarre un chronomètre de concentration.",
    null,
    false,
    { preset: "pomodoro|deep|sprint" },
    async (p) => {
      const preset = ["pomodoro", "deep", "sprint"].includes(String(p.preset)) ? String(p.preset) : "pomodoro";
      if (options.startFocus) {
        options.startFocus(preset);
        return outcome(true, `Session Focus (${preset}) démarrée.`);
      }
      options.navigate("focus");
      return outcome(true, "Page Focus ouverte.");
    }
  );

  add(
    "focus.stop",
    "Arrêter la session Focus",
    "Stoppe le chronomètre Focus actif.",
    null,
    false,
    {},
    async () => {
      if (options.stopFocus) {
        options.stopFocus();
        return outcome(true, "Session Focus arrêtée.");
      }
      return outcome(true, "Focus arrêté.");
    }
  );

  add(
    "theme.switch",
    "Changer de thème",
    "Bascule vers un thème visuel du Theme Engine 3.0.",
    "settings",
    false,
    { themeId: "string" },
    async (p) => {
      const themeId = clean(p.themeId, "obsidian", 40);
      if (options.selectTheme) {
        options.selectTheme(themeId);
        return outcome(true, `Thème "${themeId}" appliqué.`);
      }
      await options.changeSetting("theme", themeId);
      return outcome(true, `Thème "${themeId}" sélectionné.`);
    }
  );

  add(
    "accent.switch",
    "Changer de couleur d'accent",
    "Modifie la couleur d'accent universelle.",
    "settings",
    false,
    { accentId: "string" },
    async (p) => {
      const accentId = clean(p.accentId, "violet", 40);
      if (options.selectAccent) {
        options.selectAccent(accentId);
        return outcome(true, `Accent "${accentId}" appliqué.`);
      }
      await options.changeSetting("accentColor", accentId);
      return outcome(true, `Accent "${accentId}" sélectionné.`);
    }
  );

  add(
    "files.upload",
    "Téléverser un fichier",
    "Ouvre la boîte de dialogue d'importation de documents.",
    null,
    false,
    {},
    async () => {
      options.navigate("files");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("v8:trigger-upload"));
      }
      return outcome(true, "Explorateur de fichiers prêt pour téléversement.");
    }
  );

  add(
    "mail.compose",
    "Rédiger un nouvel email",
    "Ouvre l'éditeur de courrier sortant.",
    "mail",
    false,
    {},
    async () => {
      options.navigate("mail");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("v8:compose-mail"));
      }
      return outcome(true, "Boîte de rédaction d'email ouverte.");
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

  const mail = options.mailClient;

  add(
    "mail.open",
    "Ouvrir Mail",
    "Ouvre la boîte ETHONE Mail.",
    null,
    false,
    {},
    async () => {
      options.navigate("mail");
      return outcome(true, "Mail ouvert.");
    }
  );

  add(
    "mail.summarize",
    "Résumer un email",
    "Résume le contenu d'un email.",
    "mail",
    false,
    { messageId: "id" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const result = await mail.analyzeMessage(requireId(p.messageId));
      const data = result?.data || {};
      const summary = clean(data.summary || data.text, "", 2000);
      return outcome(true, summary || "Résumé indisponible.");
    }
  );

  add(
    "mail.suggestReply",
    "Répondre à un email",
    "Suggère des réponses adaptées à un email.",
    "mail",
    false,
    { messageId: "id", tone: "friendly|professional|short|detailed?" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const result = await mail.suggestReplies(requireId(p.messageId));
      const data = result?.data || {};
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      return outcome(true, `${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""}.`);
    }
  );

  add(
    "mail.draft",
    "Rédiger un email",
    "Prépare et envoie un email.",
    "mail",
    true,
    { to: "string", subject: "string", content: "string" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      await mail.sendMail({
        to: [clean(p.to, "", 320)],
        subject: clean(p.subject, "Nouveau message", 200),
        text: clean(p.content, "", 4000),
      });
      return outcome(true, "Email envoyé.");
    }
  );

  add(
    "mail.search",
    "Rechercher un email",
    "Recherche dans les messages.",
    "mail",
    false,
    { q: "string" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const q = clean(p.q, "", 120).toLowerCase();
      const results = mail.search(q).slice(0, 10);
      return outcome(true, `${results.length} résultat${results.length > 1 ? "s" : ""}.`);
    }
  );

  add(
    "mail.move",
    "Déplacer un email",
    "Déplace un email dans un dossier.",
    "mail",
    true,
    { id: "id", folder: "string" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const target = ["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"].includes(String(p.folder))
        ? String(p.folder)
        : "archive";
      await mail.moveMessages([requireId(p.id)], target);
      return outcome(true, `Déplacé vers ${target}.`);
    }
  );

  add(
    "mail.analytics",
    "Analyser les statistiques mail",
    "Résume l'activité ETHONE Mail sur une période.",
    "mail",
    false,
    { period: "number?" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const period = Math.max(1, Math.min(365, Number(p.period) || 30));
      const result = await mail.getAnalytics(period);
      const stats = result?.data || {};
      const total = Number(stats.total) || 0;
      const summary = `${total} messages sur ${period} jours : ${stats.inbound || 0} reçus, ${stats.outbound || 0} envoyés, ${stats.unread || 0} non lus.`;
      return outcome(true, summary);
    }
  );

  add(
    "mail.block",
    "Bloquer un expéditeur",
    "Bloque un email ou un domaine.",
    "mail",
    true,
    { email: "string?", domain: "string?" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const email = clean(p.email, "", 320);
      const domain = clean(p.domain, "", 120).toLowerCase();
      if (!email && !domain) throw new Error("Email ou domaine requis.");
      await mail.blockSender({ email, domain, reason: "brain" });
      return outcome(true, "Expéditeur bloqué.");
    }
  );

  add(
    "mail.trust",
    "Faire confiance à un expéditeur",
    "Marque un email ou un domaine comme fiable.",
    "mail",
    true,
    { email: "string?", domain: "string?" },
    async (p) => {
      if (!mail) return outcome(false, "Mail non configuré.");
      const email = clean(p.email, "", 320);
      const domain = clean(p.domain, "", 120).toLowerCase();
      if (!email && !domain) throw new Error("Email ou domaine requis.");
      await mail.trustSender({ email, domain });
      return outcome(true, "Expéditeur fiable.");
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
