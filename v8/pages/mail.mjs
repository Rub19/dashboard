import { actionButton, element, icon } from "../ui/dom.mjs";
import { buildEmptyState } from "../ui/empty-state.mjs";
import { buildErrorState } from "../ui/error-state.mjs";
import { buildSkeletonList } from "../ui/skeleton.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { showBottomSheet } from "../ui/bottom-sheet.mjs";
import { createMailCache } from "../services/mail-cache.mjs";

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

function clean(value, fallback = "", limit = 400) {
  return (String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() || fallback).slice(0, limit);
}

function formatSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

function buildBar(label, value, max, unit = "") {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  const text = `${value}${unit}`;
  return element("div", { className: "v8-mail-analytics__bar-row" }, [
    element("span", { className: "v8-mail-analytics__bar-label", text: label }),
    element("div", { className: "v8-mail-analytics__bar-track" }, [
      element("div", { className: "v8-mail-analytics__bar-fill", attributes: { style: `width: ${percent}%` } })
    ]),
    element("span", { className: "v8-mail-analytics__bar-value", text: text })
  ]);
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
  const mailCache = options?.mailCache || createMailCache();

  if (!mailApi) {
    stage.replaceChildren(buildEmptyState({
      icon: "unplug",
      title: "Service Mail non configuré",
      message: "Connectez ETHONE Mail pour accéder à vos messages."
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
    filters: { from: "", subject: "", body: "", date_from: "", date_to: "", has_attachments: false, label: "", folder: "" },
    filtersOpen: false,
    labels: [],
    contacts: [],
    signatures: [],
    templates: [],
    templateForm: { id: null, name: "", subject: "", content: "", is_default: false },
    alias: null,
    counts: {},
    loading: false,
    error: null,
    notifications: [],
    unreadCount: 0,
    rules: [],
    notificationOpen: false,
    selectedIds: new Set(),
    analytics: null,
    analyticsPeriod: 30,
    analyticsOpen: false,
    blocked: [],
    trusted: [],
    securityTab: "blocked",
    securityLoading: false,
    accounts: [],
    pgpKeys: [],
    pushSubscribed: false,
    pushLoading: false,
    lists: [],
    listMembers: {},
    selectedListId: null,
    accountForm: { provider: "", email: "", label: "" },
    pgpForm: { email: "", publicKey: "", privateKey: "", passphrase: "" },
    listForm: { id: null, name: "", description: "", address: "" }
  };

  let searchTimer = null;
  let draftTimer = null;
  let composeRoot = null;
  let composeEditor = null;
  let composeDraftId = null;
  let composeInReplyTo = null;
  let composeReferences = null;
  let composeAttachments = [];

  let filterPanel = null;
  let filterFromInput = null;
  let filterSubjectInput = null;
  let filterBodyInput = null;
  let filterDateFromInput = null;
  let filterDateToInput = null;
  let filterHasAttachmentsInput = null;
  let filterLabelInput = null;
  let filterFolderSelect = null;

  let onlineStatus = null;
  let masterCheckbox = null;
  let bulkToolbar = null;
  let snoozeDialog = null;
  let analyticsPanel = null;

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
  const filterBtn = element("button", {
    className: "v8-icon-button v8-mail-filter-toggle",
    attributes: { type: "button", "aria-label": "Filtres" }
  }, [icon("filter")]);
  onlineStatus = element("span", { className: "v8-mail-online-status" });
  masterCheckbox = element("input", {
    className: "v8-mail-master-checkbox",
    attributes: { type: "checkbox", "aria-label": "Tout sélectionner" }
  });
  const listHeader = element("header", { className: "v8-mail-list-header" }, [menuButton, listTitle, onlineStatus, masterCheckbox, searchInput, bellBtn, filterBtn, newBtn]);

  filterFromInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: "Expéditeur" } });
  filterSubjectInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: "Sujet" } });
  filterBodyInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: "Contenu" } });
  filterDateFromInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "date" } });
  filterDateToInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "date" } });
  filterHasAttachmentsInput = element("input", { className: "v8-mail-filter__checkbox", attributes: { type: "checkbox" } });
  const hasAttachmentsLabel = element("label", { className: "v8-mail-filter__check" }, [
    filterHasAttachmentsInput,
    element("span", { text: "Pièces jointes" })
  ]);
  filterLabelInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: "Étiquette" } });
  filterFolderSelect = element("select", { className: "v8-input v8-mail-filter__input" }, [
    element("option", { text: "Tous les dossiers", attributes: { value: "" } }),
    ...FOLDERS.map((f) => element("option", { text: f.label, attributes: { value: f.key } }))
  ]);
  const applyFiltersBtn = actionButton({ actionId: "v8.mail.filters.apply", variant: "secondary", className: "v8-mail-filter__apply" }, [element("span", { text: "Appliquer" })]);
  const resetFiltersBtn = actionButton({ actionId: "v8.mail.filters.reset", variant: "outline", className: "v8-mail-filter__reset" }, [element("span", { text: "Réinitialiser" })]);
  filterPanel = element("div", { className: "v8-mail-filters", attributes: { hidden: "" } }, [
    filterFromInput,
    filterSubjectInput,
    filterBodyInput,
    filterDateFromInput,
    filterDateToInput,
    hasAttachmentsLabel,
    filterLabelInput,
    filterFolderSelect,
    applyFiltersBtn,
    resetFiltersBtn
  ]);

  const messageList = element("ul", { className: "v8-mail-list" });
  analyticsPanel = element("section", { className: "v8-mail-analytics", attributes: { hidden: "" } });
  bulkToolbar = buildBulkToolbar();
  snoozeDialog = buildSnoozeDialog();
  listWrap.append(listHeader, filterPanel, bulkToolbar, messageList, analyticsPanel);
  page.append(snoozeDialog);

  menuButton.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  newBtn.addEventListener("click", () => openCompose());
  bellBtn.addEventListener("click", toggleNotifications);
  filterBtn.addEventListener("click", toggleFilters);
  applyFiltersBtn.addEventListener("click", applyFilters);
  resetFiltersBtn.addEventListener("click", resetFilters);

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

  masterCheckbox.addEventListener("change", () => {
    if (masterCheckbox.checked) selectAll();
    else deselectAll();
  });

  updateOnlineStatus();

  stage.replaceChildren(page);

  messageList.addEventListener("v8-mail-longpress", (event) => {
    event.preventDefault?.();
    const message = state.messages.find((m) => String(m.id) === String(event.detail?.messageId));
    if (message) openMessageContext(message);
  });

  function isOnline() {
    return typeof navigator !== "undefined" ? navigator.onLine !== false : true;
  }

  async function withQueue(action, payload) {
    if (!mailApi) return null;
    if (!isOnline()) {
      const id = await mailCache.queueAction({ action, payload });
      if (id) {
        notify({ type: "warning", title: "Hors ligne", message: "L'action est mise en attente et sera exécutée à la reconnexion." });
      }
      return null;
    }
    return runQueueAction(action, payload);
  }

  const queueRunners = {
    read: (p) => mailApi.read(p.id, p.flags),
    star: (p) => mailApi.read(p.id, { is_starred: p.isStarred }),
    important: (p) => mailApi.read(p.id, { is_important: p.isImportant }),
    move: (p) => mailApi.move(p.ids, p.folder),
    label: (p) => mailApi.assignLabel(p.ids, p.label, p.remove),
    snooze: (p) => mailApi.snooze(p.id, p.snoozedUntil),
    bulkSnooze: (p) => mailApi.bulk(p.ids, "snooze", p.snoozedUntil),
    bulk: (p) => mailApi.bulk(p.ids, p.action, p.target),
    send: (p) => (p.scheduled_at ? mailApi.schedule(p) : mailApi.send(p)),
    saveDraft: (p) => mailApi.saveDraft(p)
  };

  async function runQueueAction(action, payload) {
    const runner = queueRunners[action];
    if (!runner) return null;
    return runner(payload);
  }

  async function processQueue() {
    const queue = await mailCache.getQueue();
    if (!queue.length) return;
    for (const item of queue) {
      try {
        await runQueueAction(item.action, item.payload);
        await mailCache.removeAction(item.id);
      } catch (error) {
        notify({ type: "error", title: "File d'attente", message: errorDescription(error) });
        break;
      }
    }
    await loadFolder();
  }

  function updateOnlineStatus() {
    const online = isOnline();
    if (!onlineStatus) return;
    onlineStatus.classList.toggle("is-offline", !online);
    onlineStatus.classList.toggle("is-online", online);
    onlineStatus.textContent = online ? "En ligne" : "Hors ligne";
    onlineStatus.title = online ? "Connecté" : "Mode hors ligne";
  }

  const onOnline = () => { updateOnlineStatus(); processQueue(); };
  const onOffline = () => { updateOnlineStatus(); };
  globalThis.addEventListener?.("online", onOnline);
  globalThis.addEventListener?.("offline", onOffline);

  async function loadCached() {
    try {
      const [cachedMessages, cachedTemplates, cachedRules, cachedNotifications] = await Promise.all([
        mailCache.getMessages(state.folder),
        mailCache.getTemplates(),
        mailCache.getRules(),
        mailCache.getNotifications()
      ]);
      state.messages = cachedMessages || [];
      state.templates = cachedTemplates || [];
      state.rules = cachedRules || [];
      state.notifications = cachedNotifications || [];
      state.unreadCount = state.notifications.filter((n) => !n.is_read).length;
    } catch {
      // ignore cache errors
    }
  }

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
      await mailCache.putNotifications(state.notifications);
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
      await mailCache.putRules(state.rules);
    } catch (error) {
      notify({ type: "error", title: "Règles", message: errorDescription(error) });
      state.rules = [];
    }
    renderSidebar();
  }

  async function loadSecurity() {
    if (!mailApi?.blocked || !mailApi?.trusted) {
      state.blocked = [];
      state.trusted = [];
      return;
    }
    state.securityLoading = true;
    try {
      const [blockedResult, trustedResult] = await Promise.all([
        mailApi.blocked(50),
        mailApi.trusted(50)
      ]);
      state.blocked = Array.isArray(blockedResult) ? blockedResult : (blockedResult?.data || []);
      state.trusted = Array.isArray(trustedResult) ? trustedResult : (trustedResult?.data || []);
    } catch (error) {
      notify({ type: "error", title: "Sécurité", message: errorDescription(error) });
      state.blocked = [];
      state.trusted = [];
    }
    state.securityLoading = false;
    renderSidebar();
  }

  async function blockSenderFrom(email, domain, reason = "manual") {
    if (!mailApi?.blockSender) return;
    try {
      await mailApi.blockSender({ email, domain, reason });
      notify({ type: "success", title: "Sécurité", message: "Expéditeur bloqué." });
      await loadSecurity();
    } catch (error) {
      notify({ type: "error", title: "Sécurité", message: errorDescription(error) });
    }
  }

  async function trustSenderFrom(email, domain) {
    if (!mailApi?.trustSender) return;
    try {
      await mailApi.trustSender({ email, domain });
      notify({ type: "success", title: "Sécurité", message: "Expéditeur fiable." });
      await loadSecurity();
    } catch (error) {
      notify({ type: "error", title: "Sécurité", message: errorDescription(error) });
    }
  }

  async function unblockSenderFrom(id) {
    if (!mailApi?.unblockSender) return;
    try {
      await mailApi.unblockSender(id);
      notify({ type: "success", title: "Sécurité", message: "Bloc retiré." });
      await loadSecurity();
    } catch (error) {
      notify({ type: "error", title: "Sécurité", message: errorDescription(error) });
    }
  }

  async function untrustSenderFrom(id) {
    if (!mailApi?.untrustSender) return;
    try {
      await mailApi.untrustSender(id);
      notify({ type: "success", title: "Sécurité", message: "Confiance retirée." });
      await loadSecurity();
    } catch (error) {
      notify({ type: "error", title: "Sécurité", message: errorDescription(error) });
    }
  }

  async function loadAccounts() {
    if (!mailApi?.accounts) { state.accounts = []; return; }
    try {
      const result = await mailApi.accounts();
      state.accounts = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      notify({ type: "error", title: "Comptes", message: errorDescription(error) });
      state.accounts = [];
    }
  }

  async function addAccount(provider, email, label) {
    if (!mailApi?.createAccount) return;
    if (!provider || !email) {
      notify({ type: "warning", title: "Compte", message: "Fournisseur et email requis." });
      return;
    }
    try {
      await mailApi.createAccount({ provider, email, label });
      notify({ type: "success", title: "Compte", message: "Compte ajouté." });
      state.accountForm = { provider: "", email: "", label: "" };
      await loadAccounts();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Compte", message: errorDescription(error) });
    }
  }

  async function syncAccount(id) {
    if (!mailApi?.syncAccount) return;
    try {
      await mailApi.syncAccount(id);
      notify({ type: "success", title: "Compte", message: "Synchronisation lancée." });
    } catch (error) {
      notify({ type: "error", title: "Compte", message: errorDescription(error) });
    }
  }

  async function deleteAccount(id) {
    if (!mailApi?.deleteAccount) return;
    try {
      await mailApi.deleteAccount(id);
      notify({ type: "success", title: "Compte", message: "Compte supprimé." });
      await loadAccounts();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Compte", message: errorDescription(error) });
    }
  }

  async function loadPgpKeys() {
    if (!mailApi?.pgpKeys) { state.pgpKeys = []; return; }
    try {
      const result = await mailApi.pgpKeys();
      state.pgpKeys = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      notify({ type: "error", title: "PGP", message: errorDescription(error) });
      state.pgpKeys = [];
    }
  }

  async function createPgpKey() {
    if (!mailApi?.createPgpKey) return;
    const email = state.pgpForm.email.trim();
    if (!email) {
      notify({ type: "warning", title: "PGP", message: "Email requis." });
      return;
    }
    try {
      await mailApi.createPgpKey({ email, public_key: state.pgpForm.publicKey, private_key: state.pgpForm.privateKey, passphrase: state.pgpForm.passphrase });
      notify({ type: "success", title: "PGP", message: "Clé enregistrée." });
      state.pgpForm = { email: "", publicKey: "", privateKey: "", passphrase: "" };
      await loadPgpKeys();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "PGP", message: errorDescription(error) });
    }
  }

  async function deletePgpKey(id) {
    if (!mailApi?.deletePgpKey) return;
    try {
      await mailApi.deletePgpKey(id);
      notify({ type: "success", title: "PGP", message: "Clé supprimée." });
      await loadPgpKeys();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "PGP", message: errorDescription(error) });
    }
  }

  async function pgpEncrypt() {
    if (!mailApi?.pgpEncrypt) return;
    const { publicKey } = state.pgpForm;
    if (!publicKey) { notify({ type: "warning", title: "PGP", message: "Collez une clé publique." }); return; }
    const text = await globalThis.prompt?.("Texte à chiffrer");
    if (!text) return;
    try {
      const result = await mailApi.pgpEncrypt({ body: text, public_key: publicKey });
      const encrypted = result?.data?.body || result?.data;
      globalThis.alert?.(encrypted || "Chiffrement terminé.");
    } catch (error) {
      notify({ type: "error", title: "PGP", message: errorDescription(error) });
    }
  }

  async function pgpDecrypt() {
    if (!mailApi?.pgpDecrypt) return;
    const text = await globalThis.prompt?.("Texte à déchiffrer");
    if (!text) return;
    try {
      const result = await mailApi.pgpDecrypt({ body: text, passphrase: state.pgpForm.passphrase });
      const decrypted = result?.data?.body || result?.data;
      globalThis.alert?.(decrypted || "Déchiffrement terminé.");
    } catch (error) {
      notify({ type: "error", title: "PGP", message: errorDescription(error) });
    }
  }

  async function loadPush() {
    if (!mailApi?.pushSubscriptions) { state.pushSubscribed = false; return; }
    try {
      const result = await mailApi.pushSubscriptions();
      const subs = Array.isArray(result) ? result : (result?.data || []);
      state.pushSubscribed = subs.length > 0;
    } catch (error) {
      state.pushSubscribed = false;
    }
  }

  async function togglePushSubscribe() {
    if (!mailApi?.pushVapidKey || !mailApi?.pushSubscribe) {
      notify({ type: "warning", title: "Push", message: "Notifications push non disponibles." });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.register) {
      notify({ type: "warning", title: "Push", message: "Service Worker non supporté." });
      return;
    }
    state.pushLoading = true;
    renderSidebar();
    try {
      const vapidResult = await mailApi.pushVapidKey();
      const vapidKey = vapidResult?.data?.publicKey || vapidResult?.data;
      if (!vapidKey) throw new Error("Clé VAPID introuvable.");
      const registration = await navigator.serviceWorker.ready;
      let sub;
      if (state.pushSubscribed) {
        sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          if (mailApi.pushUnsubscribe) await mailApi.pushUnsubscribe(sub.endpoint);
        }
        state.pushSubscribed = false;
        notify({ type: "success", title: "Push", message: "Désabonnement effectué." });
      } else {
        sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
        const json = sub.toJSON();
        await mailApi.pushSubscribe({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, keys: json.keys });
        state.pushSubscribed = true;
        notify({ type: "success", title: "Push", message: "Notifications activées." });
      }
    } catch (error) {
      notify({ type: "error", title: "Push", message: errorDescription(error) });
    }
    state.pushLoading = false;
    renderSidebar();
  }

  async function sendPushTest() {
    if (!mailApi?.pushSend) return;
    try {
      await mailApi.pushSend({ title: "ETHONE Mail", body: "Test de notification." });
      notify({ type: "success", title: "Push", message: "Notification envoyée." });
    } catch (error) {
      notify({ type: "error", title: "Push", message: errorDescription(error) });
    }
  }

  async function loadLists() {
    if (!mailApi?.lists) { state.lists = []; return; }
    try {
      const result = await mailApi.lists();
      state.lists = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      notify({ type: "error", title: "Listes", message: errorDescription(error) });
      state.lists = [];
    }
  }

  async function loadListMembers(listId) {
    if (!mailApi?.listMembers || !listId) return;
    try {
      const result = await mailApi.listMembers(listId);
      state.listMembers[listId] = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      state.listMembers[listId] = [];
    }
  }

  async function saveList() {
    if (!mailApi?.createList || !mailApi?.updateList) return;
    const { id, name, description, address } = state.listForm;
    if (!name) { notify({ type: "warning", title: "Liste", message: "Nom requis." }); return; }
    try {
      if (id) {
        await mailApi.updateList({ id, name, description, address });
        notify({ type: "success", title: "Liste", message: "Liste mise à jour." });
      } else {
        await mailApi.createList({ name, description, address });
        notify({ type: "success", title: "Liste", message: "Liste créée." });
      }
      state.listForm = { id: null, name: "", description: "", address: "" };
      await loadLists();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Liste", message: errorDescription(error) });
    }
  }

  async function deleteList(id) {
    if (!mailApi?.deleteList) return;
    try {
      await mailApi.deleteList(id);
      notify({ type: "success", title: "Liste", message: "Liste supprimée." });
      if (state.selectedListId === id) state.selectedListId = null;
      await loadLists();
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Liste", message: errorDescription(error) });
    }
  }

  async function addListMember(listId, email, name) {
    if (!mailApi?.addListMember) return;
    if (!email) return;
    try {
      await mailApi.addListMember({ list_id: listId, email, name });
      notify({ type: "success", title: "Liste", message: "Membre ajouté." });
      await loadListMembers(listId);
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Liste", message: errorDescription(error) });
    }
  }

  async function removeListMember(listId, email) {
    if (!mailApi?.removeListMember) return;
    try {
      await mailApi.removeListMember(listId, email);
      notify({ type: "success", title: "Liste", message: "Membre retiré." });
      await loadListMembers(listId);
      renderSidebar();
    } catch (error) {
      notify({ type: "error", title: "Liste", message: errorDescription(error) });
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }

  function domainFromEmail(email) {
    return String(email || "").split("@")[1] || "";
  }

  function buildSecurityBar(message) {
    const auth = message.auth_results || {};
    const sourceIp = message.source_ip || "";
    const badge = (label, value) => {
      const status = ["pass", "fail", "neutral"].includes(value) ? value : "none";
      return element("span", { className: `v8-mail-security__badge is-${status}`, text: `${label} ${value || "none"}` });
    };
    const children = [
      badge("SPF", auth.spf),
      badge("DKIM", auth.dkim),
      badge("DMARC", auth.dmarc)
    ];
    if (sourceIp) {
      children.push(element("span", { className: "v8-mail-security__source", text: `IP: ${sourceIp}` }));
    }
    return element("div", { className: "v8-mail-security-bar" }, children);
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

  function hasActiveFilters() {
    const f = state.filters;
    return !!(f.from || f.subject || f.body || f.date_from || f.date_to || f.has_attachments || f.label);
  }

  function buildFilterPayload() {
    const payload = { limit: 50, offset: 0 };
    if (state.query) payload.q = state.query;
    if (state.filters.from) payload.from = state.filters.from;
    if (state.filters.subject) payload.subject = state.filters.subject;
    if (state.filters.body) payload.body = state.filters.body;
    if (state.filters.date_from) payload.date_from = state.filters.date_from;
    if (state.filters.date_to) payload.date_to = state.filters.date_to;
    if (state.filters.has_attachments) payload.has_attachments = "true";
    if (state.filters.label) payload.labels = state.filters.label;
    payload.folder = state.filters.folder || state.folder;
    return payload;
  }

  function toggleFilters() {
    state.filtersOpen = !state.filtersOpen;
    filterPanel.hidden = !state.filtersOpen;
  }

  function applyFilters() {
    state.filters = {
      from: filterFromInput.value.trim(),
      subject: filterSubjectInput.value.trim(),
      body: filterBodyInput.value.trim(),
      date_from: filterDateFromInput.value,
      date_to: filterDateToInput.value,
      has_attachments: filterHasAttachmentsInput.checked,
      label: filterLabelInput.value.trim(),
      folder: filterFolderSelect.value
    };
    state.filtersOpen = false;
    filterPanel.hidden = true;
    state.selected = null;
    setView("list");
    renderReading();
    loadFolder();
  }

  function resetFilters() {
    state.filters = { from: "", subject: "", body: "", date_from: "", date_to: "", has_attachments: false, label: "", folder: "" };
    state.filtersOpen = false;
    filterPanel.hidden = true;
    filterFromInput.value = "";
    filterSubjectInput.value = "";
    filterBodyInput.value = "";
    filterDateFromInput.value = "";
    filterDateToInput.value = "";
    filterHasAttachmentsInput.checked = false;
    filterLabelInput.value = "";
    filterFolderSelect.value = "";
    state.query = "";
    state.isSearch = false;
    searchInput.value = "";
    state.selected = null;
    setView("list");
    renderReading();
    loadFolder();
  }

  async function loadTemplates() {
    if (!mailApi?.templates) {
      state.templates = [];
      return;
    }
    try {
      const result = await mailApi.templates(100);
      state.templates = Array.isArray(result) ? result : (result?.data || []);
      await mailCache.putTemplates(state.templates);
    } catch (error) {
      notify({ type: "error", title: "Modèles", message: errorDescription(error) });
      state.templates = [];
    }
    renderSidebar();
  }

  async function saveTemplateForm() {
    if (!mailApi?.saveTemplate || !mailApi?.updateTemplate) return;
    const payload = {
      id: state.templateForm.id || undefined,
      name: state.templateForm.name.trim(),
      subject: state.templateForm.subject.trim(),
      content: state.templateForm.content.trim(),
      is_default: state.templateForm.is_default
    };
    if (!payload.name) {
      notify({ type: "warning", title: "Modèle", message: "Nom requis." });
      return;
    }
    try {
      if (state.templateForm.id) {
        await mailApi.updateTemplate({ id: state.templateForm.id, ...payload });
      } else {
        await mailApi.saveTemplate(payload);
      }
      notify({ type: "success", title: "Modèle", message: state.templateForm.id ? "Modèle mis à jour." : "Modèle enregistré." });
      state.templateForm = { id: null, name: "", subject: "", content: "", is_default: false };
      await loadTemplates();
    } catch (error) {
      notify({ type: "error", title: "Modèle", message: errorDescription(error) });
    }
  }

  async function deleteMailTemplate(id) {
    if (!mailApi?.deleteTemplate) return;
    try {
      await mailApi.deleteTemplate(id);
      notify({ type: "success", title: "Modèle", message: "Modèle supprimé." });
      if (String(state.templateForm.id) === String(id)) state.templateForm = { id: null, name: "", subject: "", content: "", is_default: false };
      await loadTemplates();
    } catch (error) {
      notify({ type: "error", title: "Modèle", message: errorDescription(error) });
    }
  }

  async function setDefaultMailTemplate(id) {
    if (!mailApi?.updateTemplate) return;
    try {
      await mailApi.updateTemplate({ id, is_default: true });
      notify({ type: "success", title: "Modèle", message: "Modèle par défaut défini." });
      await loadTemplates();
    } catch (error) {
      notify({ type: "error", title: "Modèle", message: errorDescription(error) });
    }
  }

  async function loadFolder() {
    state.loading = true;
    state.error = null;
    state.isSearch = hasActiveFilters() || (state.isSearch && !!state.query);
    renderList();
    try {
      let result;
      if (hasActiveFilters()) {
        result = await mailApi.advancedSearch(buildFilterPayload());
      } else if (state.folder === "drafts") {
        result = await mailApi.drafts({ limit: 50, offset: 0 });
      } else {
        result = await mailApi.inbox({ folder: state.folder, limit: 50, offset: 0 });
      }
      state.messages = Array.isArray(result) ? result : (result?.data || []);
      const unread = result?.unread_count;
      state.counts[state.folder] = typeof unread === "number" ? unread : state.messages.filter((m) => !m.is_read).length;
      await mailCache.putMessages(state.folder, state.messages);
    } catch (error) {
      state.error = error;
      notify({ type: "error", title: "Mail", message: errorDescription(error) });
    }
    state.loading = false;
    state.selectedIds.clear();
    masterCheckbox.checked = false;
    renderBulkToolbar();
    renderList();
    renderSidebar();
  }

  async function loadAnalytics(period) {
    if (!mailApi?.analytics) {
      notify({ type: "warning", title: "Analytique", message: "L'analytique n'est pas disponible." });
      return;
    }
    try {
      state.analyticsOpen = true;
      state.analyticsPeriod = period;
      state.loading = true;
      renderAnalyticsLoading();
      const result = await mailApi.analytics(period);
      state.analytics = result?.data || null;
      state.loading = false;
      if (!state.analytics) {
        notify({ type: "warning", title: "Analytique", message: "Aucune donnée disponible." });
        closeAnalytics();
        return;
      }
      renderAnalytics(state.analytics);
    } catch (error) {
      state.loading = false;
      notify({ type: "error", title: "Analytique", message: errorDescription(error) });
      closeAnalytics();
    }
  }

  function closeAnalytics() {
    state.analyticsOpen = false;
    if (analyticsPanel) analyticsPanel.hidden = true;
    if (messageList) messageList.hidden = false;
    renderList();
  }

  function renderAnalyticsLoading() {
    if (!analyticsPanel) return;
    analyticsPanel.replaceChildren(buildSkeletonList(4));
    analyticsPanel.hidden = false;
    if (messageList) messageList.hidden = true;
    refreshIcons();
  }

  function renderAnalytics(stats) {
    if (!analyticsPanel) return;
    listTitle.textContent = `Analytique (${state.analyticsPeriod} jours)`;

    const grid = element("div", { className: "v8-mail-analytics__grid" }, [
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.total || 0) }), element("span", { text: "Total" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.inbound || 0) }), element("span", { text: "Reçus" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.outbound || 0) }), element("span", { text: "Envoyés" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.read || 0) }), element("span", { text: "Lus" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.unread || 0) }), element("span", { text: "Non lus" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.starred || 0) }), element("span", { text: "Favoris" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.spam || 0) }), element("span", { text: "Spam" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.attachments || 0) }), element("span", { text: "Avec pièces jointes" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: formatSize(stats.totalSize || 0) }), element("span", { text: "Volume total" })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: formatSize(stats.averageSize || 0) }), element("span", { text: "Taille moyenne" })])
    ]);

    const byFolder = stats.byFolder || {};
    const folderList = element("ul", { className: "v8-mail-analytics__folder-list" });
    Object.entries(byFolder).forEach(([folder, count]) => {
      const label = FOLDERS.find((f) => f.key === folder)?.label || folder;
      folderList.append(element("li", {}, [element("span", { text: `${label}` }), element("span", { className: "v8-mail-analytics__folder-count", text: String(count) })]));
    });
    const topSendersList = element("ul", { className: "v8-mail-analytics__sender-list" });
    if (Array.isArray(stats.topSenders) && stats.topSenders.length) {
      stats.topSenders.forEach((sender) => {
        topSendersList.append(element("li", {}, [
          element("span", { text: clean(sender.name || sender.email || "Inconnu", "", 120) }),
          element("span", { className: "v8-mail-analytics__sender-count", text: String(sender.count || 0) })
        ]));
      });
    } else {
      topSendersList.append(element("li", { text: "Aucun expéditeur" }));
    }

    const dayMax = Math.max(1, ...(stats.topDays || []).map((d) => d.count || 0));
    const dayChart = element("div", { className: "v8-mail-analytics__chart" });
    (stats.topDays || []).forEach((d) => {
      dayChart.append(buildBar(String(d.day), d.count || 0, dayMax));
    });

    const hourMax = Math.max(1, ...(stats.topHours || []).map((h) => h.count || 0));
    const hourChart = element("div", { className: "v8-mail-analytics__chart" });
    (stats.topHours || []).forEach((h) => {
      hourChart.append(buildBar(String(h.hour), h.count || 0, hourMax));
    });

    const closeBtn = actionButton({ actionId: "v8.mail.analytics.close", variant: "outline", className: "v8-mail-analytics__close" }, [element("span", { text: "Fermer" })]);
    closeBtn.addEventListener("click", closeAnalytics);

    const topSendersTitle = element("strong", { className: "v8-mail-analytics__section-title", text: "Principaux expéditeurs" });
    const daysTitle = element("strong", { className: "v8-mail-analytics__section-title", text: "Messages par jour" });
    const hoursTitle = element("strong", { className: "v8-mail-analytics__section-title", text: "Messages par heure" });
    const foldersTitle = element("strong", { className: "v8-mail-analytics__section-title", text: "Par dossier" });

    analyticsPanel.replaceChildren(
      closeBtn,
      grid,
      foldersTitle,
      folderList,
      topSendersTitle,
      topSendersList,
      daysTitle,
      dayChart,
      hoursTitle,
      hourChart
    );
    analyticsPanel.hidden = false;
    if (messageList) messageList.hidden = true;
    refreshIcons();
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
    closeAnalytics();
    state.folder = key;
    state.view = "list";
    state.selected = null;
    state.selectedIds.clear();
    if (masterCheckbox) masterCheckbox.checked = false;
    renderBulkToolbar();
    state.isSearch = false;
    state.query = "";
    searchInput.value = "";
    state.filters.folder = "";
    if (filterFolderSelect) filterFolderSelect.value = "";
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
      await withQueue("read", { id: message.id, flags: { is_read: true } });
    } catch {
      // ignore
    }
  }

  async function toggleStar(message) {
    if (!message) return;
    const next = !message.is_starred;
    message.is_starred = next;
    try {
      await withQueue("star", { id: message.id, isStarred: next });
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
      await withQueue("important", { id: message.id, isImportant: next });
    } catch {
      // ignore
    }
    if (state.selected?.id === message.id) renderReading();
    renderList();
  }

  async function moveMessage(message, folder) {
    if (!message) return;
    try {
      await withQueue("move", { ids: [message.id], folder });
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
      await withQueue("label", { ids, label: labelName, remove });
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

    const analyticsTitle = element("strong", { className: "v8-mail-sidebar__section", text: "Analytique" });
    const analyticsPeriodSelect = element("select", { className: "v8-input v8-mail-analytics__select" }, [
      element("option", { text: "7 jours", attributes: { value: "7" } }),
      element("option", { text: "30 jours", attributes: { value: "30", selected: "" } }),
      element("option", { text: "90 jours", attributes: { value: "90" } })
    ]);
    analyticsPeriodSelect.value = String(state.analyticsPeriod || 30);
    const analyticsOpenBtn = actionButton({ actionId: "v8.mail.analytics.open", variant: "secondary", className: "v8-mail-analytics__open" }, [element("span", { text: "Ouvrir" })]);
    analyticsOpenBtn.addEventListener("click", () => loadAnalytics(Number(analyticsPeriodSelect.value) || 30));

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
    const ruleAutoReplyInput = element("textarea", {
      className: "v8-input v8-mail-rule-auto-reply",
      attributes: { rows: "3", placeholder: "Réponse automatique (optionnel)" }
    });
    const ruleSaveBtn = actionButton({ actionId: "v8.mail.rule.save", variant: "secondary" }, [icon("plus"), element("span", { text: "Créer" })]);
    const ruleForm = element("div", { className: "v8-mail-rules__form" }, [ruleNameInput, ruleConditionInput, ruleActionType, ruleTargetInput, ruleAutoReplyInput, ruleSaveBtn]);

    ruleSaveBtn.addEventListener("click", async () => {
      const payload = {
        name: ruleNameInput.value.trim(),
        condition: { subject: ruleConditionInput.value.trim() },
        action: { type: ruleActionType.value, target: ruleTargetInput.value.trim() },
        action_auto_reply: ruleAutoReplyInput.value.trim(),
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
      ruleAutoReplyInput.value = "";
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

    const templatesTitle = element("strong", { className: "v8-mail-sidebar__section", text: "Modèles" });

    const templateNameInput = element("input", {
      className: "v8-input v8-mail-template-input",
      attributes: { type: "text", placeholder: "Nom du modèle", maxlength: "64", value: state.templateForm.name || "" }
    });
    const templateSubjectInput = element("input", {
      className: "v8-input v8-mail-template-input",
      attributes: { type: "text", placeholder: "Sujet", maxlength: "128", value: state.templateForm.subject || "" }
    });
    const templateContentInput = element("textarea", {
      className: "v8-input v8-mail-template-content",
      attributes: { rows: "4", placeholder: "Contenu" }
    });
    templateContentInput.value = state.templateForm.content || "";
    const templateDefaultInput = element("input", {
      className: "v8-mail-template__checkbox",
      attributes: { type: "checkbox" }
    });
    templateDefaultInput.checked = state.templateForm.is_default || false;
    const templateDefaultLabel = element("label", { className: "v8-mail-template__check" }, [
      templateDefaultInput,
      element("span", { text: "Par défaut" })
    ]);
    const templateSaveBtn = actionButton({
      actionId: "v8.mail.template.save",
      variant: "secondary",
      className: "v8-mail-template__save"
    }, [icon("save"), element("span", { text: state.templateForm.id ? "Mettre à jour" : "Enregistrer" })]);
    templateSaveBtn.addEventListener("click", saveTemplateForm);

    const templateResetBtn = actionButton({
      actionId: "v8.mail.template.reset",
      variant: "outline",
      className: "v8-mail-template__reset"
    }, [icon("x"), element("span", { text: "Nouveau" })]);
    templateResetBtn.addEventListener("click", () => {
      state.templateForm = { id: null, name: "", subject: "", content: "", is_default: false };
      renderSidebar();
    });

    templateNameInput.addEventListener("input", () => { state.templateForm.name = templateNameInput.value; });
    templateSubjectInput.addEventListener("input", () => { state.templateForm.subject = templateSubjectInput.value; });
    templateContentInput.addEventListener("input", () => { state.templateForm.content = templateContentInput.value; });
    templateDefaultInput.addEventListener("change", () => { state.templateForm.is_default = templateDefaultInput.checked; });

    const templateForm = element("div", { className: "v8-mail-templates__form" }, [
      templateNameInput,
      templateSubjectInput,
      templateContentInput,
      templateDefaultLabel,
      templateSaveBtn,
      templateResetBtn
    ]);

    const templatesList = element("ul", { className: "v8-mail-templates__list" });
    state.templates.forEach((template) => {
      const name = template.name || "Modèle";
      const isDefault = template.is_default === true;
      const actions = element("span", { className: "v8-mail-template-item__actions" });
      if (!isDefault) {
        const defaultBtn = element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": `Définir ${name} par défaut` }
        }, [icon("check")]);
        defaultBtn.addEventListener("click", (event) => { event.stopPropagation(); setDefaultMailTemplate(template.id); });
        actions.append(defaultBtn);
      }
      const deleteBtn = element("button", {
        className: "v8-icon-button",
        attributes: { type: "button", "aria-label": `Supprimer ${name}` }
      }, [icon("trash-2")]);
      deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deleteMailTemplate(template.id); });
      actions.append(deleteBtn);

      const item = element("li", { className: "v8-mail-template-item" }, [
        element("span", { className: "v8-mail-template-item__info" }, [
          element("strong", { text: name }),
          element("small", { text: template.subject || "" })
        ]),
        actions
      ]);
      item.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        state.templateForm = { ...template };
        renderSidebar();
      });
      templatesList.append(item);
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

    const accountsSection = buildAccountsSection();
    const pgpSection = buildPgpSection();
    const pushSection = buildPushSection();
    const listsSection = buildListsSection();
    const securitySection = buildSecuritySection();
    sidebar.append(title, folderList, analyticsTitle, analyticsPeriodSelect, analyticsOpenBtn, rulesTitle, ruleForm, rulesList, templatesTitle, templateForm, templatesList, notificationsTitle, notificationsList, labelsTitle, labelList, newLabelInput, accountsSection, pgpSection, pushSection, listsSection, securitySection);
    renderBell();
    refreshIcons();
  }

  function buildAccountsSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: "Comptes externes" });
    const list = element("ul", { className: "v8-mail-accounts__list" });
    if (state.accounts.length) {
      state.accounts.forEach((account) => {
        const label = `${account.provider || "?"} — ${account.email || account.label || ""}`;
        const actions = element("span", { className: "v8-mail-accounts__actions" });
        const syncBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Synchroniser" } }, [icon("refresh-cw")]);
        syncBtn.addEventListener("click", (event) => { event.stopPropagation(); syncAccount(account.id); });
        const deleteBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer" } }, [icon("trash-2")]);
        deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deleteAccount(account.id); });
        actions.append(syncBtn, deleteBtn);
        list.append(element("li", { className: "v8-mail-accounts__item" }, [element("span", { className: "v8-mail-accounts__label", text: label }), actions]));
      });
    } else {
      list.append(element("li", { className: "v8-mail-accounts__item", text: "Aucun compte externe." }));
    }

    const providerInput = element("input", { className: "v8-input v8-mail-accounts__input", attributes: { type: "text", placeholder: "Fournisseur (gmail, outlook...)", value: state.accountForm.provider } });
    const emailInput = element("input", { className: "v8-input v8-mail-accounts__input", attributes: { type: "email", placeholder: "Email", value: state.accountForm.email } });
    const labelInput = element("input", { className: "v8-input v8-mail-accounts__input", attributes: { type: "text", placeholder: "Libellé", value: state.accountForm.label } });
    providerInput.addEventListener("input", () => { state.accountForm.provider = providerInput.value; });
    emailInput.addEventListener("input", () => { state.accountForm.email = emailInput.value; });
    labelInput.addEventListener("input", () => { state.accountForm.label = labelInput.value; });
    const addBtn = actionButton({ actionId: "v8.mail.account.add", variant: "secondary", className: "v8-mail-accounts__add" }, [icon("plus"), element("span", { text: "Ajouter" })]);
    addBtn.addEventListener("click", () => addAccount(providerInput.value.trim(), emailInput.value.trim(), labelInput.value.trim()));
    const form = element("div", { className: "v8-mail-accounts__form" }, [providerInput, emailInput, labelInput, addBtn]);
    return element("div", { className: "v8-mail-sidebar__accounts" }, [title, list, form]);
  }

  function buildPgpSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: "Clés PGP" });
    const list = element("ul", { className: "v8-mail-pgp__list" });
    if (state.pgpKeys.length) {
      state.pgpKeys.forEach((key) => {
        const label = `${key.email || key.name || "Clé"}${key.fingerprint ? ` (${String(key.fingerprint).slice(0, 16)}...)` : ""}`;
        const deleteBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer" } }, [icon("trash-2")]);
        deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deletePgpKey(key.id); });
        list.append(element("li", { className: "v8-mail-pgp__item" }, [element("span", { className: "v8-mail-pgp__label", text: label }), deleteBtn]));
      });
    } else {
      list.append(element("li", { className: "v8-mail-pgp__item", text: "Aucune clé PGP." }));
    }

    const emailInput = element("input", { className: "v8-input v8-mail-pgp__input", attributes: { type: "email", placeholder: "Email", value: state.pgpForm.email } });
    const publicInput = element("textarea", { className: "v8-input v8-mail-pgp__textarea", attributes: { rows: "3", placeholder: "Clé publique (optionnel)" } });
    publicInput.value = state.pgpForm.publicKey;
    const privateInput = element("textarea", { className: "v8-input v8-mail-pgp__textarea", attributes: { rows: "2", placeholder: "Clé privée — laisser vide pour générer côté Worker" } });
    privateInput.value = state.pgpForm.privateKey;
    const passphraseInput = element("input", { className: "v8-input v8-mail-pgp__input", attributes: { type: "password", placeholder: "Passphrase" } });
    passphraseInput.value = state.pgpForm.passphrase;
    emailInput.addEventListener("input", () => { state.pgpForm.email = emailInput.value; });
    publicInput.addEventListener("input", () => { state.pgpForm.publicKey = publicInput.value; });
    privateInput.addEventListener("input", () => { state.pgpForm.privateKey = privateInput.value; });
    passphraseInput.addEventListener("input", () => { state.pgpForm.passphrase = passphraseInput.value; });
    const saveBtn = actionButton({ actionId: "v8.mail.pgp.key.create", variant: "secondary", className: "v8-mail-pgp__add" }, [icon("key"), element("span", { text: "Enregistrer" })]);
    saveBtn.addEventListener("click", createPgpKey);
    const encryptBtn = actionButton({ actionId: "v8.mail.pgp.encrypt", variant: "outline", className: "v8-mail-pgp__tool" }, [icon("lock"), element("span", { text: "Chiffrer" })]);
    const decryptBtn = actionButton({ actionId: "v8.mail.pgp.decrypt", variant: "outline", className: "v8-mail-pgp__tool" }, [icon("unlock"), element("span", { text: "Déchiffrer" })]);
    encryptBtn.addEventListener("click", pgpEncrypt);
    decryptBtn.addEventListener("click", pgpDecrypt);
    const tools = element("div", { className: "v8-mail-pgp__tools" }, [encryptBtn, decryptBtn]);
    const form = element("div", { className: "v8-mail-pgp__form" }, [emailInput, publicInput, privateInput, passphraseInput, saveBtn, tools]);
    return element("div", { className: "v8-mail-sidebar__pgp" }, [title, list, form]);
  }

  function buildPushSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: "Notifications push" });
    const status = element("span", { className: "v8-mail-push__status", text: state.pushLoading ? "Chargement..." : state.pushSubscribed ? "Abonné" : "Non abonné" });
    const toggleBtn = actionButton({ actionId: "v8.mail.push.toggle", variant: state.pushSubscribed ? "outline" : "secondary", className: "v8-mail-push__toggle", disabled: state.pushLoading }, [icon("bell"), element("span", { text: state.pushSubscribed ? "Se désabonner" : "S'abonner" })]);
    toggleBtn.addEventListener("click", togglePushSubscribe);
    const testBtn = actionButton({ actionId: "v8.mail.push.send", variant: "outline", className: "v8-mail-push__send" }, [icon("send"), element("span", { text: "Tester" })]);
    testBtn.addEventListener("click", sendPushTest);
    return element("div", { className: "v8-mail-sidebar__push" }, [title, status, toggleBtn, testBtn]);
  }

  function buildListsSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: "Listes de diffusion" });
    const list = element("ul", { className: "v8-mail-lists__list" });
    if (state.lists.length) {
      state.lists.forEach((l) => {
        const isSelected = state.selectedListId === l.id;
        const label = `${l.name || "Liste"}${l.address ? ` <${l.address}>` : ""}`;
        const actions = element("span", { className: "v8-mail-lists__actions" });
        const editBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Modifier" } }, [icon("pencil")]);
        editBtn.addEventListener("click", (event) => { event.stopPropagation(); state.listForm = { id: l.id, name: l.name || "", description: l.description || "", address: l.address || "" }; renderSidebar(); });
        const deleteBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer" } }, [icon("trash-2")]);
        deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deleteList(l.id); });
        actions.append(editBtn, deleteBtn);
        const item = element("li", { className: `v8-mail-lists__item${isSelected ? " is-active" : ""}` }, [element("span", { className: "v8-mail-lists__label", text: label }), actions]);
        item.addEventListener("click", async () => { state.selectedListId = isSelected ? null : l.id; if (state.selectedListId) await loadListMembers(l.id); renderSidebar(); });
        list.append(item);
      });
    } else {
      list.append(element("li", { className: "v8-mail-lists__item", text: "Aucune liste." }));
    }

    const nameInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: "Nom", value: state.listForm.name } });
    const addressInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: "Adresse liste", value: state.listForm.address } });
    const descInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: "Description", value: state.listForm.description } });
    nameInput.addEventListener("input", () => { state.listForm.name = nameInput.value; });
    addressInput.addEventListener("input", () => { state.listForm.address = addressInput.value; });
    descInput.addEventListener("input", () => { state.listForm.description = descInput.value; });
    const saveBtn = actionButton({ actionId: "v8.mail.list.save", variant: "secondary", className: "v8-mail-lists__save" }, [icon("save"), element("span", { text: state.listForm.id ? "Mettre à jour" : "Créer" })]);
    saveBtn.addEventListener("click", saveList);
    const resetBtn = actionButton({ actionId: "v8.mail.list.reset", variant: "outline", className: "v8-mail-lists__reset" }, [icon("x"), element("span", { text: "Nouveau" })]);
    resetBtn.addEventListener("click", () => { state.listForm = { id: null, name: "", description: "", address: "" }; renderSidebar(); });
    const form = element("div", { className: "v8-mail-lists__form" }, [nameInput, addressInput, descInput, saveBtn, resetBtn]);

    let membersPanel = null;
    if (state.selectedListId) {
      const members = state.listMembers[state.selectedListId] || [];
      const membersList = element("ul", { className: "v8-mail-lists__members" });
      if (members.length) {
        members.forEach((m) => {
          const removeBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Retirer" } }, [icon("x")]);
          removeBtn.addEventListener("click", (event) => { event.stopPropagation(); removeListMember(state.selectedListId, m.email); });
          membersList.append(element("li", { className: "v8-mail-lists__member" }, [element("span", { text: m.name ? `${m.name} <${m.email}>` : m.email }), removeBtn]));
        });
      } else {
        membersList.append(element("li", { className: "v8-mail-lists__member", text: "Aucun membre." }));
      }
      const memberEmailInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "email", placeholder: "Email du membre" } });
      const memberNameInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: "Nom (optionnel)" } });
      const addMemberBtn = actionButton({ actionId: "v8.mail.list.member.add", variant: "secondary", className: "v8-mail-lists__add-member" }, [icon("plus"), element("span", { text: "Ajouter" })]);
      addMemberBtn.addEventListener("click", () => { addListMember(state.selectedListId, memberEmailInput.value.trim(), memberNameInput.value.trim()); memberEmailInput.value = ""; memberNameInput.value = ""; });
      membersPanel = element("div", { className: "v8-mail-lists__members-panel" }, [element("strong", { className: "v8-mail-lists__members-title", text: "Membres" }), membersList, memberEmailInput, memberNameInput, addMemberBtn]);
    }

    const children = [title, list, form];
    if (membersPanel) children.push(membersPanel);
    return element("div", { className: "v8-mail-sidebar__lists" }, children);
  }

  function buildSecuritySection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: "Sécurité" });

    const blockedTab = element("button", {
      className: `v8-mail-security__tab${state.securityTab === "blocked" ? " is-active" : ""}`,
      attributes: { type: "button" },
      text: "Bloqués"
    });
    const trustedTab = element("button", {
      className: `v8-mail-security__tab${state.securityTab === "trusted" ? " is-active" : ""}`,
      attributes: { type: "button" },
      text: "Fiables"
    });
    blockedTab.addEventListener("click", () => { state.securityTab = "blocked"; renderSidebar(); });
    trustedTab.addEventListener("click", () => { state.securityTab = "trusted"; renderSidebar(); });

    const list = element("ul", { className: "v8-mail-security__list" });
    const items = state.securityTab === "blocked" ? state.blocked : state.trusted;
    if (items.length) {
      items.forEach((item) => {
        const label = item.email || item.domain || "Inconnu";
        const deleteBtn = element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": `Supprimer ${label}` }
        }, [icon("x")]);
        deleteBtn.addEventListener("click", () => {
          if (state.securityTab === "blocked") unblockSenderFrom(item.id);
          else untrustSenderFrom(item.id);
        });
        const itemNode = element("li", { className: "v8-mail-security__item" }, [
          element("span", { className: "v8-mail-security__item-label", text: label }),
          deleteBtn
        ]);
        list.append(itemNode);
      });
    } else {
      list.append(element("li", {
        className: "v8-mail-security__item",
        text: state.securityTab === "blocked" ? "Aucun expéditeur bloqué." : "Aucun expéditeur fiable."
      }));
    }

    const emailInput = element("input", { className: "v8-input v8-mail-security__input", attributes: { type: "text", placeholder: "Email" } });
    const domainInput = element("input", { className: "v8-input v8-mail-security__input", attributes: { type: "text", placeholder: "Domaine" } });
    const reasonInput = element("input", { className: "v8-input v8-mail-security__input", attributes: { type: "text", placeholder: "Raison" } });

    const addBtn = actionButton({
      actionId: state.securityTab === "blocked" ? "v8.mail.security.block" : "v8.mail.security.trust",
      variant: "secondary",
      className: "v8-mail-security__add"
    }, [element("span", { text: state.securityTab === "blocked" ? "Bloquer" : "Faire confiance" })]);
    addBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const domain = domainInput.value.trim();
      const reason = reasonInput.value.trim();
      if (!email && !domain) {
        notify({ type: "warning", title: "Sécurité", message: "Saisissez un email ou un domaine." });
        return;
      }
      if (state.securityTab === "blocked") {
        await blockSenderFrom(email, domain, reason || "manual");
      } else {
        await trustSenderFrom(email, domain);
      }
      emailInput.value = "";
      domainInput.value = "";
      reasonInput.value = "";
    });

    const formChildren = [emailInput, domainInput];
    if (state.securityTab === "blocked") formChildren.push(reasonInput);
    formChildren.push(addBtn);
    const form = element("div", { className: "v8-mail-security__form" }, formChildren);

    return element("div", { className: "v8-mail-sidebar__security" }, [
      title,
      element("div", { className: "v8-mail-security__tabs" }, [blockedTab, trustedTab]),
      list,
      form
    ]);
  }

  function buildBulkToolbar() {
    const archiveBtn = actionButton({ actionId: "v8.mail.bulk.archive", className: "v8-mail-bulk__btn" }, [icon("archive"), element("span", { text: "Archiver" })]);
    const deleteBtn = actionButton({ actionId: "v8.mail.bulk.delete", className: "v8-mail-bulk__btn" }, [icon("trash-2"), element("span", { text: "Supprimer" })]);
    const readBtn = actionButton({ actionId: "v8.mail.bulk.read", className: "v8-mail-bulk__btn" }, [icon("mail-open"), element("span", { text: "Marquer lu" })]);
    const unreadBtn = actionButton({ actionId: "v8.mail.bulk.unread", className: "v8-mail-bulk__btn" }, [icon("mail"), element("span", { text: "Marquer non lu" })]);
    const importantBtn = actionButton({ actionId: "v8.mail.bulk.important", className: "v8-mail-bulk__btn" }, [icon("alert-circle"), element("span", { text: "Important" })]);
    const unimportantBtn = actionButton({ actionId: "v8.mail.bulk.unimportant", className: "v8-mail-bulk__btn" }, [icon("alert-octagon"), element("span", { text: "Non important" })]);
    const labelBtn = actionButton({ actionId: "v8.mail.bulk.label", className: "v8-mail-bulk__btn" }, [icon("tag"), element("span", { text: "Étiqueter" })]);
    const unlabelBtn = actionButton({ actionId: "v8.mail.bulk.unlabel", className: "v8-mail-bulk__btn" }, [icon("tag-off"), element("span", { text: "Désétiqueter" })]);
    const snoozeBtn = actionButton({ actionId: "v8.mail.bulk.snooze", className: "v8-mail-bulk__btn" }, [icon("clock"), element("span", { text: "Snooze" })]);

    archiveBtn.addEventListener("click", () => bulkAction("move", "archive"));
    deleteBtn.addEventListener("click", () => bulkAction("move", "trash"));
    readBtn.addEventListener("click", () => bulkAction("mark_read", true));
    unreadBtn.addEventListener("click", () => bulkAction("mark_read", false));
    importantBtn.addEventListener("click", () => bulkAction("mark_important", true));
    unimportantBtn.addEventListener("click", () => bulkAction("mark_important", false));
    labelBtn.addEventListener("click", () => bulkLabel(false));
    unlabelBtn.addEventListener("click", () => bulkLabel(true));
    snoozeBtn.addEventListener("click", () => bulkSnooze());

    const toolbar = element("div", { className: "v8-mail-bulk-toolbar", attributes: { hidden: "" } }, [
      element("span", { className: "v8-mail-bulk__count" }),
      archiveBtn, deleteBtn, readBtn, unreadBtn, importantBtn, unimportantBtn, labelBtn, unlabelBtn, snoozeBtn
    ]);
    return toolbar;
  }

  function renderBulkToolbar() {
    if (!bulkToolbar) return;
    const count = state.selectedIds.size;
    bulkToolbar.hidden = !count;
    const countSpan = bulkToolbar.querySelector(".v8-mail-bulk__count");
    if (countSpan) countSpan.textContent = `${count} sélectionné${count > 1 ? "s" : ""}`;
  }

  function selectAll() {
    state.messages.forEach((m) => state.selectedIds.add(String(m.id)));
    masterCheckbox.checked = true;
    renderList();
    renderBulkToolbar();
  }

  function deselectAll() {
    state.selectedIds.clear();
    masterCheckbox.checked = false;
    renderList();
    renderBulkToolbar();
  }

  function toggleSelection(id) {
    const key = String(id);
    if (state.selectedIds.has(key)) state.selectedIds.delete(key);
    else state.selectedIds.add(key);
    masterCheckbox.checked = state.selectedIds.size === state.messages.length && state.messages.length > 0;
    renderList();
    renderBulkToolbar();
  }

  async function bulkAction(action, target) {
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    try {
      await withQueue("bulk", { ids, action, target });
      notify({ type: "success", title: "Action groupée", message: "Action appliquée." });
      state.messages.forEach((m) => {
        if (!ids.includes(String(m.id))) return;
        if (action === "move" && (target === "archive" || target === "trash")) {
          // local removal handled by loadFolder
        } else if (action === "mark_read") {
          m.is_read = target === true || target === "true";
        } else if (action === "mark_important") {
          m.is_important = target === true || target === "true";
        }
      });
      if (action === "move") {
        state.messages = state.messages.filter((m) => !ids.includes(String(m.id)));
      }
      state.selectedIds.clear();
      masterCheckbox.checked = false;
      renderList();
      renderBulkToolbar();
      loadFolder();
    } catch (error) {
      notify({ type: "error", title: "Action groupée", message: errorDescription(error) });
    }
  }

  async function bulkLabel(remove) {
    const labelName = globalThis.prompt?.(remove ? "Étiquette à retirer" : "Étiquette à assigner");
    if (!labelName) return;
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    try {
      await withQueue("label", { ids, label: labelName.trim(), remove });
      notify({ type: "success", title: "Étiquette", message: remove ? "Étiquette retirée." : "Étiquette assignée." });
      state.messages.forEach((m) => {
        if (!ids.includes(String(m.id))) return;
        if (remove) {
          m.labels = (m.labels || []).filter((l) => (l?.name || l) !== labelName.trim());
        } else {
          const matched = state.labels.find((l) => l.name === labelName.trim());
          if (matched && !(m.labels || []).some((l) => (l?.id || l) === matched.id)) {
            m.labels = [...(m.labels || []), matched];
          }
        }
      });
      renderList();
      if (state.selected && ids.includes(String(state.selected.id))) renderReading();
    } catch (error) {
      notify({ type: "error", title: "Étiquette", message: errorDescription(error) });
    }
  }

  function bulkSnooze() {
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    openSnoozeDialog((snoozedUntil) => performBulkSnooze(ids, snoozedUntil));
  }

  async function performBulkSnooze(ids, snoozedUntil) {
    try {
      await withQueue("bulkSnooze", { ids, snoozedUntil });
      notify({ type: "success", title: "Snooze", message: "Messages reportés." });
      state.selectedIds.clear();
      masterCheckbox.checked = false;
      renderList();
      renderBulkToolbar();
      loadFolder();
    } catch (error) {
      notify({ type: "error", title: "Snooze", message: errorDescription(error) });
    }
  }

  function buildSnoozeDialog() {
    const title = element("h3", { className: "v8-mail-snooze__title", text: "Reporter" });
    const tomorrowBtn = actionButton({ actionId: "v8.mail.snooze.tomorrow", className: "v8-mail-snooze__option" }, [element("span", { text: "Demain" })]);
    const weekBtn = actionButton({ actionId: "v8.mail.snooze.week", className: "v8-mail-snooze__option" }, [element("span", { text: "1 semaine" })]);
    const customInput = element("input", {
      className: "v8-input v8-mail-snooze__custom",
      attributes: { type: "datetime-local" }
    });
    const cancelBtn = actionButton({ actionId: "v8.mail.snooze.cancel", variant: "outline" }, [element("span", { text: "Annuler" })]);
    const confirmBtn = actionButton({ actionId: "v8.mail.snooze.confirm", variant: "primary" }, [element("span", { text: "Confirmer" })]);

    const dialog = element("div", { className: "v8-mail-snooze-dialog", attributes: { hidden: "" } }, [
      element("div", { className: "v8-mail-snooze__content" }, [
        title,
        tomorrowBtn,
        weekBtn,
        customInput,
        element("div", { className: "v8-mail-snooze__actions" }, [cancelBtn, confirmBtn])
      ])
    ]);

    let onConfirm = null;
    let selectedDate = null;

    function close() {
      dialog.hidden = true;
      selectedDate = null;
      customInput.value = "";
      onConfirm = null;
    }

    function setDate(date) {
      selectedDate = date.toISOString();
      customInput.value = toDateTimeLocalValue(date);
    }

    tomorrowBtn.addEventListener("click", () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      setDate(d);
    });

    weekBtn.addEventListener("click", () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      setDate(d);
    });

    customInput.addEventListener("change", () => {
      if (customInput.value) selectedDate = new Date(customInput.value).toISOString();
    });

    cancelBtn.addEventListener("click", close);
    confirmBtn.addEventListener("click", () => {
      if (!selectedDate) {
        notify({ type: "warning", title: "Snooze", message: "Choisissez une date." });
        return;
      }
      if (onConfirm) onConfirm(selectedDate);
      close();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });

    dialog.open = (callback) => {
      onConfirm = callback;
      dialog.hidden = false;
    };

    return dialog;
  }

  function toDateTimeLocalValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function openSnoozeDialog(onConfirm) {
    snoozeDialog?.open?.(onConfirm);
  }

  async function snoozeMessage(message) {
    if (!message) return;
    openSnoozeDialog(async (snoozedUntil) => {
      try {
        await withQueue("snooze", { id: message.id, snoozedUntil });
        notify({ type: "success", title: "Snooze", message: "Message reporté." });
        loadFolder();
      } catch (error) {
        notify({ type: "error", title: "Snooze", message: errorDescription(error) });
      }
    });
  }

  function renderList() {
    if (state.analyticsOpen) {
      messageList.hidden = true;
      if (analyticsPanel) analyticsPanel.hidden = false;
      return;
    }
    messageList.hidden = false;
    if (analyticsPanel) analyticsPanel.hidden = true;

    let label;
    if (hasActiveFilters()) {
      label = "Recherche avancée";
    } else if (state.isSearch) {
      label = `Recherche : ${state.query}`;
    } else {
      label = FOLDERS.find((f) => f.key === state.folder)?.label || "";
    }
    listTitle.textContent = `${label} (${state.messages.length})`;
    if (masterCheckbox) {
      masterCheckbox.disabled = !state.messages.length;
      masterCheckbox.checked = state.messages.length > 0 && state.messages.every((m) => state.selectedIds.has(String(m.id)));
    }
    renderBulkToolbar();
    messageList.replaceChildren();

    if (state.loading && !state.messages.length) {
      messageList.append(element("li", {}, [buildSkeletonList(5)]));
      refreshIcons();
      return;
    }

    if (state.error && !state.messages.length) {
      messageList.append(buildErrorState({
        tagName: "li",
        title: "Impossible de charger les messages",
        reason: errorDescription(state.error),
        actionText: "Réessayer",
        action: () => void loadFolder()
      }));
      refreshIcons();
      return;
    }

    if (!state.messages.length) {
      messageList.append(buildEmptyState({
        tagName: "li",
        icon: "inbox",
        title: "Aucun message",
        message: state.isSearch ? "Aucun résultat pour cette recherche." : "Ce dossier est vide.",
        actionText: state.isSearch ? "" : "Nouveau message",
        action: state.isSearch ? null : () => openCompose()
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
    const isSelected = state.selectedIds.has(String(message.id));

    const checkbox = element("input", {
      className: "v8-mail-row__checkbox",
      attributes: { type: "checkbox", "aria-label": "Sélectionner" },
      dataset: { action: "select" }
    });
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      toggleSelection(message.id);
    });

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
      checkbox,
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

  function openMessageContext(message) {
    if (!message) return;
    const items = [
      { icon: "archive", label: "Archiver", action: () => moveMessage(message, "archive") },
      { icon: "trash-2", label: "Supprimer", action: () => moveMessage(message, "trash") },
      { icon: message.is_read ? "mail-open" : "mail", label: message.is_read ? "Marquer non lu" : "Marquer lu", action: async () => {
        if (message.is_read) {
          message.is_read = false;
          try { await withQueue("read", { id: message.id, flags: { is_read: false } }); } catch {}
        } else {
          await markRead(message);
        }
        renderList();
      } },
      { icon: "clock-3", label: "Snooze", action: () => snoozeMessage(message) }
    ];
    const children = items.map((item) => element("button", {
      className: "v8-bottom-sheet__action",
      attributes: { type: "button" },
      events: { click: (event) => { event.stopPropagation(); item.action(); } }
    }, [icon(item.icon), element("span", { text: item.label })]));
    showBottomSheet({ title: "Actions", children });
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
      reading.append(buildEmptyState({
        icon: "mail-open",
        title: "Sélectionnez un message",
        message: "Choisissez un message dans la liste pour le lire."
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
    const snoozeBtn = actionButton({
      actionId: "v8.mail.snooze",
      className: "v8-icon-button",
      ariaLabel: "Snooze"
    }, [icon("clock")]);

    replyBtn.addEventListener("click", () => openReply(message));
    forwardBtn.addEventListener("click", () => openForward(message));
    archiveBtn.addEventListener("click", () => moveMessage(message, "archive"));
    spamBtn.addEventListener("click", () => moveMessage(message, "spam"));
    deleteBtn.addEventListener("click", () => moveMessage(message, "trash"));
    starBtn.addEventListener("click", () => toggleStar(message));
    importantBtn.addEventListener("click", () => toggleImportant(message));
    snoozeBtn.addEventListener("click", () => snoozeMessage(message));

    const senderEmail = getFromAddress(message);
    const senderDomain = domainFromEmail(senderEmail);

    const blockBtn = actionButton({
      actionId: "v8.mail.block",
      variant: "outline",
      className: "v8-mail-security__btn v8-mail-security__btn--block"
    }, [element("span", { text: "Bloquer" })]);
    const trustBtn = actionButton({
      actionId: "v8.mail.trust",
      variant: "outline",
      className: "v8-mail-security__btn v8-mail-security__btn--trust"
    }, [element("span", { text: "Faire confiance" })]);
    blockBtn.addEventListener("click", () => { blockSenderFrom(senderEmail, senderDomain); moveMessage(message, "trash"); });
    trustBtn.addEventListener("click", () => trustSenderFrom(senderEmail, senderDomain));

    const securityBar = buildSecurityBar(message);

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
      element("div", { className: "v8-mail-detail__trust-actions" }, [blockBtn, trustBtn]),
      securityBar,
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
      importantBtn,
      snoozeBtn
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

    const templateSelect = element("select", { className: "v8-input v8-mail-template", attributes: { "aria-label": "Modèle" } }, [
      element("option", { text: "Aucun modèle", attributes: { value: "" } }),
      ...state.templates.map((t) => element("option", { text: t.name, attributes: { value: String(t.id) } }))
    ]);
    templateSelect.addEventListener("change", () => {
      const id = templateSelect.value;
      const template = state.templates.find((t) => String(t.id) === id);
      if (template) {
        subjectInput.value = template.subject || "";
        if (composeEditor) {
          composeEditor.setHTML(text2br(template.content || ""));
          const defaultSignature = state.signatures.find((s) => s.is_default) || state.signatures[0];
          if (defaultSignature) insertSignature(defaultSignature);
        }
      }
      scheduleDraftSave();
    });

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

    const scheduleInput = element("input", {
      className: "v8-input v8-mail-schedule",
      attributes: { type: "datetime-local", "aria-label": "Envoyer plus tard" }
    });

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
      templateSelect,
      signatureSelect,
      editor.root,
      scheduleInput,
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
    const scheduleInput = composeRoot?.querySelector(".v8-mail-schedule");
    const scheduledAt = scheduleInput?.value || undefined;

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
      references: composeReferences || undefined,
      scheduled_at: scheduledAt
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
    const status = composeRoot?.querySelector(".v8-mail-compose__status");
    try {
      const payload = collectPayload();
      const result = await withQueue("saveDraft", payload);
      if (result?.data?.id) composeDraftId = result.data.id;
      else if (result?.id) composeDraftId = result.id;
      if (status) status.textContent = isOnline() ? "Enregistré" : "En attente";
    } catch (error) {
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
    const isScheduled = !!payload.scheduled_at;
    try {
      await withQueue("send", payload);
      notify({ type: "success", title: "Mail", message: isScheduled ? "Message programmé." : "Message envoyé." });
      const draftToDelete = composeDraftId;
      composeDraftId = null;
      if (isOnline() && draftToDelete) {
        try { await mailApi.deleteDraft(draftToDelete); } catch {}
      }
      backToList();
      loadFolder();
    } catch (error) {
      notify({ type: "error", title: isScheduled ? "Échec de la programmation" : "Échec de l'envoi", message: errorDescription(error) });
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
    await loadCached();
    renderList();
    renderSidebar();
    await Promise.all([loadAlias(), loadLabels(), loadContacts(), loadSignatures(), loadRules(), loadNotifications(), loadTemplates(), loadSecurity(), loadAccounts(), loadPgpKeys(), loadPush(), loadLists()]);
    renderSidebar();
    await loadFolder();
    renderReading();
    const pendingTemplate = typeof globalThis !== "undefined" ? globalThis.__ethoneMailComposeTemplate : null;
    if (pendingTemplate) {
      delete globalThis.__ethoneMailComposeTemplate;
      openCompose({ subject: pendingTemplate.subject, prefill: pendingTemplate.content });
    }
    if ((globalThis.location?.hash || "").includes("compose=1")) {
      openCompose();
    }
  }

  init();

  return () => {
    if (searchTimer) clearTimeout(searchTimer);
    if (draftTimer) clearTimeout(draftTimer);
    globalThis.removeEventListener?.("online", onOnline);
    globalThis.removeEventListener?.("offline", onOffline);
    page.remove();
  };
}
