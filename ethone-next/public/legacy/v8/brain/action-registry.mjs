import { createHomeModel } from "../data/home-model.mjs";

const ROUTES = Object.freeze({ home: "v8.home.open", notes: "v8.notes.open", tasks: "v8.tasks.open", calendar: "v8.calendar.open", files: "v8.files.open", activity: "v8.activity.open", connections: "v8.connections.open", spaces: "v8.spaces.open", flows: "v8.flows.open", brain: "v8.brain.open", mail: "v8.mail.open", settings: "v8.settings.open" });
const SPACES = Object.freeze({ personal: "v8.space.personal", focus: "v8.space.focus", studio: "v8.space.studio" });
const FLOWS = Object.freeze({ essentiel: SPACES.personal, essential: SPACES.personal, focus: SPACES.focus, "deep-work": SPACES.focus, creation: SPACES.studio, studio: SPACES.studio });
const DENSITIES = new Set(["spacious", "comfortable", "compact", "ultra-compact", "automatic"]);
const THEMES = new Set(["night", "graphite", "day", "auto"]);
const ACCENTS = new Set(["mint", "sky", "amber", "violet", "rose"]);
const LOCALES = new Set(["fr", "en", "es", "de"]);
const WIDGETS = new Set(["today", "notes", "calendar", "tasks", "focus", "github", "terminal", "brain", "planning", "discord", "spotify", "sessions", "live", "clips", "projects", "files"]);

const outcome = (ok, status, message, data = null) => Object.freeze({ ok, status, message, data });
const clean = (value, fallback = "", limit = 400) => (String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() || fallback).slice(0, limit);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
const empty = () => ({});

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = globalThis.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function requireId(value) { const id = clean(value, "", 80); if (!id) throw new TypeError("Identifiant requis."); return id; }
function key(value) { return clean(value, "", 80).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function parseSuggestionList(content, fallback = []) {
  if (Array.isArray(content)) return content.map(String).filter(Boolean);
  const text = String(content || "").trim();
  if (!text) return fallback;
  const code = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const inner = code ? code[1].trim() : text;
  try {
    const parsed = JSON.parse(inner);
    if (Array.isArray(parsed) && parsed.length) return parsed.map(String).filter(Boolean);
  } catch {}
  const lines = inner.split(/\n+/).map((line) => line.replace(/^(?:\d+[\.\)]\s*|[\-\*•]\s*)/, "").trim()).filter(Boolean);
  return lines.length ? lines : fallback;
}

export function createBrainActionRegistry(options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const getPreferences = typeof options.getPreferences === "function" ? options.getPreferences : () => ({ permissions: {} });
  const externalServices = options.externalServices || null;
  if (!repository || !actions?.dispatch) throw new TypeError("Brain Action Registry requires repository and actions");
  const definitions = new Map();

  function add(id, title, description, permission, confirmation, parameters, validate, run) {
    definitions.set(id, Object.freeze({ id, title, description, permission, confirmation, parameters: Object.freeze(parameters), validate, run }));
  }
  function profile() {
    const value = repository.activeProfile?.();
    if (!value?.id || !repository.updateProfile) throw new Error("Aucun profil actif.");
    return value;
  }
  function widgetList(value) { return [...new Set((Array.isArray(value) ? value : []).map(String).filter((id) => WIDGETS.has(id)))].slice(0, 12); }
  function updateWidgets(transform) { const active = profile(); return repository.updateProfile(active.id, { widgets: transform(active.environment?.widgets || []) }); }
  function dispatch(id, context = {}) { return actions.dispatch(id, { source: "brain-action", ...context }); }

  add("note.create", "Créer une note", "Ajoute une note au profil actif.", "notes", false, { title: "string", content: "string" }, (p) => ({ title: clean(p.title, "Note Brain", 160), content: clean(p.content, "", 4000) }), (p) => repository.notes.create(p));
  add("note.update", "Modifier une note", "Met a jour une note existante.", "notes", true, { id: "id", title: "string?", content: "string?" }, (p) => { const patch = {}; if (Object.hasOwn(p, "title")) patch.title = clean(p.title, "Note sans titre", 160); if (Object.hasOwn(p, "content")) patch.content = clean(p.content, "", 4000); if (!Object.keys(patch).length) throw new TypeError("Aucune modification fournie."); return { id: requireId(p.id), patch: Object.freeze(patch) }; }, ({ id, patch }) => repository.notes.update(id, patch));
  add("task.create", "Créer une tache", "Ajoute une priorité au profil actif.", "tasks", false, { title: "string", priority: "low|normal|high", due: "date" }, (p) => ({ title: clean(p.title, "Nouvelle tache", 240), priority: ["low", "normal", "high"].includes(p.priority) ? p.priority : "normal", due: validDate(p.due) }), (p) => repository.tasks.create(p));
  add("task.complete", "Terminer une tache", "Marque une tache ouverte comme terminée.", "tasks", true, { id: "id" }, (p) => ({ id: requireId(p.id) }), ({ id }) => { const task = repository.snapshot?.().tasks?.find?.((entry) => String(entry.id) === id); if (!task) throw new Error("Tache introuvable."); return task.done ? outcome(true, "completed", "Tache déjà terminée.", task) : repository.tasks.toggle(id); });
  add("event.create", "Créer un événement", "Ajoute un événement date.", "calendar", false, { title: "string", date: "YYYY-MM-DD" }, (p) => { const date = validDate(p.date); if (!date) throw new TypeError("Date valide requise."); return { title: clean(p.title, "Événement Brain", 180), date }; }, (p) => repository.events.create(p));
  add("page.open", "Ouvrir une page", "Navigue vers une page ETHONE autorisee.", null, false, { route: "route" }, (p) => { if (!ROUTES[p.route]) throw new TypeError("Page non autorisee."); return { route: p.route }; }, ({ route }) => dispatch(ROUTES[route]));
  add("space.change", "Changer de Space", "Active un environnement existant.", "settings", true, { space: "personal|focus|studio" }, (p) => { if (!SPACES[p.space]) throw new TypeError("Space non autorise."); return { space: p.space }; }, ({ space }) => dispatch(SPACES[space]));
  add("flow.change", "Changer de Flow", "Active le Flow correspondant.", "settings", true, { flow: "flow" }, (p) => { const flow = key(p.flow); if (!FLOWS[flow]) throw new TypeError("Flow non autorise."); return { flow }; }, ({ flow }) => dispatch(FLOWS[flow]));
  add("density.change", "Changer la densité", "Applique un mode de densité valide.", "settings", true, { density: "density" }, (p) => { const density = String(p.density || ""); if (!DENSITIES.has(density)) throw new TypeError("Densité non autorisee."); return { density }; }, ({ density }) => dispatch(`v8.density.${density}`));
  add("setting.change", "Changer un réglage", "Modifié une apparence autorisee.", "settings", true, { setting: "thème|accent|density|language", value: "string" }, (p) => { const setting = String(p.setting || ""); const value = String(p.value || "").toLowerCase(); const allowed = setting === "thème" ? THEMES : setting === "accent" ? ACCENTS : setting === "density" ? DENSITIES : setting === "language" ? LOCALES : null; if (!allowed?.has(value)) throw new TypeError("Réglage non autorise."); return { setting, value }; }, ({ setting, value }) => dispatch(setting === "language" ? "v8.locale.set" : `v8.${setting}.${value}`, { locale: value }));
  add("widget.open", "Ouvrir les widgets", "Ouvre le panneau Widgets.", null, false, {}, empty, () => dispatch("v8.widgets.open"));
  add("widget.add", "Ajouter un widget", "Ajoute un widget autorise.", "settings", true, { widget: "widget" }, (p) => { const widget = String(p.widget || ""); if (!WIDGETS.has(widget)) throw new TypeError("Widget non autorise."); return { widget }; }, ({ widget }) => updateWidgets((widgets) => [...new Set([...widgets, widget])]));
  add("widget.remove", "Retirer un widget", "Retire un widget du profil actif.", "settings", true, { widget: "widget" }, (p) => { const widget = String(p.widget || ""); if (!WIDGETS.has(widget)) throw new TypeError("Widget non autorise."); return { widget }; }, ({ widget }) => updateWidgets((widgets) => widgets.filter((id) => id !== widget)));
  add("dashboard.organize", "Organiser le Dashboard", "Applique un ordre de widgets explicite.", "settings", true, { widgets: "widget[]" }, (p) => { const widgets = widgetList(p.widgets); if (!widgets.length) throw new TypeError("Aucun widget autorise."); return { widgets }; }, ({ widgets }) => updateWidgets(() => widgets));
  add("focus.start", "Demarrer Focus", "Active le Space Focus.", "settings", true, {}, empty, () => dispatch(SPACES.focus));
  add("planning.prepare", "Preparer un planning", "Créé des taches et événements valides.", ["tasks", "calendar"], true, { tasks: "task[]", events: "event[]" }, (p) => { const tasks = (Array.isArray(p.tasks) ? p.tasks : []).slice(0, 6).map((item) => ({ title: clean(item?.title, "Priorité", 240), priority: ["low", "normal", "high"].includes(item?.priority) ? item.priority : "normal", due: validDate(item?.due) })); const events = (Array.isArray(p.events) ? p.events : []).slice(0, 6).map((item) => { const date = validDate(item?.date); if (!date) throw new TypeError("Date événement invalide."); return { title: clean(item?.title, "Événement", 180), date }; }); if (!tasks.length && !events.length) throw new TypeError("Planning vide."); return { tasks, events }; }, async ({ tasks, events }) => { const created = []; for (const task of tasks) created.push(await repository.tasks.create(task)); for (const event of events) created.push(await repository.events.create(event)); return outcome(true, "completed", "Planning préparé.", Object.freeze(created)); });
  add("brain.briefing", "Briefing quotidien", "Resumé du jour construit a partir du contexte autorise.", null, false, {}, empty, () => { const model = createHomeModel({ snapshot: repository.snapshot?.() || {}, date: new Date() }); return outcome(true, "completed", model.briefing.title || "Briefing pret", model.briefing); });
  add("brain.wrapup", "Bilan de la journee", "Resume ce qui s'est passe aujourd'hui et prepare demain.", null, false, {}, empty, () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = start + 86400000;
    const snapshot = repository.snapshot?.() || {};
    const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
    const activities = Array.isArray(snapshot.activities) ? snapshot.activities : [];
    const events = Array.isArray(snapshot.events) ? snapshot.events : [];
    const completed = tasks.filter((t) => t?.done === true || t?.completed === true).length;
    const doneToday = tasks.filter((t) => { const at = t?.doneAt || t?.completedAt || t?.updatedAt; return at && (t?.done === true || t?.completed === true) && new Date(at).getTime() >= start && new Date(at).getTime() < end; }).length;
    const todayActivity = activities.filter((a) => { const ts = a?.timestamp; return ts && new Date(ts).getTime() >= start && new Date(ts).getTime() < end; }).length;
    const upcoming = events.filter((e) => new Date(e?.start || e?.date || 0) >= today).slice(0, 3).map((e) => Object.freeze({ title: clean(e?.title, "Événement", 180), date: validDate(e?.start || e?.date) }));
    return outcome(true, "completed", `Bilan pret : ${todayActivity} activite, ${completed} tache, ${upcoming.length} evenement.`, Object.freeze({ todayActivity, completed, doneToday, upcomingEvents: Object.freeze(upcoming), summary: `${todayActivity} activites aujourd'hui, ${completed} taches, ${upcoming.length} evenements a venir.` }));
  });
  add("brain.focus", "Mode Focus", "Active ou desactive le mode Focus.", null, false, {}, empty, () => dispatch("v8.brain.focus-mode.toggle"));
  add("activity.summarize", "Resumer l'activité", "Resume les signaux récents autorises.", "activity", false, {}, empty, () => { const activity = (repository.snapshot?.().activities || []).slice(0, 20); return outcome(true, "completed", "Resume pret.", Object.freeze({ total: activity.length, sources: Object.freeze([...new Set(activity.map((item) => clean(item.source, "ethone", 48)))]), latest: Object.freeze(activity.slice(0, 5).map((item) => Object.freeze({ title: clean(item.title, "Activité", 180), source: clean(item.source, "ethone", 48), timestamp: clean(item.timestamp, "", 40) }))) })); });
  add("automation.propose", "Proposer une automatisation", "Préparé une proposition sans l'executer.", "settings", false, { title: "string", description: "string" }, (p) => ({ title: clean(p.title, "Automatisation proposee", 120), description: clean(p.description, "Aucune execution automatique.", 400) }), (proposal) => outcome(true, "review-required", "Proposition prete.", Object.freeze({ ...proposal, executable: false })));

  // Mail actions.
  add("mail.open", "Ouvrir Mail", "Ouvre la boîte ETHONE Mail.", null, false, {}, empty, () => dispatch(ROUTES.mail));
  add("mail.summarize", "Resumer un email", "Resumer le contenu d'un email.", "mail", false, { messageId: "id" }, (p) => ({ messageId: requireId(p.messageId) }), async ({ messageId }) => {
    const result = await externalServices?.mail?.analyze?.(messageId);
    if (!result || typeof result.data !== "object") return outcome(false, "unavailable", "Analyse indisponible.");
    const summary = clean(result.data?.summary || result.data?.text, "", 2000);
    if (!summary) return outcome(false, "empty", "Aucun résumé généré.");
    return outcome(true, "completed", "Résumé prêt.", Object.freeze({ summary, messageId }));
  });
  add("mail.suggestReply", "Répondre à un email", "Suggère des réponses adaptées à un email.", "mail", false, { messageId: "id", tone: "friendly|professional|short|detailed?" }, (p) => ({ messageId: requireId(p.messageId), tone: ["friendly", "professional", "short", "detailed"].includes(p.tone) ? p.tone : "" }), async ({ messageId, tone }) => {
    const result = await externalServices?.mail?.suggest?.(messageId);
    if (!result) return outcome(false, "unavailable", "Suggestions indisponibles.");
    const suggestions = Array.isArray(result.data) ? result.data : Array.isArray(result.data?.suggestions) ? result.data.suggestions : [];
    if (!suggestions.length) return outcome(false, "empty", "Aucune suggestion générée.");
    if (!tone) return outcome(true, "completed", `${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""} prête${suggestions.length > 1 ? "s" : ""}.`, Object.freeze({ suggestions, messageId }));
    const prompt = `Réécris ces ${suggestions.length} réponses suggérées dans un ton ${tone}. Conserve le sens et les informations essentielles. Réponds avec un tableau JSON de chaînes.\n\n${suggestions.map((s, i) => `${i + 1}. ${String(s).trim()}`).join("\n")}`;
    const completion = await externalServices?.brain?.complete?.({ messages: [{ role: "user", content: prompt }], context: {} });
    const adapted = parseSuggestionList(completion?.data?.content || completion?.data, suggestions);
    return outcome(true, "completed", `${adapted.length} suggestion${adapted.length > 1 ? "s" : ""} dans un ton ${tone}.`, Object.freeze({ suggestions: adapted, messageId, tone }));
  });
  add("mail.extract", "Extraire un email", "Extrait les tâches et événements d'un email.", "mail", false, { messageId: "id" }, (p) => ({ messageId: requireId(p.messageId) }), async ({ messageId }) => {
    const result = await externalServices?.mail?.extract?.(messageId);
    if (!result || typeof result.data !== "object") return outcome(false, "unavailable", "Extraction indisponible.");
    const tasks = Array.isArray(result.data?.tasks) ? result.data.tasks : [];
    const events = Array.isArray(result.data?.events) ? result.data.events : [];
    return outcome(true, "completed", `${tasks.length} tâche${tasks.length > 1 ? "s" : ""} et ${events.length} événement${events.length > 1 ? "s" : ""} extraits.`, Object.freeze({ tasks, events, messageId }));
  });
  add("mail.draft", "Rédiger un email", "Prépare et envoie un email.", "mail", true, { to: "string", subject: "string", content: "string" }, (p) => ({ to: [clean(p.to, "", 320)], subject: clean(p.subject, "Nouveau message", 200), content: clean(p.content, "", 4000) }), async ({ to, subject, content }) => {
    const result = await externalServices?.mail?.send?.({ to, subject, text: content });
    if (!result) return outcome(false, "unavailable", "Envoi indisponible.");
    return outcome(true, "completed", "Email envoyé.", result);
  });
  add("mail.search", "Rechercher un email", "Recherche dans les messages.", "mail", false, { q: "string" }, (p) => ({ q: clean(p.q, "", 120) }), async ({ q }) => {
    const result = await externalServices?.mail?.search?.(q, { limit: 10 });
    if (!result || !Array.isArray(result.data)) return outcome(false, "unavailable", "Recherche indisponible.");
    return outcome(true, "completed", `${result.data.length} résultat${result.data.length > 1 ? "s" : ""}.`, Object.freeze({ q, results: result.data.slice(0, 10).map((m) => ({ id: m.id, subject: clean(m.subject, "", 120), from: clean(m.from_address, "", 120), receivedAt: m.received_at })) }));
  });
  add("mail.template", "Ouvrir un modèle de mail", "Ouvre Mail avec un modèle pré-rempli.", "mail", false, { id: "id?", name: "string?" }, (p) => {
    const id = clean(p.id, "", 80);
    const name = clean(p.name, "", 80);
    if (!id && !name) throw new TypeError("Identifiant ou nom du modèle requis.");
    return { id, name };
  }, async ({ id, name }) => {
    if (!externalServices?.mail?.templates) return outcome(false, "unavailable", "Modèles indisponibles.");
    const result = await externalServices.mail.templates(50);
    const templates = Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
    const template = id ? templates.find((t) => String(t?.id) === id) : templates.find((t) => String(t?.name || "").toLowerCase() === name.toLowerCase());
    if (!template) return outcome(false, "not-found", "Modèle introuvable.");
    if (typeof globalThis !== "undefined") {
      globalThis.__ethoneMailComposeTemplate = Object.freeze({
        id: template.id,
        name: clean(template.name, "", 120),
        subject: clean(template.subject, "", 200),
        content: clean(template.content, "", 4000)
      });
    }
    dispatch(ROUTES.mail);
    return outcome(true, "completed", "Mail ouvert avec le modèle.", Object.freeze({
      id: template.id,
      name: clean(template.name, "", 120),
      subject: clean(template.subject, "", 200),
      content: clean(template.content, "", 4000)
    }));
  });
  add("mail.move", "Deplacer un email", "Deplace un email dans un dossier.", "mail", true, { id: "id", folder: "string" }, (p) => ({ id: requireId(p.id), folder: ["inbox", "starred", "sent", "drafts", "archive", "spam", "trash"].includes(p.folder) ? p.folder : "archive" }), ({ id, folder }) => externalServices?.mail?.move?.([id], folder));
  add("mail.analytics", "Analyser les statistiques mail", "Résume l'activité ETHONE Mail sur une période.", "mail", false, { period: "number?" }, (p) => ({ period: Math.max(1, Math.min(365, Number(p.period) || 30)) }), async ({ period }) => {
    if (!externalServices?.mail?.analytics) return outcome(false, "unavailable", "Analytique Mail indisponible.");
    const result = await externalServices.mail.analytics(period);
    const stats = result?.data || {};
    const total = Number(stats.total) || 0;
    if (!total) return outcome(true, "completed", `Aucun message sur les ${period} derniers jours.`, Object.freeze({ period, total: 0 }));
    const top = Array.isArray(stats.topSenders) && stats.topSenders[0] ? stats.topSenders[0] : null;
    const summary = `${total} messages sur ${period} jours : ${stats.inbound || 0} reçus, ${stats.outbound || 0} envoyés, ${stats.read || 0} lus, ${stats.unread || 0} non lus, ${stats.spam || 0} spam${top ? `. Principal expéditeur : ${clean(top.name || top.email, "", 80)} (${top.count}).` : "."}`;
    return outcome(true, "completed", summary, Object.freeze({ period, ...stats }));
  });
  add("mail.block", "Bloquer un expéditeur", "Bloque un email ou un domaine.", "mail", true, { email: "string?", domain: "string?" }, (p) => {
    const email = clean(p.email, "", 320);
    const domain = clean(p.domain, "", 120).toLowerCase();
    if (!email && !domain) throw new TypeError("Email ou domaine requis.");
    return { email, domain };
  }, async ({ email, domain }) => {
    if (!externalServices?.mail?.blockSender) return outcome(false, "unavailable", "Blocage indisponible.");
    const result = await externalServices.mail.blockSender({ email, domain, reason: "brain" });
    return outcome(true, "completed", "Expéditeur bloqué.", Object.freeze(result?.data || { email, domain }));
  });
  add("mail.trust", "Faire confiance à un expéditeur", "Marque un email ou un domaine comme fiable.", "mail", true, { email: "string?", domain: "string?" }, (p) => {
    const email = clean(p.email, "", 320);
    const domain = clean(p.domain, "", 120).toLowerCase();
    if (!email && !domain) throw new TypeError("Email ou domaine requis.");
    return { email, domain };
  }, async ({ email, domain }) => {
    if (!externalServices?.mail?.trustSender) return outcome(false, "unavailable", "Confiance indisponible.");
    const result = await externalServices.mail.trustSender({ email, domain });
    return outcome(true, "completed", "Expéditeur fiable.", Object.freeze(result?.data || { email, domain }));
  });

  add("mail.account", "Gérer un compte externe mail", "Liste les comptes ou crée un compte externe ETHONE Mail.", "mail", true, { provider: "string", email: "string", label: "string" }, (p) => {
    const provider = clean(p.provider, "", 40);
    const email = clean(p.email, "", 320);
    const label = clean(p.label, "", 80);
    if (email && !email.includes("@")) throw new TypeError("Email invalide.");
    return { provider, email, label };
  }, async ({ provider, email, label }) => {
    const api = externalServices?.mail;
    if (!api?.accounts) return outcome(false, "unavailable", "Comptes externes indisponibles.");
    if (provider && email) {
      if (!api.createAccount) return outcome(false, "unavailable", "Création de compte indisponible.");
      await api.createAccount({ provider, email, label });
    }
    const result = await api.accounts();
    const accounts = Array.isArray(result) ? result : (result?.data || []);
    return outcome(true, "completed", `${accounts.length} compte${accounts.length > 1 ? "s" : ""} externe${accounts.length > 1 ? "s" : ""}.`, Object.freeze(accounts));
  });
  add("mail.pgp.generate", "Générer ou obtenir une clé PGP", "Génère ou récupère une clé PGP pour un email.", "mail", true, { email: "string" }, (p) => {
    const email = clean(p.email, "", 320);
    if (!email || !email.includes("@")) throw new TypeError("Email requis.");
    return { email };
  }, async ({ email }) => {
    const api = externalServices?.mail;
    if (!api?.pgpKeys) return outcome(false, "unavailable", "Clés PGP indisponibles.");
    if (api.createPgpKey) {
      try { await api.createPgpKey({ email }); } catch { /* clé peut déjà exister */ }
    }
    const result = await api.pgpKeys();
    const keys = Array.isArray(result) ? result : (result?.data || []);
    const key = keys.find((k) => (k.email || k.address) === email);
    return outcome(true, "completed", key ? "Clé PGP trouvée." : "Aucune clé PGP.", Object.freeze({ email, key: key || null, keys: keys.slice(0, 20) }));
  });
  add("mail.pgp.encrypt", "Chiffrer un message PGP", "Chiffre un corps de message avec une clé publique.", "mail", true, { body: "string", publicKey: "string" }, (p) => {
    const body = clean(p.body, "", 4000);
    const publicKey = clean(p.publicKey, "", 20000);
    if (!body) throw new TypeError("Contenu requis.");
    if (!publicKey) throw new TypeError("Clé publique requise.");
    return { body, publicKey };
  }, async ({ body, publicKey }) => {
    if (!externalServices?.mail?.pgpEncrypt) return outcome(false, "unavailable", "Chiffrement PGP indisponible.");
    const result = await externalServices.mail.pgpEncrypt({ body, public_key: publicKey });
    return outcome(true, "completed", "Message chiffré.", Object.freeze(result?.data || { body, publicKey }));
  });
  add("mail.pgp.decrypt", "Déchiffrer un message PGP", "Déchiffre un corps de message PGP.", "mail", true, { body: "string", passphrase: "string?" }, (p) => {
    const body = clean(p.body, "", 20000);
    const passphrase = clean(p.passphrase, "", 200);
    if (!body) throw new TypeError("Contenu chiffré requis.");
    return { body, passphrase };
  }, async ({ body, passphrase }) => {
    if (!externalServices?.mail?.pgpDecrypt) return outcome(false, "unavailable", "Déchiffrement PGP indisponible.");
    const result = await externalServices.mail.pgpDecrypt({ body, passphrase });
    return outcome(true, "completed", "Message déchiffré.", Object.freeze(result?.data || { body }));
  });
  add("mail.push.subscribe", "S'abonner aux notifications push", "Souscrit le navigateur aux notifications push ETHONE Mail.", "mail", true, { email: "string?" }, (p) => ({ email: clean(p.email, "", 320) }), async ({ email }) => {
    const api = externalServices?.mail;
    if (!api?.pushVapidKey || !api?.pushSubscribe) return outcome(false, "unavailable", "Push indisponible.");
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.register) return outcome(false, "unavailable", "Service Worker non supporté.");
    const vapidResult = await api.pushVapidKey();
    const vapidKey = vapidResult?.data?.publicKey || vapidResult?.data;
    if (!vapidKey) return outcome(false, "unavailable", "Clé VAPID introuvable.");
    const registration = await navigator.serviceWorker.ready;
    let sub;
    try {
      sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
    } catch (error) {
      return outcome(false, "failed", `Souscription push échouée : ${clean(error?.message, "erreur", 120)}`);
    }
    const json = sub.toJSON();
    const payload = { email, endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, keys: json.keys };
    await api.pushSubscribe(payload);
    return outcome(true, "completed", "Notifications push activées.", Object.freeze(payload));
  });
  add("mail.list", "Gérer une liste de diffusion", "Liste ou crée une liste de diffusion ETHONE Mail.", "mail", true, { name: "string?", description: "string?", address: "string?" }, (p) => ({
    name: clean(p.name, "", 120),
    description: clean(p.description, "", 240),
    address: clean(p.address, "", 120)
  }), async ({ name, description, address }) => {
    const api = externalServices?.mail;
    if (!api?.lists) return outcome(false, "unavailable", "Listes indisponibles.");
    if (name) {
      if (!api.createList) return outcome(false, "unavailable", "Création de liste indisponible.");
      const all = await api.lists();
      const existing = (Array.isArray(all) ? all : (all?.data || [])).find((l) => (l.name || "").toLowerCase() === name.toLowerCase() || (address && l.address === address));
      if (!existing) await api.createList({ name, description, address });
    }
    const result = await api.lists();
    const lists = Array.isArray(result) ? result : (result?.data || []);
    return outcome(true, "completed", `${lists.length} liste${lists.length > 1 ? "s" : ""}.`, Object.freeze(lists));
  });
  add("mail.list.add", "Ajouter un membre à une liste", "Ajoute un contact à une liste de diffusion.", "mail", true, { listId: "id", email: "string", name: "string?" }, (p) => {
    const listId = clean(p.listId, "", 80);
    const email = clean(p.email, "", 320);
    const name = clean(p.name, "", 120);
    if (!listId) throw new TypeError("Liste requise.");
    if (!email || !email.includes("@")) throw new TypeError("Email invalide.");
    return { listId, email, name };
  }, async ({ listId, email, name }) => {
    const api = externalServices?.mail;
    if (!api?.addListMember || !api?.listMembers) return outcome(false, "unavailable", "Membres de liste indisponibles.");
    await api.addListMember({ list_id: listId, email, name });
    const result = await api.listMembers(listId);
    const members = Array.isArray(result) ? result : (result?.data || []);
    return outcome(true, "completed", "Membre ajouté.", Object.freeze({ listId, members }));
  });

  for (const [id, title] of [["connections.analyze", "Analyser les connexions"], ["diagnostic.run", "Lancer un diagnostic"]]) add(id, title, "Interroge le Worker a la demande.", "connections", false, {}, empty, () => externalServices?.diagnostic ? externalServices.diagnostic() : outcome(false, "unavailable", "Diagnostic indisponible."));

  add("brain.notifications", "Resumer les notifications", "Liste les notifications non lues et importantes.", "brain", false, { markRead: "string?", markImportant: "string?" }, (p) => ({ markRead: clean(p.markRead, "", 64) || undefined, markImportant: clean(p.markImportant, "", 64) || undefined }), async ({ markRead, markImportant }) => {
    if (markRead) {
      dispatch("v8.notifications.dismiss", { id: markRead });
      return outcome(true, "completed", "Notification marquee lue.", { id: markRead });
    }
    if (markImportant) {
      dispatch("v8.notifications.markImportant", { id: markImportant });
      return outcome(true, "completed", "Notification marquee importante.", { id: markImportant });
    }
    const summary = dispatch("v8.notifications.summary");
    const important = dispatch("v8.notifications.important");
    return outcome(true, "completed", `Vous avez ${summary?.data?.unread ?? 0} notification(s) non lue(s), dont ${important?.data?.count ?? 0} importante(s).`, Object.freeze({ summary: summary?.data || null, important: important?.data || null }));
  });

  add("brain.notify", "Afficher une notification", "Affiche une notification toast ou centre.", "brain", false, { notice: "object" }, (p) => {
    const notice = typeof p.notice === "object" && p.notice !== null ? p.notice : {};
    return { notice };
  }, async ({ notice }) => dispatch("v8.notify", { notice }));

  function review(id, parameters = {}) {
    const definition = definitions.get(String(id || ""));
    if (!definition) return outcome(false, "unavailable", "Action Brain non autorisee.");
    const permissions = Array.isArray(definition.permission) ? definition.permission : definition.permission ? [definition.permission] : [];
    const denied = permissions.find((permission) => getPreferences()?.permissions?.[permission] !== true);
    if (denied) return outcome(false, "permission-denied", `Acces ${denied} desactive.`);
    try {
      const validated = Object.freeze(definition.validate(parameters && typeof parameters === "object" ? parameters : {}));
      return outcome(true, definition.confirmation ? "confirmation-required" : "ready", definition.description, Object.freeze({ definition, parameters: validated }));
    } catch (error) { return outcome(false, "invalid", clean(error?.message, "Paramètrès invalides.", 200), error); }
  }

  async function execute(id, parameters = {}, execution = {}) {
    const reviewed = review(id, parameters);
    if (!reviewed.ok || (reviewed.data.definition.confirmation && execution.confirmed !== true)) return reviewed;
    try {
      const response = await reviewed.data.definition.run(reviewed.data.parameters);
      return response && typeof response === "object" && Object.hasOwn(response, "ok") ? response : outcome(true, "completed", "Action terminée.", response ?? null);
    } catch (error) { return outcome(false, "failed", clean(error?.message, "Action Brain échouée.", 200), error); }
  }

  return Object.freeze({ review, execute, definitions: () => Object.freeze([...definitions.values()]), diagnostics: () => Object.freeze({ actions: definitions.size, arbitraryExecution: false }) });
}
