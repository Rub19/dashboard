const outcome = (ok, status, message, data = null) => Object.freeze({ ok, status, message, data });
const clean = (value, fallback = "", limit = 600) => (String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() || fallback).slice(0, limit);

function contextualReply(query, scope) {
  const intent = query.toLowerCase();
  const data = scope.context || {};
  if (/^\s*(bonjour|salut|coucou|hello|hey|yo)\b/.test(intent)) return `Bonjour ! Je suis pret dans ${scope.workspace?.space || "l'espace actif"}. Comment puis-je vous aider ?`;
  if (/\b(ca|ça) va\b/.test(intent)) return "Je vais bien, merci. Et vous ? Je peux vous aider avec vos tâches, notes, calendrier ou réglages.";
  if (/\bcomment tu t'appelle|ton nom\b/.test(intent)) return "Je suis Brain, l'assistant contextuel d'ETHONE.";
  if (/tache|task|priorit/.test(intent)) return data.tasks?.length ? `${data.tasks.length} priorite${data.tasks.length > 1 ? "s" : ""}. Prochaine : « ${data.tasks[0].title} ».` : "Aucune priorité ouverte. Je peux en créer une.";
  if (/note|resume|résume/.test(intent)) return data.notes?.length ? `${data.notes.length} note${data.notes.length > 1 ? "s" : ""} recente${data.notes.length > 1 ? "s" : ""}. Titres et metadonnees uniquement.` : "Aucune note autorisee ici.";
  if (/agenda|calendrier|evenement/.test(intent)) return data.events?.length ? `Prochain evenement : « ${data.events[0].title} », le ${data.events[0].date}.` : "Aucun événement a venir n'est visible.";
  if (/connexion|sync|supabase/.test(intent)) return data.connections?.length ? `${data.connections.length} connexion${data.connections.length > 1 ? "s" : ""}, etat technique uniquement.` : "Connexions non chargees ou non autorisees.";
  if (/r[ée]sumer.*email|r[ée]sum[ée].*email|resume.*message|resumé.*message|résumé.*message/i.test(intent)) {
    const summary = data.mailSummary || data.mail?.[0]?.summary;
    return summary ? clean(summary, "Résumé disponible.", 800) : "Aucun résumé d'email disponible. Ouvrez un email et demandez 'Résumé'.";
  }
  if (/r[ée]ponse.*sugg[ée]r[ée]?|suggestion.*r[ée]ponse|r[ée]pondre.*email/i.test(intent)) return "Je peux proposer des réponses. Ouvrez un email et demandez 'Réponses suggérées'.";
  if (/extraire.*t[âa]che|extraire.*[ée]v[ée]nement|t[âa]che.*email|t[âa]ches.*email/i.test(intent)) {
    const extracted = data.mailExtracted || data.mail?.[0]?.extracted;
    const tasks = Array.isArray(extracted?.tasks) ? extracted.tasks : [];
    const events = Array.isArray(extracted?.events) ? extracted.events : [];
    if (!tasks.length && !events.length) return "Aucune tâche ou événement extrait. Ouvrez un email et demandez 'Extraire'.";
    const parts = [];
    if (tasks.length) parts.push(`${tasks.length} tâche${tasks.length > 1 ? "s" : ""} : ${tasks.slice(0, 3).map((t) => clean(t.title, "(sans titre)", 60)).join(", ")}`);
    if (events.length) parts.push(`${events.length} événement${events.length > 1 ? "s" : ""} : ${events.slice(0, 3).map((e) => clean(e.title, "(sans titre)", 60)).join(", ")}`);
    return `${parts.join(" ; ")}.`;
  }
  if (/\b(mail|email|courriel|message|boite)\b/.test(intent)) return data.mail?.length ? `${data.mail.length} email${data.mail.length > 1 ? "s" : ""}. Dernier : « ${data.mail[0].subject} ».` : "Aucun email visible.";
  if (/densite|density|interface|reglage/.test(intent)) return data.settings ? `Mode ${data.settings.density}. Toute modification exige confirmation.` : "Ouvrez Réglages pour analyser l'apparence.";
  const counts = [[data.tasks, "priorités"], [data.notes, "notes"], [data.events, "événements"]].filter(([items]) => items?.length).map(([items, label]) => `${items.length} ${label}`);
  const space = scope.workspace?.space || "l'espace actif";
  return `Je suis sur ${scope.route || "home"}, dans ${space}. ${counts.length ? `Contexte minimal : ${counts.join(", ")}.` : "Le contexte reste volontairement minimal."}`;
}

export function createBrainController(options = {}) {
  const contextEngine = options.contextEngine;
  const providerManager = options.providerManager;
  const actionRegistry = options.actionRegistry;
  const getPreferences = typeof options.getPreferences === "function" ? options.getPreferences : () => ({ enabled: true, provider: { active: "context", fallback: "context" } });
  const presence = options.presence || null;
  if (!contextEngine || !providerManager || !actionRegistry) throw new TypeError("Brain Controller requires context, provider and action services");
  const listeners = new Set();
  const history = [];
  let generation = 0;
  let pending = 0;
  let sequence = 0;

  function publish(event) { listeners.forEach((listener) => { try { listener(event); } catch {} }); }
  function append(role, content, meta = {}) {
    const entry = Object.freeze({ id: `brain-${++sequence}`, role, content: clean(content, "", 1200), at: new Date().toISOString(), ...meta });
    history.push(entry);
    if (history.length > 60) history.splice(0, history.length - 60);
    publish(Object.freeze({ type: "history", entry, history: Object.freeze(history.slice()) }));
    return entry;
  }

  async function ask(query) {
    const prompt = clean(query, "", 500);
    if (!prompt) return outcome(false, "invalid", "Ecrivez une demande concise.");
    const preferences = getPreferences();
    if (preferences.enabled === false) return outcome(false, "disabled", "Brain est desactive.");
    const requestId = ++generation;
    providerManager.cancelActive?.();
    pending += 1;
    try {
      append("user", prompt);
      presence?.setBrain?.("thinking");
      publish(Object.freeze({ type: "status", status: "thinking" }));
      const context = contextEngine.build({ intent: prompt });
      let answer = "";
      let provider = "context";
      if (preferences.provider?.active && preferences.provider.active !== "context") {
        const remote = await providerManager.complete({ messages: history.slice(-8), context });
        if (requestId !== generation) return outcome(false, "stale", "Demande remplacee.");
        if (remote.ok && remote.data?.content) {
          answer = clean(remote.data.content, "", 1200);
          provider = preferences.provider.active;
        } else if (preferences.provider?.fallback !== "context") {
          presence?.setBrain?.("ready");
          publish(Object.freeze({ type: "status", status: "error" }));
          return remote;
        }
      }
      if (!answer) answer = contextualReply(prompt, context);
      const sources = context.sources.filter((source) => source.active && source.count > 0).map((source) => source.id);
      const entry = append("assistant", answer, { provider, sources });
      presence?.setBrain?.("responding", { settleAfter: 900 });
      publish(Object.freeze({ type: "status", status: "ready" }));
      return outcome(true, "completed", "Réponse Brain prete.", Object.freeze({ entry, context }));
    } catch (error) {
      presence?.setBrain?.("ready");
      publish(Object.freeze({ type: "status", status: "error" }));
      return outcome(false, "failed", clean(error?.message, "Brain indisponible.", 200), error);
    } finally { pending = Math.max(0, pending - 1); }
  }

  function suggestions() {
    const preferences = getPreferences();
    if (preferences.enabled === false || preferences.proactive === false || preferences.suggestionFrequency === "off") return Object.freeze([]);
    const context = contextEngine.build({ intent: "suggestions" });
    const output = [];
    if (context.route === "settings") output.push({ id: "density-compact", title: "Ajuster la densité", detail: "Previsualiser le mode compact.", action: "density.change", parameters: { density: "compact" } });
    if (["home", "brain"].includes(context.route)) output.push({ id: "open-widgets", title: "Composer le Dashboard", detail: "Ouvrir les widgets.", action: "widget.open", parameters: {} });
    output.push(context.context.tasks?.length
      ? { id: "open-tasks", title: "Reprendre la priorité", detail: context.context.tasks[0].title, action: "page.open", parameters: { route: "tasks" } }
      : { id: "new-task", title: "Créer une priorité", detail: "Ajouter la prochaine action.", action: "task.create", parameters: { title: "Nouvelle priorité" } });
    output.push({ id: "capture-note", title: "Capturer le contexte", detail: "Créer une note courte.", action: "note.create", parameters: { title: "Contexte du jour" } });
    return Object.freeze(output.slice(0, 4).map(Object.freeze));
  }

  function subscribe(listener) { if (typeof listener !== "function") return () => false; listeners.add(listener); return () => listeners.delete(listener); }
  function clearHistory() { history.length = 0; publish(Object.freeze({ type: "history", history: Object.freeze([]) })); }
  function destroy() { generation += 1; pending = 0; listeners.clear(); providerManager.destroy?.(); }
  return Object.freeze({ ask, suggestions, execute: actionRegistry.execute, review: actionRegistry.review, subscribe, history: () => Object.freeze(history.slice()), clearHistory, diagnostics: () => Object.freeze({ history: history.length, listeners: listeners.size, pendingRequests: pending, requestGeneration: generation }), destroy });
}
