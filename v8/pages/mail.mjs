import { actionButton, element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";

const FOLDERS = [
  { key: "inbox", label: "Boîte de réception", icon: "inbox" },
  { key: "starred", label: "Favoris", icon: "star" },
  { key: "sent", label: "Envoyés", icon: "send" },
  { key: "drafts", label: "Brouillons", icon: "file-text" },
  { key: "archive", label: "Archive", icon: "archive" },
  { key: "spam", label: "Spam", icon: "shield-alert" },
  { key: "trash", label: "Corbeille", icon: "trash-2" }
];

const MAIL_ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "PRE", "CODE", "A"]);
const MAIL_ALLOWED_ATTRS = { A: new Set(["href", "target", "rel"]) };
const MAIL_STRIP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "FORM", "INPUT", "BUTTON", "LINK", "META", "BASE", "IMG", "VIDEO", "AUDIO", "SOURCE", "NOSCRIPT"]);

function formatMailDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
  if (isToday) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatFullDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR");
}

function text2br(text) {
  return String(text || "").replace(/\n/g, "<br>");
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function splitAddresses(value) {
  return String(value || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sanitizeMailHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      const tag = child.tagName;
      if (MAIL_STRIP.has(tag)) {
        child.remove();
        return;
      }
      if (!MAIL_ALLOWED_TAGS.has(tag)) {
        walk(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }
      const allowed = MAIL_ALLOWED_ATTRS[tag];
      [...child.attributes].forEach((attr) => {
        if (!allowed || !allowed.has(attr.name.toLowerCase())) child.removeAttribute(attr.name);
      });
      if (tag === "A") {
        const href = child.getAttribute("href") || "";
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
        if (!/^(https?|mailto):/i.test(href)) child.removeAttribute("href");
      }
      walk(child);
    });
  }
  walk(doc.body);
  return doc.body.innerHTML;
}

function quoteOriginal(message, isForward = false) {
  const from = message.from_name || message.from_address || "Inconnu";
  const date = formatFullDate(message.received_at || message.created_at);
  const prefix = isForward ? "Message transféré" : `Le ${date}, ${from} a écrit :`;
  const body = sanitizeMailHtml(message.body_html || text2br(message.body_text || ""));
  return `<blockquote class="v8-mail-quote"><p><strong>${prefix}</strong></p>${body}</blockquote>`;
}

function errorDescription(error) {
  if (error?.name === "TimeoutError" || /timeout|délai/i.test(String(error?.message))) return "Le Worker met trop de temps à répondre. Vérifiez le déploiement.";
  if (error?.status === 401 || error?.code === "AUTH_REQUIRED") return "Votre session a expiré. Reconnectez-vous.";
  if (error?.status === 404 || error?.code === "ROUTE_NOT_FOUND" || /route introuvable/i.test(String(error?.message))) return "La route Mail n'est pas encore déployée sur le Worker.";
  if (error?.status === 500 || error?.code === "SERVICE_ERROR") return "Erreur côté Worker. Vérifiez que la migration Supabase est exécutée.";
  return String(error?.message || "Erreur inconnue");
}

function getFromAddress(message) {
  return message.from_address || (message.from && typeof message.from === "object" ? (message.from.address || message.from.email || "") : "") || "";
}

export function mountMail(stage, options = {}) {
  const mailApi = options?.externalServices?.mail || null;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const repository = options?.repository || null;

  if (!mailApi) {
    stage.replaceChildren(statusState("integration", {
      title: "Service Mail non configuré",
      description: "Connectez ETHONE Mail pour accéder à vos messages.",
      compact: false
    }));
    refreshIcons();
    return () => stage.replaceChildren();
  }

  const state = {
    folder: "inbox",
    view: "list",
    messages: [],
    selected: null,
    query: "",
    isSearch: false,
    labels: [],
    contacts: [],
    signatures: [],
    alias: null,
    counts: {},
    loading: false,
    notifications: [],
    unreadCount: 0,
    rules: [],
    notificationOpen: false
  };

  let searchTimer = null;
  let draftTimer = null;
  let composeRoot = null;
  let composeEditor = null;
  let composeDraftId = null;
  let composeInReplyTo = null;
  let composeReferences = null;
  let composeAttachments = [];

  const page = element("section", { className: "v8-page v8-mail", dataset: { page: "mail" } });
  const layout = element("div", { className: "v8-mail-layout is-list" });
  const sidebar = element("aside", { className: "v8-mail-sidebar" });
  const listWrap = element("section", { className: "v8-mail-list-wrap" });
  const reading = element("section", { className: "v8-mail-reading" });
  layout.append(sidebar, listWrap, reading);
  page.append(layout);

  const listTitle = element("span", { className: "v8-mail-list-title" });
  const searchInput = element("input", {
    className: "v8-input v8-mail-search",
    attributes: { type: "search", placeholder: "Rechercher...", "aria-label": "Rechercher un message" }
  });
  const menuButton = element("button", {
    className: "v8-icon-button v8-mail-menu",
    attributes: { type: "button", "aria-label": "Dossiers" }
  }, [icon("menu")]);
  const newBtn = actionButton({ actionId: "v8.mail.compose", variant: "primary" }, [icon("plus"), element("span", { text: "Nouveau" })]);
  const bellBadge = element("span", { className: "v8-mail-bell__badge" });
  const bellBtn = element("button", {
    className: "v8-icon-button v8-mail-bell",
    attributes: { type: "button", "aria-label": "Notifications" }
  }, [icon("bell"), bellBadge]);
  const listHeader = element("header", { className: "v8-mail-list-header" }, [menuButton, listTitle, searchInput, bellBtn, newBtn]);
  const messageList = element("ul", { className: "v8-mail-list" });
  listWrap.append(listHeader, messageList);

  menuButton.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  newBtn.addEventListener("click", () => openCompose());
  bellBtn.addEventListener("click", toggleNotifications);

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (!q) {
      state.isSearch = false;
      state.query = "";
      loadFolder();
      return;
    }
    state.query = q;
    state.isSearch = true;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadSearch(), 300);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (searchTimer) clearTimeout(searchTimer);
      loadSearch();
    }
  });

  stage.replaceChildren(page);

  async function loadAlias() {
    try {
      const result = await mailApi.alias();
      state.alias = result?.data || result || null;
    } catch {
      state.alias = null;
    }
  }

  async function loadLabels() {
    try {
      const result = await mailApi.labels();
      state.labels = result?.data || result || [];
    } catch {
      state.labels = [];
    }
  }

  async function loadContacts() {
    try {
      const result = await mailApi.contacts({ limit: 200 });
      state.contacts = result?.data || result || [];
    } catch {
      state.contacts = [];
    }
  }

  async function loadSignatures() {
    try {
      const result = await mailApi.signatures();
      state.signatures = result?.data || result || [];
    } catch {
      state.signatures = [];
    }
  }

  function renderBell() {
    const count = state.unreadCount || 0;
    bellBadge.textContent = count ? String(count) : "";
    bellBadge.classList.toggle("is-empty", !count);
  }

  function toggleNotifications() {
    state.notificationOpen = !state.notificationOpen;
    if (window.innerWidth < 1024) sidebar.classList.add("is-open");
    renderSidebar();
  }

  async function loadNotifications() {
    if (!mailApi?.notifications) {
      state.notifications = [];
      state.unreadCount = 0;
      renderBell();
      return;
    }
    try {
      const [unreadResult, allResult] = await Promise.all([
        mailApi.notifications({ unread: true, limit: 50 }),
        mailApi.notifications({ limit: 20 })
      ]);
      const unreadData = Array.isArray(unreadResult) ? unreadResult : (unreadResult?.data || []);
      const allData = Array.isArray(allResult) ? allResult : (allResult?.data || []);
      state.unreadCount = unreadResult?.count ?? unreadResult?.unread_count ?? unreadData.length;
      state.notifications = allData;
    } catch (error) {
      notify({ type: "error", title: "Notifications", message: errorDescription(error) });
      state.notifications = [];
      state.unreadCount = 0;
    }
    renderBell();
    renderSidebar();
  }

  async function markNotificationRead(notification) {
    if (!notification || notification.is_read) return;
    if (!mailApi?.markNotificationRead) return;
    try {
      await mailApi.markNotificationRead(notification.id, true);
      notification.is_read = true;
      state.unreadCount = Math.max(0, state.unreadCount - 1);
      renderBell();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Notification", message: errorDescription(error) });
    }
  }

  async function loadRules() {
    if (!mailApi?.rules) {
      state.rules = [];
      return;
    }
    try {
      const result = await mailApi.rules(50);
      state.rules = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      notify({ type: "error", title: "Règles", message: errorDescription(error) });
      state.rules = [];
    }
    renderSidebar();
  }

  async function saveRule(payload) {
    if (!mailApi?.saveRule) return;
    try {
      await mailApi.saveRule(payload);
      notify({ type: "success", title: "Règle", message: "Règle enregistrée." });
      await loadRules();
    } catch (error) {
      notify({ type: "error", title: "Règle", message: errorDescription(error) });
    }
  }

  async function deleteRule(id) {
    if (!mailApi?.deleteRule) return;
    try {
      await mailApi.deleteRule(id);
      notify({ type: "success", title: "Règle", message: "Règle supprimée." });
      await loadRules();
    } catch (error) {
      notify({ type: "error", title: "Règle", message: errorDescription(error) });
    }
  }

  async function loadFolder() {
    state.loading = true;
    renderList();
    try {
      let result;
      if (state.folder === "drafts") {
        result = await mailApi.drafts({ limit: 50, offset: 0 });
      } else {
        result = await mailApi.inbox({ folder: state.folder, limit: 50, offset: 0 });
      }
      state.messages = Array.isArray(result) ? result : (result?.data || []);
      const unread = result?.unread_count;
      state.counts[state.folder] = typeof unread === "number" ? unread : state.messages.filter((m) => !m.is_read).length;
    } catch (error) {
      notify({ type: "error", title: "Mail", message: errorDescription(error) });
      state.messages = [];
    }
    state.loading = false;
    renderList();
    renderSidebar();
  }

  async function loadSearch() {
    if (!state.query) {
      state.isSearch = false;
      loadFolder();
      return;
    }
    state.loading = true;
    renderList();
    try {
      const result = await mailApi.search(state.query, { limit: 50, offset: 0 });
      state.messages = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      notify({ type: "error", title: "Recherche", message: errorDescription(error) });
      state.messages = [];
    }
    state.loading = false;
    renderList();
    renderSidebar();
  }

  function setFolder(key) {
    state.folder = key;
    state.view = "list";
    state.selected = null;
    state.isSearch = false;
    state.query = "";
    searchInput.value = "";
    updateLayoutClass();
    renderReading();
    loadFolder();
    if (window.innerWidth < 1024) sidebar.classList.remove("is-open");
  }

  function setView(view) {
    state.view = view;
    updateLayoutClass();
  }

  function updateLayoutClass() {
    layout.classList.remove("is-list", "is-detail", "is-compose");
    layout.classList.add(`is-${state.view}`);
  }

  function backToList() {
    state.selected = null;
    setView("list");
    renderReading();
  }

  async function markRead(message) {
    if (!message || message.is_read) return;
    message.is_read = true;
    try {
      await mailApi.read(message.id, { is_read: true });
    } catch {
      // ignore
    }
  }

  async function toggleStar(message) {
    if (!message) return;
    const next = !message.is_starred;
    message.is_starred = next;
    try {
      await mailApi.read(message.id, { is_starred: next });
    } catch {
      // ignore
    }
    if (state.selected?.id === message.id) renderReading();
    renderList();
  }

  async function toggleImportant(message) {
    if (!message) return;
    const next = !message.is_important;
    message.is_important = next;
    try {
      await mailApi.read(message.id, { is_important: next });
    } catch {
      // ignore
    }
    if (state.selected?.id === message.id) renderReading();
    renderList();
  }

  async function moveMessage(message, folder) {
    if (!message) return;
    try {
      await mailApi.move([message.id], folder);
      notify({ type: "success", title: "Mail", message: `Déplacé vers ${folder}.` });
      state.messages = state.messages.filter((m) => m.id !== message.id);
      if (state.selected?.id === message.id) backToList();
      renderList();
      loadFolder();
    } catch (error) {
      notify({ type: "error", title: "Mail", message: errorDescription(error) });
    }
  }

  async function createLabel(name) {
    if (!mailApi || !name.trim()) return;
    try {
      await mailApi.createLabel({ name: name.trim(), color: "var(--v8-accent)" });
      notify({ type: "success", title: "Étiquette", message: "Étiquette créée." });
      await loadLabels();
      renderSidebar();
      if (state.view === "detail" && state.selected) renderReading();
    } catch (error) {
      notify({ type: "error", title: "Étiquette", message: errorDescription(error) });
    }
  }

  async function deleteLabel(id) {
    if (!mailApi) return;
    try {
      await mailApi.deleteLabel(id);
      notify({ type: "success", title: "Étiquette", message: "Étiquette supprimée." });
      await loadLabels();
      renderSidebar();
      if (state.view === "detail" && state.selected) renderReading();
    } catch (error) {
      notify({ type: "error", title: "Étiquette", message: errorDescription(error) });
    }
  }

  async function assignLabel(ids, labelName, remove = false) {
    if (!mailApi || !ids.length || !labelName) return;
    const matchedLabel = state.labels.find((l) => l.name === labelName);
    const labelId = matchedLabel?.id;
    try {
      await mailApi.assignLabel(ids, labelName, remove);
      notify({ type: "success", title: "Étiquette", message: remove ? "Étiquette retirée." : "Étiquette assignée." });
      if (state.selected && ids.map(String).includes(String(state.selected.id))) {
        if (remove) {
          state.selected.labels = (state.selected.labels || []).filter((l) => l.id !== labelId);
        } else if (matchedLabel && !state.selected.labels?.some((l) => l.id === labelId)) {
          state.selected.labels = [...(state.selected.labels || []), matchedLabel];
        }
        renderReading();
      }
      loadFolder();
    } catch (error) {
      notify({ type: "error", title: "Étiquette", message: errorDescription(error) });
    }
  }

  function renderSidebar() {
    sidebar.replaceChildren();
    const title = element("div", { className: "v8-mail-sidebar__title" }, [
      element("h2", { text: "Mail" }),
      state.alias ? element("small", { text: state.alias.alias || state.alias }) : null
    ]);

    const folderList = element("ul", { className: "v8-mail-folders" });
    FOLDERS.forEach((folder) => {
      const count = state.counts[folder.key];
      const isActive = state.folder === folder.key && !state.isSearch;
      const btn = actionButton({
        actionId: `v8.mail.folder.${folder.key}`,
        className: `v8-mail-folder${isActive ? " is-active" : ""}`
      }, [icon(folder.icon), element("span", { text: folder.label }), count ? element("span", { className: "v8-mail-folder__count", text: String(count) }) : null]);
      btn.addEventListener("click", () => setFolder(folder.key));
      folderList.append(element("li", {}, [btn]));
    });

    const rulesTitle = element("strong", { className: "v8-mail-sidebar__section", text: "Règles" });

    const ruleNameInput = element("input", {
      className: "v8-input v8-mail-rule-input",
      attributes: { type: "text", placeholder: "Nom de la règle", maxlength: "64" }
    });
    const ruleConditionInput = element("input", {
      className: "v8-input v8-mail-rule-input",
      attributes: { type: "text", placeholder: "Si le sujet contient...", maxlength: "128" }
    });
    const ruleActionType = element("select", { className: "v8-input v8-mail-rule-select" }, [
      element("option", { text: "Étiqueter", attributes: { value: "label" } }),
      element("option", { text: "Déplacer", attributes: { value: "move" } })
    ]);
    const ruleTargetInput = element("input", {
      className: "v8-input v8-mail-rule-input",
      attributes: { type: "text", placeholder: "Nom de l'étiquette ou dossier", maxlength: "64" }
    });
    const ruleSaveBtn = actionButton({ actionId: "v8.mail.rule.save", variant: "secondary" }, [icon("plus"), element("span", { text: "Créer" })]);
    const ruleForm = element("div", { className: "v8-mail-rules__form" }, [ruleNameInput, ruleConditionInput, ruleActionType, ruleTargetInput, ruleSaveBtn]);

    ruleSaveBtn.addEventListener("click", async () => {
      const payload = {
        name: ruleNameInput.value.trim(),
        condition: { subject: ruleConditionInput.value.trim() },
        action: { type: ruleActionType.value, target: ruleTargetInput.value.trim() },
        enabled: true
      };
      if (!payload.name || !payload.condition.subject || !payload.action.target) {
        notify({ type: "warning", title: "Règle", message: "Remplissez tous les champs." });
        return;
      }
      await saveRule(payload);
      ruleNameInput.value = "";
      ruleConditionInput.value = "";
      ruleTargetInput.value = "";
    });

    const rulesList = element("ul", { className: "v8-mail-rules__list" });
    state.rules.forEach((rule) => {
      const name = rule.name || "Règle";
      const condition = rule.condition?.subject ? `sujet contient "${rule.condition.subject}"` : "";
      const actionType = rule.action?.type === "move" ? "Déplacer" : "Étiqueter";
      const actionTarget = rule.action?.target || "";
      const item = element("li", { className: "v8-mail-rule" }, [
        element("span", { className: "v8-mail-rule__info" }, [
          element("strong", { text: name }),
          element("small", { text: `${condition} -> ${actionType} ${actionTarget}` })
        ]),
        element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": `Supprimer ${name}` }
        }, [icon("trash-2")])
      ]);
      item.querySelector("button").addEventListener("click", () => deleteRule(rule.id));
      rulesList.append(item);
    });

    const notificationsTitle = element("strong", { className: "v8-mail-sidebar__section", text: "Notifications" });
    const notificationsList = element("ul", { className: `v8-mail-notifications${state.notificationOpen ? " is-open" : ""}` });
    if (state.notifications.length) {
      state.notifications.forEach((n) => {
        const isUnread = !n.is_read;
        const item = element("li", { className: `v8-mail-notification${isUnread ? " is-unread" : ""}` }, [
          element("span", { className: "v8-mail-notification__title", text: n.title || n.message || "Notification" }),
          element("small", { className: "v8-mail-notification__meta", text: formatMailDate(n.created_at || n.sent_at || n.date) })
        ]);
        item.addEventListener("click", () => markNotificationRead(n));
        notificationsList.append(item);
      });
    } else {
      notificationsList.append(element("li", { className: "v8-mail-notification", text: "Aucune notification" }));
    }

    const labelsTitle = element("strong", { className: "v8-mail-sidebar__section", text: "Étiquettes" });
    const labelList = element("ul", { className: "v8-mail-labels" });
    state.labels.forEach((l) => {
      const item = element("li", { className: "v8-mail-sidebar-label" }, [
        element("span", { text: l.name }),
        element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": `Supprimer ${l.name}` }
        }, [icon("x")])
      ]);
      item.querySelector("button").addEventListener("click", () => deleteLabel(l.id));
      labelList.append(item);
    });

    const newLabelInput = element("input", {
      className: "v8-input v8-mail-new-label",
      attributes: { type: "text", placeholder: "Nouvelle étiquette", maxlength: "32" }
    });
    newLabelInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && newLabelInput.value.trim()) createLabel(newLabelInput.value.trim());
    });

    sidebar.append(title, folderList, rulesTitle, ruleForm, rulesList, notificationsTitle, notificationsList, labelsTitle, labelList, newLabelInput);
    renderBell();
    refreshIcons();
  }

  function renderList() {
    const label = state.isSearch ? `Recherche : ${state.query}` : (FOLDERS.find((f) => f.key === state.folder)?.label || "");
    listTitle.textContent = `${label} (${state.messages.length})`;
    messageList.replaceChildren();

    if (state.loading && !state.messages.length) {
      messageList.append(statusState("loading", { title: "Chargement des messages...", compact: true, inline: true }));
      refreshIcons();
      return;
    }

    if (!state.messages.length) {
      messageList.append(statusState("empty", {
        title: "Aucun message",
        description: state.isSearch ? "Aucun résultat pour cette recherche." : "Ce dossier est vide.",
        compact: true,
        inline: true
      }));
      refreshIcons();
      return;
    }

    state.messages.forEach((message) => messageList.append(buildRow(message)));
    refreshIcons();
  }

  function buildRow(message) {
    const from = message.from_name || getFromAddress(message) || "Inconnu";
    const subject = message.subject || "(aucun sujet)";
    const preview = String(message.body_text || message.snippet || "").replace(/\s+/g, " ").slice(0, 90);
    const date = formatMailDate(message.received_at || message.created_at);
    const hasAttachments = (message.attachments?.length > 0) || message.has_attachments;

    const indicators = element("span", { className: "v8-mail-row__indicators" }, [
      message.is_important ? element("span", { className: "v8-mail-row__indicator is-active", dataset: { action: "important" }, attributes: { role: "button", "aria-label": "Important" } }, [icon("alert-circle")]) : null,
      hasAttachments ? icon("paperclip") : null,
      element("span", { className: `v8-mail-row__indicator${message.is_starred ? " is-active" : ""}`, dataset: { action: "star" }, attributes: { role: "button", "aria-label": message.is_starred ? "Retirer des favoris" : "Mettre en favori" } }, [icon(message.is_starred ? "star" : "star-off")])
    ]);

    const row = element("button", {
      className: `v8-mail-row${!message.is_read ? " v8-mail-row--unread" : ""}${state.selected?.id === message.id ? " is-selected" : ""}`,
      attributes: { type: "button" },
      dataset: { messageId: String(message.id) }
    }, [
      element("span", { className: "v8-mail-avatar v8-mail-row__avatar", text: initials(from) }),
      element("span", { className: "v8-mail-row__main" }, [
        element("span", { className: "v8-mail-row__from", text: from }),
        element("span", { className: "v8-mail-row__subject", text: subject }),
        element("span", { className: "v8-mail-row__preview", text: preview })
      ]),
      element("span", { className: "v8-mail-row__meta" }, [
        element("span", { className: "v8-mail-row__date", text: date }),
        indicators
      ])
    ]);

    row.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]");
      if (action) {
        event.stopPropagation();
        if (action.dataset.action === "star") toggleStar(message);
        else if (action.dataset.action === "important") toggleImportant(message);
        return;
      }
      if (state.folder === "drafts" || message.folder === "drafts") {
        openCompose({ draft: message });
      } else {
        openDetail(message);
      }
    });

    return row;
  }

  async function openDetail(message) {
    state.selected = message;
    setView("detail");
    await markRead(message);
    renderList();
    renderReading();
  }

  function renderReading() {
    reading.replaceChildren();
    if (state.view === "detail" && state.selected) {
      buildDetail(state.selected);
    } else if (state.view === "compose") {
      if (!composeRoot) buildCompose();
      else reading.append(composeRoot);
    } else {
      reading.append(statusState("empty", {
        title: "Sélectionnez un message",
        description: "Choisissez un message dans la liste pour le lire.",
        compact: true,
        inline: true
      }));
      refreshIcons();
    }
  }

  function useSuggestion(message, suggestion) {
    const replyTo = getFromAddress(message);
    const inReplyTo = message.message_id || message.id;
    const references = Array.isArray(message.references) ? [...message.references, inReplyTo] : [inReplyTo];
    openCompose({
      replyTo,
      subject: `Re: ${message.subject || ""}`,
      inReplyTo,
      references,
      quote: message,
      prefill: suggestion
    });
  }

  async function createItem(item, type) {
    if (!repository) {
      notify({ type: "info", title: "Création", message: "prêt à copier" });
      return;
    }
    try {
      if (type === "task" && typeof repository.tasks?.create === "function") {
        await repository.tasks.create(item);
        notify({ type: "success", title: "Tâche", message: "Tâche créée." });
      } else if (type === "event" && typeof repository.events?.create === "function") {
        await repository.events.create(item);
        notify({ type: "success", title: "Événement", message: "Événement créé." });
      } else if (type === "note" && typeof repository.notes?.create === "function") {
        const payload = {
          title: item.title || item.text || "Extrait",
          content: item.description || item.text || JSON.stringify(item)
        };
        await repository.notes.create(payload);
        notify({ type: "success", title: "Note", message: "Note créée." });
      } else {
        notify({ type: "info", title: "Création", message: "prêt à copier" });
      }
    } catch (error) {
      notify({ type: "error", title: "Création", message: errorDescription(error) });
    }
  }

  async function analyzeMessage(message, panel) {
    if (!mailApi?.analyze) {
      notify({ type: "warning", title: "Brain", message: "L'analyse n'est pas disponible." });
      return;
    }
    try {
      const result = await mailApi.analyze(message.id);
      const data = result?.data || result || {};
      const summary = data.brain_summary || data.summary || "";
      const tasks = data.extracted_tasks || data.tasks || [];
      const events = data.extracted_events || data.events || [];
      panel.replaceChildren(buildBrainSummary(summary, tasks, events));
      panel.hidden = false;
    } catch (error) {
      notify({ type: "error", title: "Brain", message: errorDescription(error) });
    }
  }

  async function suggestMessage(message, panel) {
    if (!mailApi?.suggest) {
      notify({ type: "warning", title: "Brain", message: "Les suggestions ne sont pas disponibles." });
      return;
    }
    try {
      const result = await mailApi.suggest(message.id);
      const suggestions = result?.data?.suggestions || result?.suggestions || (Array.isArray(result) ? result : []);
      panel.replaceChildren(buildSuggestionChips(suggestions.slice(0, 3), message));
      panel.hidden = false;
    } catch (error) {
      notify({ type: "error", title: "Brain", message: errorDescription(error) });
    }
  }

  async function extractMessage(message, panel) {
    if (!mailApi?.extract) {
      notify({ type: "warning", title: "Brain", message: "L'extraction n'est pas disponible." });
      return;
    }
    try {
      const result = await mailApi.extract(message.id);
      const data = result?.data || result || {};
      const tasks = data.extracted_tasks || data.tasks || [];
      const events = data.extracted_events || data.events || [];
      panel.replaceChildren(buildExtractList(tasks, events));
      panel.hidden = false;
    } catch (error) {
      notify({ type: "error", title: "Brain", message: errorDescription(error) });
    }
  }

  function buildBrainSummary(summary, tasks, events) {
    const wrap = element("div", { className: "v8-mail-brain" });
    if (summary) {
      const summaryNode = element("div", { className: "v8-mail-brain__summary" });
      summaryNode.innerHTML = sanitizeMailHtml(text2br(summary));
      wrap.append(summaryNode);
    }
    if (tasks.length) {
      const list = element("ul", { className: "v8-mail-brain__list" });
      tasks.forEach((t) => {
        list.append(element("li", {}, [element("span", { text: t.title || t.text || String(t) })]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: "Tâches extraites" }), list);
    }
    if (events.length) {
      const list = element("ul", { className: "v8-mail-brain__list" });
      events.forEach((e) => {
        list.append(element("li", {}, [element("span", { text: e.title || e.text || String(e) })]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: "Événements extraits" }), list);
    }
    if (!summary && !tasks.length && !events.length) {
      wrap.append(element("p", { text: "Aucune analyse disponible." }));
    }
    return wrap;
  }

  function buildSuggestionChips(suggestions, message) {
    const wrap = element("div", { className: "v8-mail-suggestions" });
    if (!suggestions.length) {
      wrap.append(element("p", { text: "Aucune suggestion." }));
      return wrap;
    }
    suggestions.forEach((suggestion) => {
      const suggestionText = suggestion.text || suggestion.body || suggestion.label || String(suggestion);
      const chip = element("button", {
        className: "v8-mail-suggestion",
        attributes: { type: "button" },
        text: suggestionText
      });
      chip.addEventListener("click", () => useSuggestion(message, suggestionText));
      wrap.append(chip);
    });
    return wrap;
  }

  function buildExtractList(tasks, events) {
    const wrap = element("div", { className: "v8-mail-brain" });
    if (tasks.length) {
      const list = element("ul", { className: "v8-mail-brain__list" });
      tasks.forEach((task) => {
        const title = task.title || task.text || String(task);
        const taskBtn = element("button", { className: "v8-button v8-button--secondary v8-mail-brain__action", attributes: { type: "button" }, text: "Tâche" });
        const noteBtn = element("button", { className: "v8-button v8-button--outline v8-mail-brain__action", attributes: { type: "button" }, text: "Note" });
        taskBtn.addEventListener("click", () => createItem(task, "task"));
        noteBtn.addEventListener("click", () => createItem(task, "note"));
        list.append(element("li", { className: "v8-mail-brain__item" }, [
          element("span", { className: "v8-mail-brain__item-title", text: title }),
          element("span", { className: "v8-mail-brain__actions" }, [taskBtn, noteBtn])
        ]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: "Tâches" }), list);
    }
    if (events.length) {
      const list = element("ul", { className: "v8-mail-brain__list" });
      events.forEach((eventItem) => {
        const title = eventItem.title || eventItem.text || String(eventItem);
        const eventBtn = element("button", { className: "v8-button v8-button--secondary v8-mail-brain__action", attributes: { type: "button" }, text: "Événement" });
        const noteBtn = element("button", { className: "v8-button v8-button--outline v8-mail-brain__action", attributes: { type: "button" }, text: "Note" });
        eventBtn.addEventListener("click", () => createItem(eventItem, "event"));
        noteBtn.addEventListener("click", () => createItem(eventItem, "note"));
        list.append(element("li", { className: "v8-mail-brain__item" }, [
          element("span", { className: "v8-mail-brain__item-title", text: title }),
          element("span", { className: "v8-mail-brain__actions" }, [eventBtn, noteBtn])
        ]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: "Événements" }), list);
    }
    if (!tasks.length && !events.length) {
      wrap.append(element("p", { text: "Aucun élément extrait." }));
    }
    return wrap;
  }

  function buildDetail(message) {
    const from = message.from_name || getFromAddress(message) || "Inconnu";
    const to = Array.isArray(message.to) ? message.to.join(", ") : message.to || "";
    const cc = Array.isArray(message.cc) ? message.cc.join(", ") : message.cc || "";
    const bcc = Array.isArray(message.bcc) ? message.bcc.join(", ") : message.bcc || "";
    const body = sanitizeMailHtml(message.body_html || text2br(message.body_text || ""));

    const labels = (message.labels || []).map((l) => {
      const name = String(l?.name || l);
      return element("span", { className: "v8-mail-label" }, [
        element("span", { text: name }),
        element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": `Retirer ${name}` }
        }, [icon("x")])
      ]);
    });
    labels.forEach((node) => {
      const name = node.querySelector("span")?.textContent;
      if (!name) return;
      node.querySelector("button").addEventListener("click", () => assignLabel([message.id], name, true));
    });

    const assignSelect = element("select", { className: "v8-input v8-mail-assign-label" }, [
      element("option", { text: "Étiquette...", attributes: { value: "" } }),
      ...state.labels.map((l) => element("option", { text: l.name, attributes: { value: String(l.name) } }))
    ]);
    assignSelect.addEventListener("change", () => {
      if (assignSelect.value) {
        assignLabel([message.id], assignSelect.value);
        assignSelect.value = "";
      }
    });

    const participants = [
      `De : ${from}`,
      to ? `À : ${to}` : "",
      cc ? `Cc : ${cc}` : "",
      bcc ? `Cci : ${bcc}` : ""
    ].filter(Boolean).join(" · ");

    const backButton = element("button", {
      className: "v8-icon-button v8-mail-back",
      attributes: { type: "button", "aria-label": "Retour" },
      events: { click: backToList }
    }, [icon("arrow-left")]);

    const replyBtn = actionButton({ actionId: "v8.mail.reply", variant: "secondary" }, [icon("reply"), element("span", { text: "Répondre" })]);
    const forwardBtn = actionButton({ actionId: "v8.mail.forward", variant: "secondary" }, [icon("forward"), element("span", { text: "Transférer" })]);
    const archiveBtn = actionButton({ actionId: "v8.mail.archive", className: "v8-icon-button", ariaLabel: "Archiver" }, [icon("archive")]);
    const spamBtn = actionButton({ actionId: "v8.mail.spam", className: "v8-icon-button", ariaLabel: "Spam" }, [icon("shield-alert")]);
    const deleteBtn = actionButton({ actionId: "v8.mail.delete", className: "v8-icon-button", ariaLabel: "Supprimer" }, [icon("trash-2")]);
    const starBtn = actionButton({
      actionId: "v8.mail.star",
      className: `v8-icon-button${message.is_starred ? " is-active" : ""}`,
      ariaLabel: message.is_starred ? "Retirer des favoris" : "Mettre en favori"
    }, [icon(message.is_starred ? "star" : "star-off")]);
    const importantBtn = actionButton({
      actionId: "v8.mail.important",
      className: `v8-icon-button${message.is_important ? " is-active" : ""}`,
      ariaLabel: message.is_important ? "Marquer comme non important" : "Marquer comme important"
    }, [icon("alert-circle")]);

    replyBtn.addEventListener("click", () => openReply(message));
    forwardBtn.addEventListener("click", () => openForward(message));
    archiveBtn.addEventListener("click", () => moveMessage(message, "archive"));
    spamBtn.addEventListener("click", () => moveMessage(message, "spam"));
    deleteBtn.addEventListener("click", () => moveMessage(message, "trash"));
    starBtn.addEventListener("click", () => toggleStar(message));
    importantBtn.addEventListener("click", () => toggleImportant(message));

    const header = element("header", { className: "v8-mail-detail__header" }, [
      element("div", { className: "v8-mail-detail__title" }, [
        backButton,
        element("h2", { text: message.subject || "(aucun sujet)" })
      ]),
      element("div", { className: "v8-mail-detail__participants" }, [
        element("span", { className: "v8-mail-avatar", text: initials(from) }),
        element("span", { className: "v8-mail-detail__names", text: participants }),
        element("span", { className: "v8-mail-detail__date", text: formatFullDate(message.received_at || message.created_at) })
      ]),
      element("div", { className: "v8-mail-detail__labels" }, [...labels, assignSelect])
    ]);

    const bodyNode = element("div", { className: "v8-mail-detail__body" });
    const contentNode = element("div", { className: "v8-mail-detail__content" });
    contentNode.innerHTML = body;
    bodyNode.append(contentNode);

    const summarizeBtn = actionButton({ actionId: "v8.mail.brain.summarize", variant: "secondary" }, [icon("brain"), element("span", { text: "Résumer" })]);
    const suggestBtn = actionButton({ actionId: "v8.mail.brain.suggest", variant: "secondary" }, [icon("message-square"), element("span", { text: "Réponses suggérées" })]);
    const extractBtn = actionButton({ actionId: "v8.mail.brain.extract", variant: "secondary" }, [icon("search"), element("span", { text: "Extraire" })]);
    const brainToolbar = element("div", { className: "v8-mail-brain__toolbar" }, [summarizeBtn, suggestBtn, extractBtn]);
    const brainPanel = element("div", { className: "v8-mail-brain__panel", attributes: { hidden: "" } });

    summarizeBtn.addEventListener("click", () => analyzeMessage(message, brainPanel));
    suggestBtn.addEventListener("click", () => suggestMessage(message, brainPanel));
    extractBtn.addEventListener("click", () => extractMessage(message, brainPanel));

    const actions = element("footer", { className: "v8-mail-detail__actions" }, [
      replyBtn,
      forwardBtn,
      archiveBtn,
      spamBtn,
      deleteBtn,
      starBtn,
      importantBtn
    ]);

    const detail = element("article", { className: "v8-mail-detail" }, [header, brainToolbar, brainPanel, bodyNode, actions]);
    reading.append(detail);
    refreshIcons();
  }

  function openReply(message, prefill = "") {
    state.selected = message;
    const replyTo = getFromAddress(message);
    const inReplyTo = message.message_id || message.id;
    const references = Array.isArray(message.references) ? [...message.references, inReplyTo] : [inReplyTo];
    openCompose({
      replyTo,
      subject: `Re: ${message.subject || ""}`,
      inReplyTo,
      references,
      quote: message,
      prefill
    });
  }

  function openForward(message) {
    state.selected = message;
    openCompose({
      subject: `Fwd: ${message.subject || ""}`,
      quote: message,
      isForward: true
    });
  }

  function openCompose(opts = {}) {
    buildCompose(opts);
    setView("compose");
  }

  function createMailEditor(onInput) {
    const body = element("div", {
      className: "v8-mail-editor__body",
      attributes: {
        contenteditable: "true",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Message",
        "data-placeholder": "Votre message..."
      }
    });

    const commands = [
      { cmd: "bold", icon: "bold", label: "Gras" },
      { cmd: "italic", icon: "italic", label: "Italique" },
      { cmd: "underline", icon: "underline", label: "Souligné" },
      { cmd: "insertUnorderedList", icon: "list", label: "Liste à puces" },
      { cmd: "insertOrderedList", icon: "list-ordered", label: "Liste numérotée" },
      { cmd: "formatBlock:blockquote", icon: "quote", label: "Citation" },
      { cmd: "formatBlock:pre", icon: "code", label: "Code" },
      { cmd: "createLink", icon: "link", label: "Lien" }
    ];

    const toolbar = element("div", { className: "v8-mail-editor__toolbar", attributes: { role: "toolbar" } },
      commands.map((c) =>
        element("button", {
          className: "v8-mail-editor__btn",
          attributes: { type: "button", "aria-label": c.label },
          dataset: { cmd: c.cmd }
        }, [icon(c.icon)])
      )
    );

    toolbar.addEventListener("mousedown", (event) => event.preventDefault());
    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cmd]");
      if (!button) return;
      const cmd = button.dataset.cmd;
      body.focus();
      if (cmd === "createLink") {
        const url = globalThis.prompt?.("Adresse du lien", "https://");
        if (!url) return;
        document.execCommand("createLink", false, url);
      } else if (cmd.startsWith("formatBlock:")) {
        const tag = cmd.split(":")[1];
        document.execCommand("formatBlock", false, `<${tag}>`);
      } else {
        document.execCommand(cmd);
      }
      onInput?.();
    });

    body.addEventListener("input", () => onInput?.());
    body.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") || "";
      document.execCommand("insertText", false, text);
      onInput?.();
    });

    const root = element("div", { className: "v8-mail-editor" }, [toolbar, body]);
    refreshIcons();
    return { root, body, getHTML: () => body.innerHTML, getText: () => body.innerText, setHTML: (html) => { body.innerHTML = html; } };
  }

  function createAddressField(placeholder, ariaLabel) {
    const input = element("input", {
      className: "v8-input",
      attributes: { type: "text", placeholder, "aria-label": ariaLabel }
    });
    const dropdown = element("div", { className: "v8-mail-autocomplete", attributes: { hidden: "", role: "listbox" } });
    const wrap = element("div", { className: "v8-mail-field" }, [input, dropdown]);

    function update() {
      const term = (input.value.split(/[,;]/).pop() || "").trim().toLowerCase();
      const matches = state.contacts
        .filter((c) => {
          const hay = `${c.name || ""} ${c.email || c.address || ""}`.toLowerCase();
          return !term || hay.includes(term);
        })
        .slice(0, 8);
      dropdown.replaceChildren(...matches.map((c) =>
        element("div", {
          className: "v8-mail-autocomplete__item",
          attributes: { role: "option" },
          dataset: { contact: c.email || c.address }
        }, [
          element("strong", { text: c.name || c.email || c.address }),
          c.name ? element("small", { text: c.email || c.address }) : null
        ])
      ));
      dropdown.hidden = !matches.length || input !== document.activeElement;
      refreshIcons();
    }

    function fill(email) {
      const parts = input.value.split(/[,;]/).map((s) => s.trim());
      parts.pop();
      parts.push(email);
      input.value = parts.join(", ") + (parts.length ? ", " : "");
    }

    input.addEventListener("input", update);
    input.addEventListener("focus", update);
    input.addEventListener("blur", () => setTimeout(() => { dropdown.hidden = true; }, 200));
    dropdown.addEventListener("mousedown", (event) => event.preventDefault());
    dropdown.addEventListener("click", (event) => {
      const item = event.target.closest("[data-contact]");
      if (!item) return;
      fill(item.dataset.contact);
      dropdown.hidden = true;
      input.focus();
      scheduleDraftSave();
    });

    return { input, wrap };
  }

  function insertSignature(signature) {
    if (!composeEditor) return;
    const marker = composeEditor.body.querySelector("[data-signature]");
    if (marker) marker.remove();
    if (!signature) return;
    const node = document.createElement("div");
    node.dataset.signature = "true";
    node.innerHTML = signature.content || "";
    composeEditor.body.append(node);
  }

  function buildCompose(opts = {}) {
    if (composeRoot) {
      composeRoot.remove();
      composeRoot = null;
      composeEditor = null;
    }
    composeAttachments = [];

    const draft = opts.draft;
    const reply = opts.quote && !opts.isForward ? opts.quote : null;
    const forward = opts.quote && opts.isForward ? opts.quote : null;

    composeDraftId = draft?.id || null;
    composeInReplyTo = draft?.in_reply_to || opts.inReplyTo || null;
    composeReferences = draft?.references || opts.references || null;

    const initialTo = draft
      ? (Array.isArray(draft.to) ? draft.to.join(", ") : draft.to || "")
      : (opts.replyTo || "");
    const initialCc = draft ? (Array.isArray(draft.cc) ? draft.cc.join(", ") : draft.cc || "") : "";
    const initialBcc = draft ? (Array.isArray(draft.bcc) ? draft.bcc.join(", ") : draft.bcc || "") : "";
    const initialSubject = draft
      ? (draft.subject || "")
      : (opts.subject || "");

    const toField = createAddressField("Destinataire", "Destinataire");
    toField.input.value = initialTo;
    const ccField = createAddressField("Cc", "Cc");
    ccField.input.value = initialCc;
    const bccField = createAddressField("Cci", "Cci");
    bccField.input.value = initialBcc;

    const subjectInput = element("input", {
      className: "v8-input",
      attributes: { type: "text", placeholder: "Sujet", "aria-label": "Sujet", value: initialSubject }
    });

    const ccToggle = element("button", {
      className: "v8-button v8-button--outline v8-mail-compose__toggle",
      attributes: { type: "button" },
      text: "Cc"
    });
    const bccToggle = element("button", {
      className: "v8-button v8-button--outline v8-mail-compose__toggle",
      attributes: { type: "button" },
      text: "Cci"
    });

    const ccWrap = element("div", { className: "v8-mail-compose__cc", attributes: { hidden: initialCc ? null : "" } }, [
      element("span", { text: "Cc" }),
      ccField.wrap
    ]);
    const bccWrap = element("div", { className: "v8-mail-compose__bcc", attributes: { hidden: initialBcc ? null : "" } }, [
      element("span", { text: "Cci" }),
      bccField.wrap
    ]);

    ccToggle.addEventListener("click", () => { ccWrap.hidden = false; ccField.input.focus(); });
    bccToggle.addEventListener("click", () => { bccWrap.hidden = false; bccField.input.focus(); });

    const signatureSelect = element("select", { className: "v8-input v8-mail-signature", attributes: { "aria-label": "Signature" } }, [
      element("option", { text: "Aucune signature", attributes: { value: "" } }),
      ...state.signatures.map((s) => element("option", { text: s.name, attributes: { value: String(s.id) } }))
    ]);
    const defaultSignature = state.signatures.find((s) => s.is_default) || state.signatures[0];
    if (defaultSignature) signatureSelect.value = String(defaultSignature.id);

    composeEditor = createMailEditor(() => scheduleDraftSave());
    const editor = composeEditor;

    signatureSelect.addEventListener("change", () => {
      const id = signatureSelect.value;
      const sig = state.signatures.find((s) => String(s.id) === id);
      insertSignature(sig);
      scheduleDraftSave();
    });

    const statusSpan = element("span", { className: "v8-mail-compose__status" });

    const fileInput = element("input", {
      className: "v8-input v8-file-input",
      attributes: { type: "file", multiple: "true", "aria-label": "Pièces jointes" }
    });
    const attachmentList = element("div", { className: "v8-mail-attachments" });

    fileInput.addEventListener("change", (event) => {
      const files = [...(event.target.files || [])];
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          const comma = dataUrl.indexOf(",");
          const content = comma > -1 ? dataUrl.slice(comma + 1) : dataUrl;
          const mime = file.type || dataUrl.slice(5, dataUrl.indexOf(";"));
          composeAttachments.push({ filename: file.name, content, size: file.size, mime_type: mime });
          renderAttachments();
          scheduleDraftSave();
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = "";
    });

    function renderAttachments() {
      attachmentList.replaceChildren();
      composeAttachments.forEach((a, index) => {
        const removeBtn = element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": `Retirer ${a.filename}` }
        }, [icon("x")]);
        removeBtn.addEventListener("click", () => {
          composeAttachments = composeAttachments.filter((_, i) => i !== index);
          renderAttachments();
          scheduleDraftSave();
        });
        attachmentList.append(element("div", { className: "v8-mail-attachment" }, [icon("paperclip"), element("span", { text: a.filename }), removeBtn]));
      });
      refreshIcons();
    }

    const backButton = element("button", {
      className: "v8-icon-button v8-mail-back",
      attributes: { type: "button", "aria-label": "Retour" },
      events: { click: backToList }
    }, [icon("arrow-left")]);

    const sendBtn = actionButton({ actionId: "v8.mail.send", variant: "primary" }, [icon("send"), element("span", { text: "Envoyer" })]);
    const saveBtn = actionButton({ actionId: "v8.mail.save", variant: "secondary" }, [icon("save"), element("span", { text: "Enregistrer" })]);
    const discardBtn = actionButton({ actionId: "v8.mail.discard", variant: "danger" }, [icon("trash-2"), element("span", { text: "Supprimer" })]);

    sendBtn.addEventListener("click", sendNow);
    saveBtn.addEventListener("click", saveDraftNow);
    discardBtn.addEventListener("click", discardNow);

    const header = element("header", { className: "v8-mail-compose__header" }, [
      backButton,
      element("h2", { text: draft ? "Brouillon" : "Nouveau message" }),
      statusSpan
    ]);

    const fields = element("div", { className: "v8-mail-compose__fields" }, [
      element("div", { className: "v8-mail-compose__recipients" }, [toField.wrap, ccToggle, bccToggle]),
      ccWrap,
      bccWrap,
      subjectInput,
      signatureSelect,
      editor.root,
      fileInput,
      attachmentList
    ]);

    const actions = element("footer", { className: "v8-mail-compose__actions" }, [sendBtn, saveBtn, discardBtn]);

    composeRoot = element("div", { className: "v8-mail-compose" }, [header, fields, actions]);
    reading.replaceChildren(composeRoot);

    [toField.input, ccField.input, bccField.input, subjectInput].forEach((el) =>
      el.addEventListener("input", scheduleDraftSave)
    );

    const prefill = opts.prefill ? text2br(opts.prefill) : "";
    const prefillBlock = prefill ? `<p>${prefill}</p>` : "";
    if (draft?.body_html || draft?.body_text) {
      editor.setHTML(draft.body_html || text2br(draft.body_text));
    } else if (reply) {
      editor.setHTML(`${prefillBlock}<p><br></p>${quoteOriginal(reply)}`);
    } else if (forward) {
      editor.setHTML(`${prefillBlock}<p><br></p>${quoteOriginal(forward, true)}`);
    } else if (prefill) {
      editor.setHTML(prefillBlock);
    } else {
      editor.setHTML("<p><br></p>");
      if (defaultSignature) insertSignature(defaultSignature);
    }

    refreshIcons();
  }

  function collectPayload() {
    const allInputs = composeRoot?.querySelectorAll(".v8-mail-compose__fields .v8-input") || [];
    let toInput, ccInput, bccInput, subjectInput;
    allInputs.forEach((input) => {
      const aria = input.getAttribute("aria-label");
      if (aria === "Destinataire") toInput = input;
      if (aria === "Cc") ccInput = input;
      if (aria === "Cci") bccInput = input;
      if (aria === "Sujet") subjectInput = input;
    });

    const fromName = state.alias?.from_name || state.alias?.name || "";
    const replyTo = state.alias?.reply_to || state.alias?.alias || state.alias || "";

    return {
      to: splitAddresses(toInput?.value),
      cc: splitAddresses(ccInput?.value),
      bcc: splitAddresses(bccInput?.value),
      subject: subjectInput?.value || "",
      text: composeEditor?.getText() || "",
      html: sanitizeMailHtml(composeEditor?.getHTML() || ""),
      from_name: fromName,
      reply_to: replyTo,
      attachments: composeAttachments,
      draft_id: composeDraftId || undefined,
      in_reply_to: composeInReplyTo || undefined,
      references: composeReferences || undefined
    };
  }

  function scheduleDraftSave() {
    if (draftTimer) clearTimeout(draftTimer);
    const status = composeRoot?.querySelector(".v8-mail-compose__status");
    if (status) status.textContent = "Enregistrement...";
    draftTimer = setTimeout(saveDraftNow, 2000);
  }

  async function saveDraftNow() {
    if (!mailApi || !composeEditor) return;
    try {
      const payload = collectPayload();
      const result = await mailApi.saveDraft(payload);
      composeDraftId = result?.data?.id || result?.id || composeDraftId;
      const status = composeRoot?.querySelector(".v8-mail-compose__status");
      if (status) status.textContent = "Enregistré";
    } catch (error) {
      const status = composeRoot?.querySelector(".v8-mail-compose__status");
      if (status) status.textContent = "Erreur d'enregistrement";
      notify({ type: "error", title: "Brouillon", message: errorDescription(error) });
    }
  }

  async function sendNow() {
    if (!mailApi || !composeEditor) return;
    const payload = collectPayload();
    if (!payload.to.length) {
      notify({ type: "warning", title: "Mail", message: "Ajoutez au moins un destinataire." });
      return;
    }
    try {
      await mailApi.send(payload);
      notify({ type: "success", title: "Mail", message: "Message envoyé." });
      if (composeDraftId) {
        try { await mailApi.deleteDraft(composeDraftId); } catch {}
      }
      composeDraftId = null;
      backToList();
      loadFolder();
    } catch (error) {
      notify({ type: "error", title: "Échec de l'envoi", message: errorDescription(error) });
    }
  }

  async function discardNow() {
    if (composeDraftId && mailApi) {
      try { await mailApi.deleteDraft(composeDraftId); } catch {}
    }
    composeDraftId = null;
    backToList();
  }

  async function init() {
    await Promise.all([loadAlias(), loadLabels(), loadContacts(), loadSignatures(), loadRules(), loadNotifications()]);
    renderSidebar();
    await loadFolder();
    renderReading();
  }

  init();

  return () => {
    if (searchTimer) clearTimeout(searchTimer);
    if (draftTimer) clearTimeout(draftTimer);
    page.remove();
  };
}
