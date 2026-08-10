import { actionButton, element, icon } from "../ui/dom.mjs";
import { buildEmptyState } from "../ui/empty-state.mjs";
import { buildErrorState } from "../ui/error-state.mjs";
import { buildSkeletonList } from "../ui/skeleton.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { showBottomSheet } from "../ui/bottom-sheet.mjs";
import { createMailCache } from "../services/mail-cache.mjs";
import { translateSource, localeTag } from "../i18n/catalog.mjs";

const FOLDERS = [
  { key: "inbox", label: translateSource("Boîte de réception"), icon: "inbox" },
  { key: "starred", label: translateSource("Favoris"), icon: "star" },
  { key: "sent", label: translateSource("Envoyés"), icon: "send" },
  { key: "drafts", label: translateSource("Brouillons"), icon: "file-text" },
  { key: "archive", label: translateSource("Archive"), icon: "archive" },
  { key: "spam", label: translateSource("Spam"), icon: "shield-alert" },
  { key: "trash", label: translateSource("Corbeille"), icon: "trash-2" }
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
  const locale = localeTag();
  if (isToday) return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return translateSource("Hier");
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

function formatFullDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(localeTag());
}

function text2br(text) {
  return String(text || "").replace(/\n/g, "<br>");
}

function clean(value, fallback = "", limit = 400) {
  return (String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() || fallback).slice(0, limit);
}

function formatSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  const locale = localeTag();
  if (value < 1024) return `${value.toLocaleString(locale)} ${translateSource("o")}`;
  if (value < 1024 * 1024) return `${(value / 1024).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${translateSource("Ko")}`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${translateSource("Mo")}`;
  return `${(value / (1024 * 1024 * 1024)).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${translateSource("Go")}`;
}

function buildBar(label, value, max, unit = "") {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  const text = `${value}${unit ? translateSource(unit) || unit : ""}`;
  return element("div", { className: "v8-mail-analytics__bar-row" }, [
    element("span", { className: "v8-mail-analytics__bar-label", text: translateSource(label) }),
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
  const from = message.from_name || message.from_address || translateSource("Inconnu");
  const date = formatFullDate(message.received_at || message.created_at);
  const prefix = isForward ? translateSource("Message transféré") : translateSource("Le {date}, {from} a écrit :").replace("{date}", date).replace("{from}", from);
  const body = sanitizeMailHtml(message.body_html || text2br(message.body_text || ""));
  return `<blockquote class="v8-mail-quote"><p><strong>${prefix}</strong></p>${body}</blockquote>`;
}

function errorDetailText(error) {
  const raw = error?.detail;
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (raw.message) return String(raw.message);
    if (raw.error) return String(raw.error);
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }
  return String(raw);
}

function errorDescription(error) {
  const detail = errorDetailText(error);
  const detailLower = detail.toLowerCase();
  const message = String(error?.message || "");
  if (error?.name === "TimeoutError" || /timeout|délai/i.test(message)) return translateSource("Le Worker met trop de temps à répondre. Vérifiez le déploiement.");
  if (error?.status === 401 || error?.code === "AUTH_REQUIRED") return translateSource("Votre session a expiré. Reconnectez-vous.");
  if (error?.status === 404 || error?.code === "ROUTE_NOT_FOUND" || /route introuvable/i.test(message)) return translateSource("La route Mail n'est pas encore déployée sur le Worker.");
  if (detail && /supabase_url_missing|origin_mismatch|invalid_url/.test(detail)) return translateSource("La configuration Worker Supabase est incomplète. Vérifiez SUPABASE_URL et SUPABASE_SECRET_KEY.");
  if (error?.status === 500 || error?.code === "SERVICE_ERROR" || error?.code === "DB_SCHEMA_ERROR" || error?.code === "INTERNAL_ERROR" || /does not exist|n'existe pas|relation|table|column|colonne|schema/.test(detailLower)) {
    return translateSource("La base de données Mail n'est pas initialisée. Vérifiez que les migrations Supabase Mail (20260812 à 20260817) sont appliquées.");
  }
  return String(error?.message || translateSource("Erreur inconnue"));
}

function getFromAddress(message) {
  return message.from_address || (message.from && typeof message.from === "object" ? (message.from.address || message.from.email || "") : "") || "";
}

export function mountMail(stage, options = {}) {
  const mailApi = options?.externalServices?.mail || null;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const repository = options?.repository || null;
  const mailCache = options?.mailCache || createMailCache();

  const recentNotifies = new Map();
  const GLOBAL_MAIL_ERROR_RE = /\b(mail database|base de données mail|database is not initialized|n'est pas initialisée|migrations|migration|supabase mail|worker supabase|supabase.*configuration|route mail|mail route|déployée|not yet deployed|incomplète|incomplete)\b/i;
  function mailNotify(spec) {
    const now = Date.now();
    const messageKey = spec.message || "";
    const isGlobalMailError = spec.type === "error" && GLOBAL_MAIL_ERROR_RE.test(messageKey);
    if (isGlobalMailError) {
      spec.title = translateSource("Mail");
    }
    const dedupeKey = spec.type === "error" && messageKey ? `error|${messageKey}` : `${spec.type || ""}|${spec.title || ""}|${messageKey}`;
    const last = recentNotifies.get(dedupeKey);
    if (last && now - last < 5000) return;
    recentNotifies.set(dedupeKey, now);
    if (recentNotifies.size > 50) {
      for (const [k, t] of recentNotifies) { if (now - t > 30000) recentNotifies.delete(k); }
    }
    notify(spec);
  }

  if (!mailApi) {
    stage.replaceChildren(buildEmptyState({
      icon: "unplug",
      title: translateSource("Service Mail non configuré"),
      message: translateSource("Connectez ETHONE Mail pour accéder à vos messages.")
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
    filters: { from: "", to: "", subject: "", body: "", date_from: "", date_to: "", has_attachments: false, label: "", folder: "" },
    sort: "newest",
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
    sidebarCollapsed: false,
    morePanelOpen: false,
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
  let filterToInput = null;
  let filterSubjectInput = null;
  let filterBodyInput = null;
  let filterDateFromInput = null;
  let filterDateToInput = null;
  let filterHasAttachmentsInput = null;
  let filterLabelInput = null;
  let filterFolderSelect = null;

  let filterCloseHandler = null;
  let filterKeyHandler = null;

  let onlineStatus = null;
  let snoozeDialog = null;
  let analyticsPanel = null;
  let morePanel = null;
  let refreshBtn = null;
  let archiveBtn = null;
  let deleteBtn = null;
  let markReadBtn = null;
  let markUnreadBtn = null;
  let snoozeBtn = null;
  let moreBtn = null;
  let moveBtn = null;
  let labelBtn = null;
  let sortBtn = null;
  let profileBtn = null;
  let helpBtn = null;

  const page = element("section", { className: "v8-page v8-mail", dataset: { page: "mail" } });
  const header = element("header", { className: "v8-mail-header" });
  const toolbar = element("div", { className: "v8-mail-toolbar" });
  const main = element("main", { className: "v8-mail-main is-list" });
  const sidebar = element("aside", { className: "v8-mail-sidebar" });
  const listWrap = element("section", { className: "v8-mail-list-wrap" });
  const reading = element("section", { className: "v8-mail-reading" });
  main.append(sidebar, listWrap, reading);
  page.append(header, toolbar, main);

  page.addEventListener("click", (event) => {
    const control = event.target?.closest?.("[data-action]");
    if (control && String(control.dataset.action).startsWith("v8.mail.")) {
      event.stopPropagation();
    }
  });

  const menuButton = element("button", {
    className: "v8-icon-button v8-mail-menu",
    attributes: { type: "button", "aria-label": translateSource("Dossiers"), "data-tooltip": translateSource("Dossiers") }
  }, [icon("menu")]);
  const brandTitle = element("span", { className: "v8-mail-header__title", text: "ETHONE Mail" });
  const brand = element("div", { className: "v8-mail-header__brand" }, [menuButton, brandTitle]);

  const searchInput = element("input", {
    className: "v8-input v8-mail-search",
    attributes: { type: "search", placeholder: translateSource("Rechercher..."), "aria-label": translateSource("Rechercher un message"), "data-tooltip": translateSource("Rechercher un message") }
  });
  const searchWrap = element("div", { className: "v8-mail-header__search" }, [searchInput]);

  onlineStatus = element("span", { className: "v8-mail-online-status" });
  const bellBadge = element("span", { className: "v8-mail-bell__badge" });
  const bellBtn = element("button", {
    className: "v8-icon-button v8-mail-bell",
    attributes: { type: "button", "aria-label": translateSource("Notifications"), "data-tooltip": translateSource("Notifications") }
  }, [icon("bell"), bellBadge]);
  helpBtn = element("button", {
    className: "v8-icon-button v8-mail-help",
    attributes: { type: "button", "aria-label": translateSource("Aide"), "data-tooltip": translateSource("Aide") }
  }, [icon("circle-help")]);
  profileBtn = element("button", {
    className: "v8-icon-button v8-mail-profile",
    attributes: { type: "button", "aria-label": translateSource("Profil"), "data-tooltip": translateSource("Profil") }
  }, [icon("user")]);
  const headerActions = element("div", { className: "v8-mail-header__actions" }, [onlineStatus, bellBtn, helpBtn, profileBtn]);
  header.append(brand, searchWrap, headerActions);

  masterCheckbox = element("input", {
    className: "v8-mail-master-checkbox",
    attributes: { type: "checkbox", "aria-label": translateSource("Tout sélectionner"), "data-tooltip": translateSource("Tout sélectionner") }
  });
  const listTitle = element("span", { className: "v8-mail-toolbar__label" });

  refreshBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Actualiser"), "data-tooltip": translateSource("Actualiser") } }, [icon("refresh-cw")]);
  archiveBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Archiver"), "data-tooltip": translateSource("Archiver") } }, [icon("archive")]);
  deleteBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Supprimer"), "data-tooltip": translateSource("Supprimer") } }, [icon("trash-2")]);
  markReadBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Marquer comme lu"), "data-tooltip": translateSource("Marquer comme lu") } }, [icon("mail-open")]);
  markUnreadBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Marquer comme non lu"), "data-tooltip": translateSource("Marquer comme non lu") } }, [icon("mail")]);
  snoozeBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Reporter"), "data-tooltip": translateSource("Reporter") } }, [icon("clock")]);
  moreBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Plus"), "data-tooltip": translateSource("Plus") } }, [icon("more-horizontal")]);
  moveBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action v8-mail-toolbar__action--move is-hidden", attributes: { type: "button", "aria-label": translateSource("Déplacer"), "data-tooltip": translateSource("Déplacer") } }, [icon("corner-up-right")]);
  labelBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action v8-mail-toolbar__action--label is-hidden", attributes: { type: "button", "aria-label": translateSource("Étiqueter"), "data-tooltip": translateSource("Étiqueter") } }, [icon("tag")]);

  const filterBtn = element("button", {
    className: "v8-icon-button v8-mail-filter-toggle",
    attributes: { type: "button", "aria-label": translateSource("Filtres"), "data-tooltip": translateSource("Filtres") }
  }, [icon("filter")]);
  sortBtn = element("button", { className: "v8-icon-button v8-mail-toolbar__action", attributes: { type: "button", "aria-label": translateSource("Trier"), "data-tooltip": translateSource("Trier") } }, [icon("arrow-up-down")]);
  newBtn = actionButton({ actionId: "v8.mail.compose", variant: "primary", ariaLabel: translateSource("Nouveau message") }, [icon("plus"), element("span", { text: translateSource("Nouveau") })]);
  newBtn.dataset.tooltip = translateSource("Nouveau message");

  const selectionGroup = element("div", { className: "v8-mail-toolbar__selection" }, [masterCheckbox, listTitle, refreshBtn, archiveBtn, deleteBtn, markReadBtn, markUnreadBtn, snoozeBtn, moveBtn, labelBtn, moreBtn]);
  const toolsGroup = element("div", { className: "v8-mail-toolbar__tools" }, [filterBtn, sortBtn, newBtn]);
  toolbar.append(selectionGroup, toolsGroup);

  filterFromInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: translateSource("Expéditeur") } });
  filterToInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: translateSource("Destinataire") } });
  filterSubjectInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: translateSource("Sujet") } });
  filterBodyInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: translateSource("Contenu") } });
  filterDateFromInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "date" } });
  filterDateToInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "date" } });
  filterHasAttachmentsInput = element("input", { className: "v8-mail-filter__checkbox", attributes: { type: "checkbox" } });
  const hasAttachmentsLabel = element("label", { className: "v8-mail-filter__check" }, [
    filterHasAttachmentsInput,
    element("span", { text: translateSource("Pièces jointes") })
  ]);
  filterLabelInput = element("input", { className: "v8-input v8-mail-filter__input", attributes: { type: "text", placeholder: translateSource("Étiquette") } });
  filterFolderSelect = element("select", { className: "v8-input v8-mail-filter__input" }, [
    element("option", { text: translateSource("Tous les dossiers"), attributes: { value: "" } }),
    ...FOLDERS.map((f) => element("option", { text: f.label, attributes: { value: f.key } }))
  ]);
  const applyFiltersBtn = actionButton({ actionId: "v8.mail.filters.apply", variant: "secondary", className: "v8-mail-filter__apply" }, [element("span", { text: translateSource("Appliquer") })]);
  const resetFiltersBtn = actionButton({ actionId: "v8.mail.filters.reset", variant: "outline", className: "v8-mail-filter__reset" }, [element("span", { text: translateSource("Réinitialiser") })]);
  const filterHeader = element("h3", { id: "v8-mail-filters-title", className: "v8-mail-filters__title", text: translateSource("Recherche avancée") });
  filterPanel = element("div", { className: "v8-mail-filters v8-mail-filters--popover", attributes: { hidden: "", "aria-labelledby": "v8-mail-filters-title" } }, [
    filterHeader,
    filterFromInput,
    filterToInput,
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
  snoozeDialog = buildSnoozeDialog();
  morePanel = element("aside", { className: "v8-mail-more-panel", attributes: { hidden: "" } });
  listWrap.append(messageList, analyticsPanel);
  page.append(snoozeDialog, morePanel, filterPanel);

  menuButton.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  refreshBtn.addEventListener("click", () => loadFolder());
  archiveBtn.addEventListener("click", () => bulkAction("move", "archive"));
  deleteBtn.addEventListener("click", () => bulkAction("move", "trash"));
  markReadBtn.addEventListener("click", () => bulkAction("mark_read", true));
  markUnreadBtn.addEventListener("click", () => bulkAction("mark_read", false));
  snoozeBtn.addEventListener("click", () => bulkSnooze());
  moveBtn.addEventListener("click", openMoveBottomSheet);
  labelBtn.addEventListener("click", openLabelBottomSheet);
  moreBtn.addEventListener("click", () => openMorePanel());
  newBtn.addEventListener("click", () => openCompose());
  bellBtn.addEventListener("click", () => openMorePanel(true));
  filterBtn.addEventListener("click", toggleFilters);
  applyFiltersBtn.addEventListener("click", applyFilters);
  resetFiltersBtn.addEventListener("click", resetFilters);
  helpBtn.addEventListener("click", () => mailNotify({ type: "info", title: translateSource("Aide"), message: translateSource("Documentation ETHONE Mail à venir.") }));
  profileBtn.addEventListener("click", () => mailNotify({ type: "info", title: translateSource("Profil"), message: translateSource("Options du profil à venir.") }));
  sortBtn.addEventListener("click", openSortBottomSheet);

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
    searchTimer = setTimeout(() => {
      if (hasActiveFilters()) loadFolder();
      else loadSearch();
    }, 300);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (searchTimer) clearTimeout(searchTimer);
      if (hasActiveFilters()) loadFolder();
      else loadSearch();
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
        mailNotify({ type: "warning", title: translateSource("Hors ligne"), message: translateSource("L'action est mise en attente et sera exécutée à la reconnexion.") });
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
        mailNotify({ type: "error", title: translateSource("File d'attente"), message: errorDescription(error) });
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
    onlineStatus.textContent = online ? translateSource("En ligne") : translateSource("Hors ligne");
    onlineStatus.title = online ? translateSource("Connecté") : translateSource("Mode hors ligne");
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
      const list = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
      const raw = list.find((a) => a.is_primary) || list[0] || null;
      state.alias = raw && typeof raw === "object" ? raw : null;
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
      mailNotify({ type: "error", title: translateSource("Notifications"), message: errorDescription(error) });
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
      mailNotify({ type: "error", title: translateSource("Notification"), message: errorDescription(error) });
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
      mailNotify({ type: "error", title: translateSource("Règles"), message: errorDescription(error) });
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
      mailNotify({ type: "error", title: translateSource("Sécurité"), message: errorDescription(error) });
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
      mailNotify({ type: "success", title: translateSource("Sécurité"), message: translateSource("Expéditeur bloqué.") });
      await loadSecurity();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Sécurité"), message: errorDescription(error) });
    }
  }

  async function trustSenderFrom(email, domain) {
    if (!mailApi?.trustSender) return;
    try {
      await mailApi.trustSender({ email, domain });
      mailNotify({ type: "success", title: translateSource("Sécurité"), message: translateSource("Expéditeur fiable.") });
      await loadSecurity();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Sécurité"), message: errorDescription(error) });
    }
  }

  async function unblockSenderFrom(id) {
    if (!mailApi?.unblockSender) return;
    try {
      await mailApi.unblockSender(id);
      mailNotify({ type: "success", title: translateSource("Sécurité"), message: translateSource("Bloc retiré.") });
      await loadSecurity();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Sécurité"), message: errorDescription(error) });
    }
  }

  async function untrustSenderFrom(id) {
    if (!mailApi?.untrustSender) return;
    try {
      await mailApi.untrustSender(id);
      mailNotify({ type: "success", title: translateSource("Sécurité"), message: translateSource("Confiance retirée.") });
      await loadSecurity();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Sécurité"), message: errorDescription(error) });
    }
  }

  async function loadAccounts() {
    if (!mailApi?.accounts) { state.accounts = []; return; }
    try {
      const result = await mailApi.accounts();
      state.accounts = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Comptes"), message: errorDescription(error) });
      state.accounts = [];
    }
  }

  async function addAccount(provider, email, label) {
    if (!mailApi?.createAccount) return;
    if (!provider || !email) {
      mailNotify({ type: "warning", title: translateSource("Compte"), message: translateSource("Fournisseur et email requis.") });
      return;
    }
    try {
      await mailApi.createAccount({ provider, email, label });
      mailNotify({ type: "success", title: translateSource("Compte"), message: translateSource("Compte ajouté.") });
      state.accountForm = { provider: "", email: "", label: "" };
      await loadAccounts();
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Compte"), message: errorDescription(error) });
    }
  }

  async function syncAccount(id) {
    if (!mailApi?.syncAccount) return;
    try {
      await mailApi.syncAccount(id);
      mailNotify({ type: "success", title: translateSource("Compte"), message: translateSource("Synchronisation lancée.") });
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Compte"), message: errorDescription(error) });
    }
  }

  async function deleteAccount(id) {
    if (!mailApi?.deleteAccount) return;
    try {
      await mailApi.deleteAccount(id);
      mailNotify({ type: "success", title: translateSource("Compte"), message: translateSource("Compte supprimé.") });
      await loadAccounts();
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Compte"), message: errorDescription(error) });
    }
  }

  async function loadPgpKeys() {
    if (!mailApi?.pgpKeys) { state.pgpKeys = []; return; }
    try {
      const result = await mailApi.pgpKeys();
      state.pgpKeys = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("PGP"), message: errorDescription(error) });
      state.pgpKeys = [];
    }
  }

  async function createPgpKey() {
    if (!mailApi?.createPgpKey) return;
    const email = state.pgpForm.email.trim();
    if (!email) {
      mailNotify({ type: "warning", title: translateSource("PGP"), message: translateSource("Email requis.") });
      return;
    }
    try {
      await mailApi.createPgpKey({ email, public_key: state.pgpForm.publicKey, private_key: state.pgpForm.privateKey, passphrase: state.pgpForm.passphrase });
      mailNotify({ type: "success", title: translateSource("PGP"), message: translateSource("Clé enregistrée.") });
      state.pgpForm = { email: "", publicKey: "", privateKey: "", passphrase: "" };
      await loadPgpKeys();
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("PGP"), message: errorDescription(error) });
    }
  }

  async function deletePgpKey(id) {
    if (!mailApi?.deletePgpKey) return;
    try {
      await mailApi.deletePgpKey(id);
      mailNotify({ type: "success", title: translateSource("PGP"), message: translateSource("Clé supprimée.") });
      await loadPgpKeys();
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("PGP"), message: errorDescription(error) });
    }
  }

  async function pgpEncrypt() {
    if (!mailApi?.pgpEncrypt) return;
    const { publicKey } = state.pgpForm;
    if (!publicKey) { mailNotify({ type: "warning", title: translateSource("PGP"), message: translateSource("Collez une clé publique.") }); return; }
    const text = await globalThis.prompt?.(translateSource("Texte à chiffrer"));
    if (!text) return;
    try {
      const result = await mailApi.pgpEncrypt({ body: text, public_key: publicKey });
      const encrypted = result?.data?.body || result?.data;
      globalThis.alert?.(encrypted || translateSource("Chiffrement terminé."));
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("PGP"), message: errorDescription(error) });
    }
  }

  async function pgpDecrypt() {
    if (!mailApi?.pgpDecrypt) return;
    const text = await globalThis.prompt?.(translateSource("Texte à déchiffrer"));
    if (!text) return;
    try {
      const result = await mailApi.pgpDecrypt({ body: text, passphrase: state.pgpForm.passphrase });
      const decrypted = result?.data?.body || result?.data;
      globalThis.alert?.(decrypted || translateSource("Déchiffrement terminé."));
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("PGP"), message: errorDescription(error) });
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
      mailNotify({ type: "warning", title: translateSource("Push"), message: translateSource("Notifications push non disponibles.") });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.register) {
      mailNotify({ type: "warning", title: translateSource("Push"), message: translateSource("Service Worker non supporté.") });
      return;
    }
    state.pushLoading = true;
    renderSidebar();
    try {
      const vapidResult = await mailApi.pushVapidKey();
      const vapidKey = vapidResult?.data?.publicKey || vapidResult?.data;
      if (!vapidKey) throw new Error(translateSource("Clé VAPID introuvable."));
      const registration = await navigator.serviceWorker.ready;
      let sub;
      if (state.pushSubscribed) {
        sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          if (mailApi.pushUnsubscribe) await mailApi.pushUnsubscribe(sub.endpoint);
        }
        state.pushSubscribed = false;
        mailNotify({ type: "success", title: translateSource("Push"), message: translateSource("Désabonnement effectué.") });
      } else {
        sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
        const json = sub.toJSON();
        await mailApi.pushSubscribe({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, keys: json.keys });
        state.pushSubscribed = true;
        mailNotify({ type: "success", title: translateSource("Push"), message: translateSource("Notifications activées.") });
      }
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Push"), message: errorDescription(error) });
    }
    state.pushLoading = false;
    renderSidebar();
  }

  async function sendPushTest() {
    if (!mailApi?.pushSend) return;
    try {
      await mailApi.pushSend({ title: translateSource("ETHONE Mail"), body: translateSource("Test de notification.") });
      mailNotify({ type: "success", title: translateSource("Push"), message: translateSource("Notification envoyée.") });
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Push"), message: errorDescription(error) });
    }
  }

  async function loadLists() {
    if (!mailApi?.lists) { state.lists = []; return; }
    try {
      const result = await mailApi.lists();
      state.lists = Array.isArray(result) ? result : (result?.data || []);
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Listes"), message: errorDescription(error) });
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
      mailNotify({ type: "error", title: translateSource("Liste"), message: errorDescription(error) });
    }
  }

  async function saveList() {
    if (!mailApi?.createList || !mailApi?.updateList) return;
    const { id, name, description, address } = state.listForm;
    if (!name) { mailNotify({ type: "warning", title: translateSource("Liste"), message: translateSource("Nom requis.") }); return; }
    try {
      if (id) {
        await mailApi.updateList({ id, name, description, address });
        mailNotify({ type: "success", title: translateSource("Liste"), message: translateSource("Liste mise à jour.") });
      } else {
        await mailApi.createList({ name, description, address });
        mailNotify({ type: "success", title: translateSource("Liste"), message: translateSource("Liste créée.") });
      }
      state.listForm = { id: null, name: "", description: "", address: "" };
      await loadLists();
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Liste"), message: errorDescription(error) });
    }
  }

  async function deleteList(id) {
    if (!mailApi?.deleteList) return;
    try {
      await mailApi.deleteList(id);
      mailNotify({ type: "success", title: translateSource("Liste"), message: translateSource("Liste supprimée.") });
      if (state.selectedListId === id) state.selectedListId = null;
      await loadLists();
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Liste"), message: errorDescription(error) });
    }
  }

  async function addListMember(listId, email, name) {
    if (!mailApi?.addListMember) return;
    if (!email) return;
    try {
      await mailApi.addListMember({ list_id: listId, email, name });
      mailNotify({ type: "success", title: translateSource("Liste"), message: translateSource("Membre ajouté.") });
      await loadListMembers(listId);
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Liste"), message: errorDescription(error) });
    }
  }

  async function removeListMember(listId, email) {
    if (!mailApi?.removeListMember) return;
    try {
      await mailApi.removeListMember(listId, email);
      mailNotify({ type: "success", title: translateSource("Liste"), message: translateSource("Membre retiré.") });
      await loadListMembers(listId);
      renderSidebar();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Liste"), message: errorDescription(error) });
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
      return element("span", { className: `v8-mail-security__badge is-${status}`, text: `${label} ${value || translateSource("Aucun")}` });
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
      mailNotify({ type: "success", title: translateSource("Règle"), message: translateSource("Règle enregistrée.") });
      await loadRules();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Règle"), message: errorDescription(error) });
    }
  }

  async function deleteRule(id) {
    if (!mailApi?.deleteRule) return;
    try {
      await mailApi.deleteRule(id);
      mailNotify({ type: "success", title: translateSource("Règle"), message: translateSource("Règle supprimée.") });
      await loadRules();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Règle"), message: errorDescription(error) });
    }
  }

  function hasActiveFilters() {
    const f = state.filters;
    return !!(f.from || f.to || f.subject || f.body || f.date_from || f.date_to || f.has_attachments || f.label || (f.folder && f.folder !== state.folder));
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
    const folder = state.filters.folder || state.folder;
    payload.folder = folder;
    // Le filtre "to" est appliqué côté client car le backend ne le supporte pas nativement.
    return payload;
  }

  function positionFilterPanel() {
    if (!filterBtn || !filterPanel) return;
    const rect = filterBtn.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const maxWidth = Math.min(360, window.innerWidth - margin * 2);
    filterPanel.style.position = "fixed";
    filterPanel.style.zIndex = "70";
    filterPanel.style.width = `${maxWidth}px`;
    filterPanel.style.maxHeight = `${Math.max(120, Math.min(560, window.innerHeight - rect.bottom - margin * 2))}px`;
    filterPanel.style.overflow = "auto";
    const panelRect = filterPanel.getBoundingClientRect();
    const panelHeight = panelRect.height || 320;
    let top = rect.bottom + gap;
    if (top + panelHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - panelHeight - gap);
    }
    let left = Math.max(margin, Math.min(rect.right - maxWidth, window.innerWidth - maxWidth - margin));
    filterPanel.style.top = `${top}px`;
    filterPanel.style.left = `${left}px`;
  }

  function openFilterPopover() {
    state.filtersOpen = true;
    if (filterFromInput) filterFromInput.value = state.filters.from || "";
    if (filterToInput) filterToInput.value = state.filters.to || "";
    if (filterSubjectInput) filterSubjectInput.value = state.filters.subject || "";
    if (filterBodyInput) filterBodyInput.value = state.filters.body || "";
    if (filterDateFromInput) filterDateFromInput.value = state.filters.date_from || "";
    if (filterDateToInput) filterDateToInput.value = state.filters.date_to || "";
    if (filterHasAttachmentsInput) filterHasAttachmentsInput.checked = state.filters.has_attachments || false;
    if (filterLabelInput) filterLabelInput.value = state.filters.label || "";
    if (filterFolderSelect) filterFolderSelect.value = state.filters.folder || "";
    if (filterPanel) {
      filterPanel.hidden = false;
      filterPanel.style.opacity = "0";
      positionFilterPanel();
      filterPanel.style.opacity = "1";
    }
    if (!filterCloseHandler) {
      filterCloseHandler = (event) => {
        if (filterPanel && !filterPanel.contains(event.target) && !filterBtn.contains(event.target)) closeFilterPopover();
      };
      document.addEventListener("click", filterCloseHandler);
    }
    if (!filterKeyHandler) {
      filterKeyHandler = (event) => {
        if (event.key === "Escape" && state.filtersOpen) {
          event.preventDefault();
          closeFilterPopover();
        }
      };
      document.addEventListener("keydown", filterKeyHandler);
    }
  }

  function closeFilterPopover() {
    state.filtersOpen = false;
    if (filterPanel) filterPanel.hidden = true;
  }

  function toggleFilters(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (state.filtersOpen) closeFilterPopover(); else openFilterPopover();
  }

  function applyFilters() {
    state.filters = {
      from: (filterFromInput?.value || "").trim(),
      to: (filterToInput?.value || "").trim(),
      subject: (filterSubjectInput?.value || "").trim(),
      body: (filterBodyInput?.value || "").trim(),
      date_from: filterDateFromInput?.value || "",
      date_to: filterDateToInput?.value || "",
      has_attachments: filterHasAttachmentsInput?.checked || false,
      label: (filterLabelInput?.value || "").trim(),
      folder: filterFolderSelect?.value || ""
    };
    closeFilterPopover();
    state.selected = null;
    state.selectedIds.clear();
    if (masterCheckbox) masterCheckbox.checked = false;
    setView("list");
    renderReading();
    renderBulkToolbar();
    loadFolder();
  }

  function resetFilters() {
    state.filters = { from: "", to: "", subject: "", body: "", date_from: "", date_to: "", has_attachments: false, label: "", folder: "" };
    closeFilterPopover();
    if (filterFromInput) filterFromInput.value = "";
    if (filterToInput) filterToInput.value = "";
    if (filterSubjectInput) filterSubjectInput.value = "";
    if (filterBodyInput) filterBodyInput.value = "";
    if (filterDateFromInput) filterDateFromInput.value = "";
    if (filterDateToInput) filterDateToInput.value = "";
    if (filterHasAttachmentsInput) filterHasAttachmentsInput.checked = false;
    if (filterLabelInput) filterLabelInput.value = "";
    if (filterFolderSelect) filterFolderSelect.value = "";
    state.query = "";
    state.isSearch = false;
    searchInput.value = "";
    state.selected = null;
    state.selectedIds.clear();
    if (masterCheckbox) masterCheckbox.checked = false;
    setView("list");
    renderReading();
    renderBulkToolbar();
    loadFolder();
  }

  function applyClientFilters() {
    const to = (state.filters.to || "").trim().toLowerCase();
    if (!to || !Array.isArray(state.messages)) return;
    state.messages = state.messages.filter((m) => {
      const addrs = Array.isArray(m.to_addresses) ? m.to_addresses : [m.to_address, m.to].filter(Boolean);
      return addrs.some((a) => String(a).toLowerCase().includes(to));
    });
  }

  function sortMessages() {
    if (!Array.isArray(state.messages) || !state.messages.length) return;
    const mode = state.sort || "newest";
    const getDate = (m) => {
      const d = new Date(m.received_at || m.created_at);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const getSender = (m) => String(m.from_name || getFromAddress(m) || "").toLowerCase();
    const tieBreak = (a, b) => String(a.id || "").localeCompare(String(b.id || ""), undefined, { numeric: true });
    if (mode === "newest") {
      state.messages.sort((a, b) => getDate(b) - getDate(a) || tieBreak(a, b));
    } else if (mode === "oldest") {
      state.messages.sort((a, b) => getDate(a) - getDate(b) || tieBreak(a, b));
    } else if (mode === "sender") {
      state.messages.sort((a, b) => getSender(a).localeCompare(getSender(b)) || getDate(b) - getDate(a) || tieBreak(a, b));
    } else if (mode === "unread") {
      state.messages.sort((a, b) => (Number(a.is_read) - Number(b.is_read)) || getDate(b) - getDate(a) || tieBreak(a, b));
    }
  }

  const SORT_OPTIONS = Object.freeze([
    { key: "newest", label: translateSource("Plus récent"), icon: "arrow-down" },
    { key: "oldest", label: translateSource("Plus ancien"), icon: "arrow-up" },
    { key: "sender", label: translateSource("Expéditeur"), icon: "at-sign" },
    { key: "unread", label: translateSource("Non lus"), icon: "mail" }
  ]);

  function openSortBottomSheet() {
    let closeSheet = () => {};
    const activeKey = state.sort || "newest";
    const children = SORT_OPTIONS.map((opt) => {
      const isActive = opt.key === activeKey;
      return element("button", {
        className: `v8-bottom-sheet__action${isActive ? " is-active" : ""}`,
        attributes: { type: "button" },
        events: {
          click: () => {
            state.sort = opt.key;
            closeSheet();
            renderList();
          }
        }
      }, [icon(opt.icon), element("span", { text: opt.label })]);
    });
    const sheet = showBottomSheet({
      title: translateSource("Trier par"),
      position: "center",
      children
    });
    closeSheet = sheet.close;
  }

  function openMoveBottomSheet() {
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    let closeSheet = () => {};
    const children = FOLDERS.map((folder) => element("button", {
      className: "v8-bottom-sheet__action",
      attributes: { type: "button" },
      events: {
        click: () => {
          closeSheet();
          bulkAction("move", folder.key);
        }
      }
    }, [icon(folder.icon), element("span", { text: folder.label })]));
    const sheet = showBottomSheet({
      title: translateSource("Déplacer vers"),
      position: "center",
      children
    });
    closeSheet = sheet.close;
  }

  function selectedMessagesHaveLabel(label) {
    const ids = [...state.selectedIds];
    if (!ids.length) return false;
    return state.messages
      .filter((m) => ids.includes(String(m.id)))
      .every((m) => (m.labels || []).some((l) => (l?.name || l) === label.name));
  }

  function openLabelBottomSheet() {
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    let closeSheet = () => {};

    const children = [];
    if (state.labels.length) {
      state.labels.forEach((label) => {
        const hasIt = selectedMessagesHaveLabel(label);
        children.push(element("button", {
          className: `v8-bottom-sheet__action${hasIt ? " is-active" : ""}`,
          attributes: { type: "button" },
          events: {
            click: () => {
              closeSheet();
              bulkLabel(hasIt, label.name);
            }
          }
        }, [icon(hasIt ? "x" : "tag"), element("span", { text: label.name })]));
      });
    } else {
      children.push(element("p", { className: "v8-mail-bottom-sheet__empty", text: translateSource("Aucune étiquette") }));
    }

    const newLabelInput = element("input", {
      className: "v8-input",
      attributes: { type: "text", placeholder: translateSource("Nouvelle étiquette"), maxlength: "32" }
    });
    const createBtn = actionButton({
      actionId: "v8.mail.label.create",
      variant: "secondary",
      className: "v8-mail-bottom-sheet__create-btn"
    }, [element("span", { text: translateSource("Créer") })]);
    createBtn.addEventListener("click", async () => {
      const name = newLabelInput.value.trim();
      if (!name) {
        mailNotify({ type: "warning", title: translateSource("Étiquette"), message: translateSource("Nom requis.") });
        return;
      }
      closeSheet();
      await createLabel(name);
      bulkLabel(false, name);
    });
    newLabelInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && newLabelInput.value.trim()) {
        event.preventDefault();
        createBtn.click();
      }
    });

    const createGroup = element("div", { className: "v8-mail-bottom-sheet__create" }, [
      newLabelInput,
      createBtn
    ]);
    children.push(createGroup);

    const sheet = showBottomSheet({
      title: translateSource("Étiqueter"),
      position: "center",
      children
    });
    closeSheet = sheet.close;
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
      mailNotify({ type: "error", title: translateSource("Modèles"), message: errorDescription(error) });
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
      mailNotify({ type: "warning", title: translateSource("Modèle"), message: translateSource("Nom requis.") });
      return;
    }
    try {
      if (state.templateForm.id) {
        await mailApi.updateTemplate({ id: state.templateForm.id, ...payload });
      } else {
        await mailApi.saveTemplate(payload);
      }
      mailNotify({ type: "success", title: translateSource("Modèle"), message: state.templateForm.id ? translateSource("Modèle mis à jour.") : translateSource("Modèle enregistré.") });
      state.templateForm = { id: null, name: "", subject: "", content: "", is_default: false };
      await loadTemplates();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Modèle"), message: errorDescription(error) });
    }
  }

  async function deleteMailTemplate(id) {
    if (!mailApi?.deleteTemplate) return;
    try {
      await mailApi.deleteTemplate(id);
      mailNotify({ type: "success", title: translateSource("Modèle"), message: translateSource("Modèle supprimé.") });
      if (String(state.templateForm.id) === String(id)) state.templateForm = { id: null, name: "", subject: "", content: "", is_default: false };
      await loadTemplates();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Modèle"), message: errorDescription(error) });
    }
  }

  async function setDefaultMailTemplate(id) {
    if (!mailApi?.updateTemplate) return;
    try {
      await mailApi.updateTemplate({ id, is_default: true });
      mailNotify({ type: "success", title: translateSource("Modèle"), message: translateSource("Modèle par défaut défini.") });
      await loadTemplates();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Modèle"), message: errorDescription(error) });
    }
  }

  async function loadFolder() {
    if (!mailApi) { state.loading = false; state.messages = []; renderList(); return; }
    state.loading = true;
    state.error = null;
    state.isSearch = hasActiveFilters() || (state.isSearch && !!state.query);
    renderList();
    try {
      let result;
      const searchFolder = state.filters.folder || state.folder;
      if (hasActiveFilters()) {
        result = await mailApi.advancedSearch(buildFilterPayload());
      } else if (searchFolder === "drafts") {
        result = await mailApi.drafts({ limit: 50, offset: 0 });
      } else {
        result = await mailApi.inbox({ folder: searchFolder, limit: 50, offset: 0 });
      }
      state.messages = Array.isArray(result) ? result : (result?.data || []);
      applyClientFilters();
      sortMessages();
      const unread = result?.unread_count;
      state.counts[state.folder] = typeof unread === "number" ? unread : state.messages.filter((m) => !m.is_read).length;
      await mailCache.putMessages(searchFolder, state.messages);
    } catch (error) {
      state.error = error;
      mailNotify({ type: "error", title: translateSource("Mail"), message: errorDescription(error) });
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
      mailNotify({ type: "warning", title: translateSource("Analytique"), message: translateSource("L'analytique n'est pas disponible.") });
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
        mailNotify({ type: "warning", title: translateSource("Analytique"), message: translateSource("Aucune donnée disponible.") });
        closeAnalytics();
        return;
      }
      renderAnalytics(state.analytics);
    } catch (error) {
      state.loading = false;
      mailNotify({ type: "error", title: translateSource("Analytique"), message: errorDescription(error) });
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
    listTitle.textContent = translateSource("Analytique ({0} jours)").replace("{0}", state.analyticsPeriod);

    const grid = element("div", { className: "v8-mail-analytics__grid" }, [
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.total || 0) }), element("span", { text: translateSource("Total") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.inbound || 0) }), element("span", { text: translateSource("Reçus") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.outbound || 0) }), element("span", { text: translateSource("Envoyés") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.read || 0) }), element("span", { text: translateSource("Lus") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.unread || 0) }), element("span", { text: translateSource("Non lus") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.starred || 0) }), element("span", { text: translateSource("Favoris") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.spam || 0) }), element("span", { text: translateSource("Spam") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: String(stats.attachments || 0) }), element("span", { text: translateSource("Avec pièces jointes") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: formatSize(stats.totalSize || 0) }), element("span", { text: translateSource("Volume total") })]),
      element("div", { className: "v8-mail-analytics__stat" }, [element("strong", { text: formatSize(stats.averageSize || 0) }), element("span", { text: translateSource("Taille moyenne") })])
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
          element("span", { text: clean(sender.name || sender.email || translateSource("Inconnu"), "", 120) }),
          element("span", { className: "v8-mail-analytics__sender-count", text: String(sender.count || 0) })
        ]));
      });
    } else {
      topSendersList.append(element("li", { text: translateSource("Aucun expéditeur") }));
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

    const closeBtn = actionButton({ actionId: "v8.mail.analytics.close", variant: "outline", className: "v8-mail-analytics__close" }, [element("span", { text: translateSource("Fermer") })]);
    closeBtn.addEventListener("click", closeAnalytics);

    const topSendersTitle = element("strong", { className: "v8-mail-analytics__section-title", text: translateSource("Principaux expéditeurs") });
    const daysTitle = element("strong", { className: "v8-mail-analytics__section-title", text: translateSource("Messages par jour") });
    const hoursTitle = element("strong", { className: "v8-mail-analytics__section-title", text: translateSource("Messages par heure") });
    const foldersTitle = element("strong", { className: "v8-mail-analytics__section-title", text: translateSource("Par dossier") });

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
    if (!mailApi) { state.messages = []; renderList(); renderSidebar(); return; }
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
      mailNotify({ type: "error", title: translateSource("Recherche"), message: errorDescription(error) });
      state.messages = [];
    }
    applyClientFilters();
    sortMessages();
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
    main.classList.remove("is-list", "is-detail", "is-compose");
    main.classList.add(`is-${state.view}`);
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
      mailNotify({ type: "success", title: translateSource("Mail"), message: translateSource("Déplacé vers {0}.").replace("{0}", FOLDERS.find((f) => f.key === folder)?.label || folder) });
      state.messages = state.messages.filter((m) => m.id !== message.id);
      if (state.selected?.id === message.id) backToList();
      renderList();
      loadFolder();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Mail"), message: errorDescription(error) });
    }
  }

  async function createLabel(name) {
    if (!mailApi || !name.trim()) return;
    try {
      await mailApi.createLabel({ name: name.trim(), color: "var(--v8-accent)" });
      mailNotify({ type: "success", title: translateSource("Étiquette"), message: translateSource("Étiquette créée.") });
      await loadLabels();
      renderSidebar();
      if (state.view === "detail" && state.selected) renderReading();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Étiquette"), message: errorDescription(error) });
    }
  }

  async function deleteLabel(id) {
    if (!mailApi) return;
    try {
      await mailApi.deleteLabel(id);
      mailNotify({ type: "success", title: translateSource("Étiquette"), message: translateSource("Étiquette supprimée.") });
      await loadLabels();
      renderSidebar();
      if (state.view === "detail" && state.selected) renderReading();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Étiquette"), message: errorDescription(error) });
    }
  }

  async function assignLabel(ids, labelName, remove = false) {
    if (!mailApi || !ids.length || !labelName) return;
    const matchedLabel = state.labels.find((l) => l.name === labelName);
    const labelId = matchedLabel?.id;
    try {
      await withQueue("label", { ids, label: labelName, remove });
      mailNotify({ type: "success", title: translateSource("Étiquette"), message: remove ? translateSource("Étiquette retirée.") : translateSource("Étiquette assignée.") });
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
      mailNotify({ type: "error", title: translateSource("Étiquette"), message: errorDescription(error) });
    }
  }

  async function saveAlias(alias, displayName) {
    try {
      const result = await mailApi.createAlias({ alias, display_name: displayName });
      const raw = result?.data || result;
      state.alias = raw && typeof raw === "object" ? raw : null;
      renderSidebar();
      mailNotify({ type: "success", title: translateSource("Adresse"), message: translateSource("Adresse ETHONE créée.") });
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Adresse"), message: errorDescription(error) });
    }
  }

  function buildAliasSection() {
    const section = element("div", { className: "v8-mail-alias" });
    if (state.alias?.alias) {
      section.append(
        element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Mon adresse") }),
        element("span", { className: "v8-mail-alias__value", text: state.alias.alias })
      );
      return section;
    }

    const localPartInput = element("input", {
      className: "v8-input v8-mail-alias__input",
      attributes: { type: "text", placeholder: translateSource("votre-nom"), maxlength: "32" }
    });
    const displayInput = element("input", {
      className: "v8-input v8-mail-alias__input",
      attributes: { type: "text", placeholder: translateSource("Nom affiché"), maxlength: "80" }
    });
    const suffix = element("span", { className: "v8-mail-alias__suffix", text: "@ethone.dev" });
    const createBtn = actionButton({
      actionId: "v8.mail.alias.create",
      variant: "secondary",
      className: "v8-mail-alias__create"
    }, [icon("plus"), element("span", { text: translateSource("Créer") })]);
    createBtn.addEventListener("click", () => {
      const local = localPartInput.value.trim();
      if (!local) {
        mailNotify({ type: "warning", title: translateSource("Adresse"), message: translateSource("Saisissez un nom d'adresse.") });
        return;
      }
      saveAlias(`${local}@ethone.dev`, displayInput.value.trim());
    });

    section.append(
      element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Mon adresse") }),
      element("div", { className: "v8-mail-alias__row" }, [localPartInput, suffix]),
      displayInput,
      createBtn
    );
    return section;
  }

  function renderSidebar() {
    try {
    sidebar.replaceChildren();
    const title = element("div", { className: "v8-mail-sidebar__title" }, [
      element("h2", { text: translateSource("Mail") }),
      state.alias ? element("small", { text: state.alias.alias || state.alias }) : null
    ]);

    const aliasSection = buildAliasSection();

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

    const collapseLabel = state.sidebarCollapsed ? translateSource("Étendre") : translateSource("Réduire");
    const collapseBtn = element("button", { className: "v8-icon-button v8-mail-sidebar__collapse", attributes: { type: "button", "aria-label": collapseLabel, "data-tooltip": collapseLabel } }, [icon(state.sidebarCollapsed ? "chevrons-right" : "chevrons-left"), element("span", { text: collapseLabel })]);
    collapseBtn.addEventListener("click", () => { state.sidebarCollapsed = !state.sidebarCollapsed; sidebar.classList.toggle("is-collapsed", state.sidebarCollapsed); main.classList.toggle("is-sidebar-collapsed", state.sidebarCollapsed); });

    if (state.morePanelOpen) {
    const analyticsTitle = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Analytique") });
    const analyticsPeriodSelect = element("select", { className: "v8-input v8-mail-analytics__select" }, [
      element("option", { text: translateSource("7 jours"), attributes: { value: "7" } }),
      element("option", { text: translateSource("30 jours"), attributes: { value: "30", selected: "" } }),
      element("option", { text: translateSource("90 jours"), attributes: { value: "90" } })
    ]);
    analyticsPeriodSelect.value = String(state.analyticsPeriod || 30);
    const analyticsOpenBtn = actionButton({ actionId: "v8.mail.analytics.open", variant: "primary", className: "v8-mail-analytics__open" }, [icon("bar-chart-3"), element("span", { text: translateSource("Ouvrir") })]);
    analyticsOpenBtn.addEventListener("click", () => loadAnalytics(Number(analyticsPeriodSelect.value) || 30));

    const rulesTitle = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Règles") });

    const ruleNameInput = element("input", {
      className: "v8-input v8-mail-rule-input",
      attributes: { type: "text", placeholder: translateSource("Nom de la règle"), maxlength: "64" }
    });
    const ruleConditionInput = element("input", {
      className: "v8-input v8-mail-rule-input",
      attributes: { type: "text", placeholder: translateSource("Si le sujet contient..."), maxlength: "128" }
    });
    const ruleActionType = element("select", { className: "v8-input v8-mail-rule-select" }, [
      element("option", { text: translateSource("Étiqueter"), attributes: { value: "label" } }),
      element("option", { text: translateSource("Déplacer"), attributes: { value: "move" } })
    ]);
    const ruleTargetInput = element("input", {
      className: "v8-input v8-mail-rule-input",
      attributes: { type: "text", placeholder: translateSource("Nom de l'étiquette ou dossier"), maxlength: "64" }
    });
    const ruleAutoReplyInput = element("textarea", {
      className: "v8-input v8-mail-rule-auto-reply",
      attributes: { rows: "3", placeholder: translateSource("Réponse automatique (optionnel)") }
    });
    const ruleSaveBtn = actionButton({ actionId: "v8.mail.rule.save", variant: "secondary" }, [icon("plus"), element("span", { text: translateSource("Créer") })]);
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
        mailNotify({ type: "warning", title: translateSource("Règle"), message: translateSource("Remplissez tous les champs.") });
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
      const name = rule.name || translateSource("Règle");
      const condition = rule.condition?.subject ? translateSource('sujet contient "{0}"').replace("{0}", rule.condition.subject) : "";
      const actionType = rule.action?.type === "move" ? translateSource("Déplacer") : translateSource("Étiqueter");
      const actionTarget = rule.action?.target || "";
      const item = element("li", { className: "v8-mail-rule" }, [
        element("span", { className: "v8-mail-rule__info" }, [
          element("strong", { text: name }),
          element("small", { text: condition ? condition + translateSource("→") + actionType + " " + actionTarget : actionType + " " + actionTarget })
        ]),
        element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": translateSource("Supprimer {0}").replace("{0}", name) }
        }, [icon("trash-2")])
      ]);
      item.querySelector("button").addEventListener("click", () => deleteRule(rule.id));
      rulesList.append(item);
    });

    const templatesTitle = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Modèles") });

    const templateNameInput = element("input", {
      className: "v8-input v8-mail-template-input",
      attributes: { type: "text", placeholder: translateSource("Nom du modèle"), maxlength: "64", value: state.templateForm.name || "" }
    });
    const templateSubjectInput = element("input", {
      className: "v8-input v8-mail-template-input",
      attributes: { type: "text", placeholder: translateSource("Sujet"), maxlength: "128", value: state.templateForm.subject || "" }
    });
    const templateContentInput = element("textarea", {
      className: "v8-input v8-mail-template-content",
      attributes: { rows: "4", placeholder: translateSource("Contenu") }
    });
    templateContentInput.value = state.templateForm.content || "";
    const templateDefaultInput = element("input", {
      className: "v8-mail-template__checkbox",
      attributes: { type: "checkbox" }
    });
    templateDefaultInput.checked = state.templateForm.is_default || false;
    const templateDefaultLabel = element("label", { className: "v8-mail-template__check" }, [
      templateDefaultInput,
      element("span", { text: translateSource("Par défaut") })
    ]);
    const templateSaveBtn = actionButton({
      actionId: "v8.mail.template.save",
      variant: "secondary",
      className: "v8-mail-template__save"
    }, [icon("save"), element("span", { text: state.templateForm.id ? translateSource("Mettre à jour") : translateSource("Enregistrer") })]);
    templateSaveBtn.addEventListener("click", saveTemplateForm);

    const templateResetBtn = actionButton({
      actionId: "v8.mail.template.reset",
      variant: "outline",
      className: "v8-mail-template__reset"
    }, [icon("x"), element("span", { text: translateSource("Nouveau") })]);
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
      const name = template.name || translateSource("Modèle");
      const isDefault = template.is_default === true;
      const actions = element("span", { className: "v8-mail-template-item__actions" });
      if (!isDefault) {
        const defaultBtn = element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": translateSource("Définir {0} par défaut").replace("{0}", name) }
        }, [icon("check")]);
        defaultBtn.addEventListener("click", (event) => { event.stopPropagation(); setDefaultMailTemplate(template.id); });
        actions.append(defaultBtn);
      }
      const deleteBtn = element("button", {
        className: "v8-icon-button",
        attributes: { type: "button", "aria-label": translateSource("Supprimer {0}").replace("{0}", name) }
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

    const notificationsTitle = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Notifications") });
    const notificationsList = element("ul", { className: `v8-mail-notifications${state.notificationOpen ? " is-open" : ""}` });
    if (state.notifications.length) {
      state.notifications.forEach((n) => {
        const isUnread = !n.is_read;
        const item = element("li", { className: `v8-mail-notification${isUnread ? " is-unread" : ""}` }, [
          element("span", { className: "v8-mail-notification__title", text: n.title || n.message || translateSource("Notification") }),
          element("small", { className: "v8-mail-notification__meta", text: formatMailDate(n.created_at || n.sent_at || n.date) })
        ]);
        item.addEventListener("click", () => markNotificationRead(n));
        notificationsList.append(item);
      });
    } else {
      notificationsList.append(element("li", { className: "v8-mail-notification", text: translateSource("Aucune notification") }));
    }

    const labelsTitle = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Étiquettes") });
    const labelList = element("ul", { className: "v8-mail-labels" });
    state.labels.forEach((l) => {
      const item = element("li", { className: "v8-mail-sidebar-label" }, [
        element("span", { text: l.name }),
        element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": translateSource("Supprimer {0}").replace("{0}", l.name) }
        }, [icon("x")])
      ]);
      item.querySelector("button").addEventListener("click", () => deleteLabel(l.id));
      labelList.append(item);
    });

    const newLabelInput = element("input", {
      className: "v8-input v8-mail-new-label",
      attributes: { type: "text", placeholder: translateSource("Nouvelle étiquette"), maxlength: "32" }
    });
    newLabelInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && newLabelInput.value.trim()) createLabel(newLabelInput.value.trim());
    });

    const accountsSection = buildAccountsSection();
    const pgpSection = buildPgpSection();
    const pushSection = buildPushSection();
    const listsSection = buildListsSection();
    const securitySection = buildSecuritySection();
      renderMorePanel([analyticsTitle, analyticsPeriodSelect, analyticsOpenBtn, rulesTitle, ruleForm, rulesList, templatesTitle, templateForm, templatesList, notificationsTitle, notificationsList, labelsTitle, labelList, newLabelInput, accountsSection, pgpSection, pushSection, listsSection, securitySection]);
    }
    sidebar.append(title, aliasSection, folderList, collapseBtn);
    renderBell();
    refreshIcons();
  
    } catch (error) {
      console.error("renderSidebar failed", error);
      if (sidebar) {
          sidebar.replaceChildren(buildErrorState({
            title: translateSource("Erreur d'affichage"),
            reason: errorDescription(error),
            actionText: translateSource("Réessayer"),
            action: renderSidebar
          }));
          refreshIcons();
        }
    }
  }

  function renderMorePanel(children = []) {
    if (!morePanel) return;
    if (!children.length) {
      morePanel.hidden = true;
      morePanel.classList.remove("is-open");
      morePanel.replaceChildren();
      return;
    }
    const panelHeader = element("div", { className: "v8-mail-more-panel__header" }, [
      element("h3", { className: "v8-mail-more-panel__title", text: translateSource("Plus") }),
      element("button", { className: "v8-icon-button v8-mail-more-panel__close", attributes: { type: "button", "aria-label": translateSource("Fermer") } }, [icon("x")])
    ]);
    panelHeader.querySelector("button").addEventListener("click", closeMorePanel);
    morePanel.replaceChildren(panelHeader, ...children);
    morePanel.hidden = false;
    morePanel.classList.add("is-open");
    refreshIcons();
  }

  function openMorePanel(expandNotifications = false) {
    if (expandNotifications) state.notificationOpen = true;
    state.morePanelOpen = true;
    renderSidebar();
  }

  function closeMorePanel() {
    state.morePanelOpen = false;
    if (morePanel) {
      morePanel.hidden = true;
      morePanel.classList.remove("is-open");
      morePanel.replaceChildren();
    }
  }

  function buildAccountsSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Comptes externes") });
    const list = element("ul", { className: "v8-mail-accounts__list" });
    if (state.accounts.length) {
      state.accounts.forEach((account) => {
        const label = `${account.provider || "?"} — ${account.email || account.label || ""}`;
        const actions = element("span", { className: "v8-mail-accounts__actions" });
        const syncBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Synchroniser") } }, [icon("refresh-cw")]);
        syncBtn.addEventListener("click", (event) => { event.stopPropagation(); syncAccount(account.id); });
        const deleteBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Supprimer") } }, [icon("trash-2")]);
        deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deleteAccount(account.id); });
        actions.append(syncBtn, deleteBtn);
        list.append(element("li", { className: "v8-mail-accounts__item" }, [element("span", { className: "v8-mail-accounts__label", text: label }), actions]));
      });
    } else {
      list.append(element("li", { className: "v8-mail-accounts__item", text: translateSource("Aucun compte externe.") }));
    }

    const providerInput = element("input", { className: "v8-input v8-mail-accounts__input", attributes: { type: "text", placeholder: translateSource("Fournisseur (gmail, outlook...)"), value: state.accountForm.provider } });
    const emailInput = element("input", { className: "v8-input v8-mail-accounts__input", attributes: { type: "email", placeholder: translateSource("Email"), value: state.accountForm.email } });
    const labelInput = element("input", { className: "v8-input v8-mail-accounts__input", attributes: { type: "text", placeholder: translateSource("Libellé"), value: state.accountForm.label } });
    providerInput.addEventListener("input", () => { state.accountForm.provider = providerInput.value; });
    emailInput.addEventListener("input", () => { state.accountForm.email = emailInput.value; });
    labelInput.addEventListener("input", () => { state.accountForm.label = labelInput.value; });
    const addBtn = actionButton({ actionId: "v8.mail.account.add", variant: "secondary", className: "v8-mail-accounts__add" }, [icon("plus"), element("span", { text: translateSource("Ajouter") })]);
    addBtn.addEventListener("click", () => addAccount(providerInput.value.trim(), emailInput.value.trim(), labelInput.value.trim()));
    const form = element("div", { className: "v8-mail-accounts__form" }, [providerInput, emailInput, labelInput, addBtn]);
    return element("div", { className: "v8-mail-sidebar__accounts" }, [title, list, form]);
  }

  function buildPgpSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Clés PGP") });
    const list = element("ul", { className: "v8-mail-pgp__list" });
    if (state.pgpKeys.length) {
      state.pgpKeys.forEach((key) => {
        const label = `${key.email || key.name || translateSource("Clé")}${key.fingerprint ? ` (${String(key.fingerprint).slice(0, 16)}...)` : ""}`;
        const deleteBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Supprimer") } }, [icon("trash-2")]);
        deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deletePgpKey(key.id); });
        list.append(element("li", { className: "v8-mail-pgp__item" }, [element("span", { className: "v8-mail-pgp__label", text: label }), deleteBtn]));
      });
    } else {
      list.append(element("li", { className: "v8-mail-pgp__item", text: translateSource("Aucune clé PGP.") }));
    }

    const emailInput = element("input", { className: "v8-input v8-mail-pgp__input", attributes: { type: "email", placeholder: translateSource("Email"), value: state.pgpForm.email } });
    const publicInput = element("textarea", { className: "v8-input v8-mail-pgp__textarea", attributes: { rows: "3", placeholder: translateSource("Clé publique (optionnel)") } });
    publicInput.value = state.pgpForm.publicKey;
    const privateInput = element("textarea", { className: "v8-input v8-mail-pgp__textarea", attributes: { rows: "2", placeholder: translateSource("Clé privée — laisser vide pour générer côté Worker") } });
    privateInput.value = state.pgpForm.privateKey;
    const passphraseInput = element("input", { className: "v8-input v8-mail-pgp__input", attributes: { type: "password", placeholder: translateSource("Passphrase") } });
    passphraseInput.value = state.pgpForm.passphrase;
    emailInput.addEventListener("input", () => { state.pgpForm.email = emailInput.value; });
    publicInput.addEventListener("input", () => { state.pgpForm.publicKey = publicInput.value; });
    privateInput.addEventListener("input", () => { state.pgpForm.privateKey = privateInput.value; });
    passphraseInput.addEventListener("input", () => { state.pgpForm.passphrase = passphraseInput.value; });
    const saveBtn = actionButton({ actionId: "v8.mail.pgp.key.create", variant: "secondary", className: "v8-mail-pgp__add" }, [icon("key"), element("span", { text: translateSource("Enregistrer") })]);
    saveBtn.addEventListener("click", createPgpKey);
    const encryptBtn = actionButton({ actionId: "v8.mail.pgp.encrypt", variant: "outline", className: "v8-mail-pgp__tool" }, [icon("lock"), element("span", { text: translateSource("Chiffrer") })]);
    const decryptBtn = actionButton({ actionId: "v8.mail.pgp.decrypt", variant: "outline", className: "v8-mail-pgp__tool" }, [icon("unlock"), element("span", { text: translateSource("Déchiffrer") })]);
    encryptBtn.addEventListener("click", pgpEncrypt);
    decryptBtn.addEventListener("click", pgpDecrypt);
    const tools = element("div", { className: "v8-mail-pgp__tools" }, [encryptBtn, decryptBtn]);
    const form = element("div", { className: "v8-mail-pgp__form" }, [emailInput, publicInput, privateInput, passphraseInput, saveBtn, tools]);
    return element("div", { className: "v8-mail-sidebar__pgp" }, [title, list, form]);
  }

  function buildPushSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Notifications push") });
    const status = element("span", { className: "v8-mail-push__status", text: state.pushLoading ? translateSource("Chargement...") : state.pushSubscribed ? translateSource("Abonné") : translateSource("Non abonné") });
    const toggleBtn = actionButton({ actionId: "v8.mail.push.toggle", variant: state.pushSubscribed ? "outline" : "secondary", className: "v8-mail-push__toggle", disabled: state.pushLoading }, [icon("bell"), element("span", { text: state.pushSubscribed ? translateSource("Se désabonner") : translateSource("S'abonner") })]);
    toggleBtn.addEventListener("click", togglePushSubscribe);
    const testBtn = actionButton({ actionId: "v8.mail.push.send", variant: "outline", className: "v8-mail-push__send" }, [icon("send"), element("span", { text: translateSource("Tester") })]);
    testBtn.addEventListener("click", sendPushTest);
    return element("div", { className: "v8-mail-sidebar__push" }, [title, status, toggleBtn, testBtn]);
  }

  function buildListsSection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Listes de diffusion") });
    const list = element("ul", { className: "v8-mail-lists__list" });
    if (state.lists.length) {
      state.lists.forEach((l) => {
        const isSelected = state.selectedListId === l.id;
        const label = `${l.name || translateSource("Liste")}${l.address ? ` <${l.address}>` : ""}`;
        const actions = element("span", { className: "v8-mail-lists__actions" });
        const editBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Modifier") } }, [icon("pencil")]);
        editBtn.addEventListener("click", (event) => { event.stopPropagation(); state.listForm = { id: l.id, name: l.name || "", description: l.description || "", address: l.address || "" }; renderSidebar(); });
        const deleteBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Supprimer") } }, [icon("trash-2")]);
        deleteBtn.addEventListener("click", (event) => { event.stopPropagation(); deleteList(l.id); });
        actions.append(editBtn, deleteBtn);
        const item = element("li", { className: `v8-mail-lists__item${isSelected ? " is-active" : ""}` }, [element("span", { className: "v8-mail-lists__label", text: label }), actions]);
        item.addEventListener("click", async () => { state.selectedListId = isSelected ? null : l.id; if (state.selectedListId) await loadListMembers(l.id); renderSidebar(); });
        list.append(item);
      });
    } else {
      list.append(element("li", { className: "v8-mail-lists__item", text: translateSource("Aucune liste.") }));
    }

    const nameInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: translateSource("Nom"), value: state.listForm.name } });
    const addressInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: translateSource("Adresse liste"), value: state.listForm.address } });
    const descInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: translateSource("Description"), value: state.listForm.description } });
    nameInput.addEventListener("input", () => { state.listForm.name = nameInput.value; });
    addressInput.addEventListener("input", () => { state.listForm.address = addressInput.value; });
    descInput.addEventListener("input", () => { state.listForm.description = descInput.value; });
    const saveBtn = actionButton({ actionId: "v8.mail.list.save", variant: "secondary", className: "v8-mail-lists__save" }, [icon("save"), element("span", { text: state.listForm.id ? translateSource("Mettre à jour") : translateSource("Créer") })]);
    saveBtn.addEventListener("click", saveList);
    const resetBtn = actionButton({ actionId: "v8.mail.list.reset", variant: "outline", className: "v8-mail-lists__reset" }, [icon("x"), element("span", { text: translateSource("Nouveau") })]);
    resetBtn.addEventListener("click", () => { state.listForm = { id: null, name: "", description: "", address: "" }; renderSidebar(); });
    const form = element("div", { className: "v8-mail-lists__form" }, [nameInput, addressInput, descInput, saveBtn, resetBtn]);

    let membersPanel = null;
    if (state.selectedListId) {
      const members = state.listMembers[state.selectedListId] || [];
      const membersList = element("ul", { className: "v8-mail-lists__members" });
      if (members.length) {
        members.forEach((m) => {
          const removeBtn = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": translateSource("Retirer") } }, [icon("x")]);
          removeBtn.addEventListener("click", (event) => { event.stopPropagation(); removeListMember(state.selectedListId, m.email); });
          membersList.append(element("li", { className: "v8-mail-lists__member" }, [element("span", { text: m.name ? `${m.name} <${m.email}>` : m.email }), removeBtn]));
        });
      } else {
        membersList.append(element("li", { className: "v8-mail-lists__member", text: translateSource("Aucun membre.") }));
      }
      const memberEmailInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "email", placeholder: translateSource("Email du membre") } });
      const memberNameInput = element("input", { className: "v8-input v8-mail-lists__input", attributes: { type: "text", placeholder: translateSource("Nom (optionnel)") } });
      const addMemberBtn = actionButton({ actionId: "v8.mail.list.member.add", variant: "secondary", className: "v8-mail-lists__add-member" }, [icon("plus"), element("span", { text: translateSource("Ajouter") })]);
      addMemberBtn.addEventListener("click", () => { addListMember(state.selectedListId, memberEmailInput.value.trim(), memberNameInput.value.trim()); memberEmailInput.value = ""; memberNameInput.value = ""; });
      membersPanel = element("div", { className: "v8-mail-lists__members-panel" }, [element("strong", { className: "v8-mail-lists__members-title", text: translateSource("Membres") }), membersList, memberEmailInput, memberNameInput, addMemberBtn]);
    }

    const children = [title, list, form];
    if (membersPanel) children.push(membersPanel);
    return element("div", { className: "v8-mail-sidebar__lists" }, children);
  }

  function buildSecuritySection() {
    const title = element("strong", { className: "v8-mail-sidebar__section", text: translateSource("Sécurité") });

    const blockedTab = element("button", {
      className: `v8-mail-security__tab${state.securityTab === "blocked" ? " is-active" : ""}`,
      attributes: { type: "button" },
      text: translateSource("Bloqués")
    });
    const trustedTab = element("button", {
      className: `v8-mail-security__tab${state.securityTab === "trusted" ? " is-active" : ""}`,
      attributes: { type: "button" },
      text: translateSource("Fiables")
    });
    blockedTab.addEventListener("click", () => { state.securityTab = "blocked"; renderSidebar(); });
    trustedTab.addEventListener("click", () => { state.securityTab = "trusted"; renderSidebar(); });

    const list = element("ul", { className: "v8-mail-security__list" });
    const items = state.securityTab === "blocked" ? state.blocked : state.trusted;
    if (items.length) {
      items.forEach((item) => {
        const label = item.email || item.domain || translateSource("Inconnu");
        const deleteBtn = element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": translateSource("Supprimer {0}").replace("{0}", label) }
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
        text: state.securityTab === "blocked" ? translateSource("Aucun expéditeur bloqué.") : translateSource("Aucun expéditeur fiable.")
      }));
    }

    const emailInput = element("input", { className: "v8-input v8-mail-security__input", attributes: { type: "text", placeholder: translateSource("Email") } });
    const domainInput = element("input", { className: "v8-input v8-mail-security__input", attributes: { type: "text", placeholder: translateSource("Domaine") } });
    const reasonInput = element("input", { className: "v8-input v8-mail-security__input", attributes: { type: "text", placeholder: translateSource("Raison") } });

    const addBtn = actionButton({
      actionId: state.securityTab === "blocked" ? "v8.mail.security.block" : "v8.mail.security.trust",
      variant: "secondary",
      className: "v8-mail-security__add"
    }, [element("span", { text: state.securityTab === "blocked" ? translateSource("Bloquer") : translateSource("Faire confiance") })]);
    addBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const domain = domainInput.value.trim();
      const reason = reasonInput.value.trim();
      if (!email && !domain) {
        mailNotify({ type: "warning", title: translateSource("Sécurité"), message: translateSource("Saisissez un email ou un domaine.") });
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

  function renderBulkToolbar() {
    const count = state.selectedIds.size;
    const hasSelection = count > 0;
    if (listTitle) {
      if (hasSelection) {
        listTitle.textContent = translateSource("{0} sélectionné{1}").replace("{0}", count).replace("{1}", count > 1 ? "s" : "");
      } else {
        let label;
        if (hasActiveFilters()) {
          label = translateSource("Recherche avancée");
        } else if (state.isSearch) {
          label = `${translateSource("Recherche")} : ${state.query}`;
        } else {
          label = FOLDERS.find((f) => f.key === state.folder)?.label || "";
        }
        listTitle.textContent = `${label} (${state.messages.length})`;
      }
    }
    if (masterCheckbox) {
      masterCheckbox.disabled = !(state.messages || []).length;
      masterCheckbox.checked = (state.messages || []).length > 0 && (state.messages || []).every((m) => state.selectedIds.has(String(m.id)));
    }
    if (archiveBtn) archiveBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
    if (markReadBtn) markReadBtn.disabled = !hasSelection;
    if (markUnreadBtn) markUnreadBtn.disabled = !hasSelection;
    if (snoozeBtn) snoozeBtn.disabled = !hasSelection;
    if (moveBtn) { moveBtn.disabled = !hasSelection; moveBtn.classList.toggle("is-hidden", !hasSelection); }
    if (labelBtn) { labelBtn.disabled = !hasSelection; labelBtn.classList.toggle("is-hidden", !hasSelection); }
    if (refreshBtn) refreshBtn.classList.toggle("is-hidden", hasSelection);
    if (moreBtn) moreBtn.classList.toggle("is-hidden", hasSelection);
    if (toolbar) toolbar.classList.toggle("is-selection", hasSelection);
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
      mailNotify({ type: "success", title: translateSource("Action groupée"), message: translateSource("Action appliquée.") });
      (state.messages || []).forEach((m) => {
        if (!ids.includes(String(m.id))) return;
        if (action === "mark_read") {
          m.is_read = target === true || target === "true";
        } else if (action === "mark_important") {
          m.is_important = target === true || target === "true";
        }
      });
      if (action === "move") {
        state.messages = (state.messages || []).filter((m) => !ids.includes(String(m.id)));
      }
      state.selectedIds.clear();
      masterCheckbox.checked = false;
      renderList();
      renderBulkToolbar();
      loadFolder();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Action groupée"), message: errorDescription(error) });
    }
  }

  async function bulkLabel(remove, labelName = "") {
    const name = String(labelName || "").trim();
    if (!name) return;
    const ids = [...state.selectedIds];
    if (!ids.length) return;
    try {
      await withQueue("label", { ids, label: name, remove });
      mailNotify({ type: "success", title: translateSource("Étiquette"), message: remove ? translateSource("Étiquette retirée.") : translateSource("Étiquette assignée.") });
      (state.messages || []).forEach((m) => {
        if (!ids.includes(String(m.id))) return;
        if (remove) {
          m.labels = (m.labels || []).filter((l) => (l?.name || l) !== name);
        } else {
          const matched = state.labels.find((l) => l.name === name);
          if (matched && !(m.labels || []).some((l) => (l?.id || l) === matched.id)) {
            m.labels = [...(m.labels || []), matched];
          }
        }
      });
      state.selectedIds.clear();
      if (masterCheckbox) masterCheckbox.checked = false;
      renderList();
      renderBulkToolbar();
      if (state.selected && ids.includes(String(state.selected.id))) renderReading();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Étiquette"), message: errorDescription(error) });
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
      mailNotify({ type: "success", title: translateSource("Snooze"), message: translateSource("Messages reportés.") });
      state.selectedIds.clear();
      masterCheckbox.checked = false;
      renderList();
      renderBulkToolbar();
      loadFolder();
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Snooze"), message: errorDescription(error) });
    }
  }

  function buildSnoozeDialog() {
    const title = element("h3", { className: "v8-mail-snooze__title", text: translateSource("Reporter") });
    const tomorrowBtn = actionButton({ actionId: "v8.mail.snooze.tomorrow", className: "v8-mail-snooze__option" }, [element("span", { text: translateSource("Demain") })]);
    const weekBtn = actionButton({ actionId: "v8.mail.snooze.week", className: "v8-mail-snooze__option" }, [element("span", { text: translateSource("1 semaine") })]);
    const customInput = element("input", {
      className: "v8-input v8-mail-snooze__custom",
      attributes: { type: "datetime-local" }
    });
    const cancelBtn = actionButton({ actionId: "v8.mail.snooze.cancel", variant: "outline" }, [element("span", { text: translateSource("Annuler") })]);
    const confirmBtn = actionButton({ actionId: "v8.mail.snooze.confirm", variant: "primary" }, [element("span", { text: translateSource("Confirmer") })]);

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
        mailNotify({ type: "warning", title: translateSource("Snooze"), message: translateSource("Choisissez une date.") });
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
        mailNotify({ type: "success", title: translateSource("Snooze"), message: translateSource("Message reporté.") });
        loadFolder();
      } catch (error) {
        mailNotify({ type: "error", title: translateSource("Snooze"), message: errorDescription(error) });
      }
    });
  }

  function renderList() {
    try {
    if (state.analyticsOpen) {
      messageList.hidden = true;
      if (analyticsPanel) analyticsPanel.hidden = false;
      return;
    }
    messageList.hidden = false;
    if (analyticsPanel) analyticsPanel.hidden = true;

    let label;
    if (hasActiveFilters()) {
      label = translateSource("Recherche avancée");
    } else if (state.isSearch) {
      label = `Recherche : ${state.query}`;
    } else {
      label = FOLDERS.find((f) => f.key === state.folder)?.label || "";
    }
    listTitle.textContent = `${label} (${state.messages.length})`;
    if (masterCheckbox) {
      masterCheckbox.disabled = !state.messages.length;
      masterCheckbox && (masterCheckbox.checked = (state.messages || []).length > 0 && (state.messages || []).every((m) => state.selectedIds.has(String(m.id))));
    }
    renderBulkToolbar();
    sortMessages();
    messageList.replaceChildren();

    if (state.loading && !state.messages.length) {
      messageList.append(element("li", {}, [buildSkeletonList(5)]));
      refreshIcons();
      return;
    }

    if (state.error && !state.messages.length) {
      messageList.append(buildErrorState({
        tagName: "li",
        title: translateSource("Impossible de charger les messages"),
        reason: errorDescription(state.error),
        actionText: translateSource("Réessayer"),
        action: () => void loadFolder()
      }));
      refreshIcons();
      return;
    }

    if (!state.messages.length) {
      messageList.append(buildEmptyState({
        tagName: "li",
        icon: "inbox",
        title: translateSource("Aucun message"),
        message: state.isSearch ? translateSource("Aucun résultat pour cette recherche.") : translateSource("Ce dossier est vide."),
        actionText: state.isSearch ? "" : translateSource("Nouveau message"),
        action: state.isSearch ? null : () => openCompose()
      }));
      refreshIcons();
      return;
    }

    state.messages.forEach((message) => messageList.append(buildRow(message)));
    refreshIcons();
  
    } catch (error) {
      console.error("renderList failed", error);
      if (messageList) {
          messageList.replaceChildren(buildErrorState({
            tagName: "li",
          title: translateSource("Erreur d'affichage"),
            reason: errorDescription(error),
            actionText: translateSource("Réessayer"),
            action: renderList
          }));
          refreshIcons();
        }
    }
  }

  function buildRow(message) {
    const from = message.from_name || getFromAddress(message) || translateSource("Inconnu");
    const subject = message.subject || translateSource("(aucun sujet)");
    const preview = String(message.body_text || message.snippet || "").replace(/\s+/g, " ").slice(0, 90);
    const date = formatMailDate(message.received_at || message.created_at);
    const hasAttachments = (message.attachments?.length > 0) || message.has_attachments;
    const isSelected = state.selectedIds.has(String(message.id));

    const checkbox = element("input", {
      className: "v8-mail-row__checkbox",
      attributes: { type: "checkbox", "aria-label": translateSource("Sélectionner") },
      dataset: { action: "select" }
    });
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      toggleSelection(message.id);
    });

    const indicators = element("span", { className: "v8-mail-row__indicators" }, [
      message.is_important ? element("span", { className: "v8-mail-row__indicator is-active", dataset: { action: "important" }, attributes: { role: "button", "aria-label": translateSource("Important") } }, [icon("alert-circle")]) : null,
      hasAttachments ? icon("paperclip") : null,
      element("span", { className: `v8-mail-row__indicator${message.is_starred ? " is-active" : ""}`, dataset: { action: "star" }, attributes: { role: "button", "aria-label": message.is_starred ? translateSource("Retirer des favoris") : translateSource("Mettre en favori") } }, [icon(message.is_starred ? "star" : "star-off")])
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
      { icon: "archive", label: translateSource("Archiver"), action: () => moveMessage(message, "archive") },
      { icon: "trash-2", label: translateSource("Supprimer"), action: () => moveMessage(message, "trash") },
      { icon: message.is_read ? "mail-open" : "mail", label: message.is_read ? translateSource("Marquer non lu") : translateSource("Marquer lu"), action: async () => {
        if (message.is_read) {
          message.is_read = false;
          try { await withQueue("read", { id: message.id, flags: { is_read: false } }); } catch {}
        } else {
          await markRead(message);
        }
        renderList();
      } },
      { icon: "clock-3", label: translateSource("Snooze"), action: () => snoozeMessage(message) }
    ];
    const children = items.map((item) => element("button", {
      className: "v8-bottom-sheet__action",
      attributes: { type: "button" },
      events: { click: (event) => { event.stopPropagation(); item.action(); } }
    }, [icon(item.icon), element("span", { text: item.label })]));
    showBottomSheet({ title: translateSource("Actions"), children });
  }

  async function openDetail(message) {
    state.selected = message;
    setView("detail");
    await markRead(message);
    renderList();
    renderReading();
  }

  function renderReading() {
    try {
    reading.replaceChildren();
    if (state.view === "detail" && state.selected) {
      buildDetail(state.selected);
    } else if (state.view === "compose") {
      if (!composeRoot) buildCompose();
      else reading.append(composeRoot);
    } else {
      reading.append(buildEmptyState({
        icon: "mail-open",
        title: translateSource("Sélectionnez un message"),
        message: translateSource("Choisissez un message dans la liste pour le lire.")
      }));
      refreshIcons();
    }
  
    } catch (error) {
      console.error("renderReading failed", error);
      if (reading) {
          reading.replaceChildren(buildErrorState({
            title: translateSource("Erreur d'affichage"),
            reason: errorDescription(error),
            actionText: translateSource("Réessayer"),
            action: renderReading
          }));
          refreshIcons();
        }
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
      mailNotify({ type: "info", title: translateSource("Création"), message: translateSource("prêt à copier") });
      return;
    }
    try {
      if (type === "task" && typeof repository.tasks?.create === "function") {
        await repository.tasks.create(item);
        mailNotify({ type: "success", title: translateSource("Tâche"), message: translateSource("Tâche créée.") });
      } else if (type === "event" && typeof repository.events?.create === "function") {
        await repository.events.create(item);
        mailNotify({ type: "success", title: translateSource("Événement"), message: translateSource("Événement créé.") });
      } else if (type === "note" && typeof repository.notes?.create === "function") {
        const payload = {
          title: item.title || item.text || translateSource("Extrait"),
          content: item.description || item.text || JSON.stringify(item)
        };
        await repository.notes.create(payload);
        mailNotify({ type: "success", title: translateSource("Note"), message: translateSource("Note créée.") });
      } else {
        mailNotify({ type: "info", title: translateSource("Création"), message: translateSource("prêt à copier") });
      }
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Création"), message: errorDescription(error) });
    }
  }

  async function analyzeMessage(message, panel) {
    if (!mailApi?.analyze) {
      mailNotify({ type: "warning", title: translateSource("Brain"), message: translateSource("L'analyse n'est pas disponible.") });
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
      mailNotify({ type: "error", title: translateSource("Brain"), message: errorDescription(error) });
    }
  }

  async function suggestMessage(message, panel) {
    if (!mailApi?.suggest) {
      mailNotify({ type: "warning", title: translateSource("Brain"), message: translateSource("Les suggestions ne sont pas disponibles.") });
      return;
    }
    try {
      const result = await mailApi.suggest(message.id);
      const suggestions = result?.data?.suggestions || result?.suggestions || (Array.isArray(result) ? result : []);
      panel.replaceChildren(buildSuggestionChips(suggestions.slice(0, 3), message));
      panel.hidden = false;
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Brain"), message: errorDescription(error) });
    }
  }

  async function extractMessage(message, panel) {
    if (!mailApi?.extract) {
      mailNotify({ type: "warning", title: translateSource("Brain"), message: translateSource("L'extraction n'est pas disponible.") });
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
      mailNotify({ type: "error", title: translateSource("Brain"), message: errorDescription(error) });
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
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: translateSource("Tâches extraites") }), list);
    }
    if (events.length) {
      const list = element("ul", { className: "v8-mail-brain__list" });
      events.forEach((e) => {
        list.append(element("li", {}, [element("span", { text: e.title || e.text || String(e) })]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: translateSource("Événements extraits") }), list);
    }
    if (!summary && !tasks.length && !events.length) {
      wrap.append(element("p", { text: translateSource("Aucune analyse disponible.") }));
    }
    return wrap;
  }

  function buildSuggestionChips(suggestions, message) {
    const wrap = element("div", { className: "v8-mail-suggestions" });
    if (!suggestions.length) {
      wrap.append(element("p", { text: translateSource("Aucune suggestion.") }));
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
        const taskBtn = element("button", { className: "v8-button v8-button--secondary v8-mail-brain__action", attributes: { type: "button" }, text: translateSource("Tâche") });
        const noteBtn = element("button", { className: "v8-button v8-button--outline v8-mail-brain__action", attributes: { type: "button" }, text: translateSource("Note") });
        taskBtn.addEventListener("click", () => createItem(task, "task"));
        noteBtn.addEventListener("click", () => createItem(task, "note"));
        list.append(element("li", { className: "v8-mail-brain__item" }, [
          element("span", { className: "v8-mail-brain__item-title", text: title }),
          element("span", { className: "v8-mail-brain__actions" }, [taskBtn, noteBtn])
        ]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: translateSource("Tâches") }), list);
    }
    if (events.length) {
      const list = element("ul", { className: "v8-mail-brain__list" });
      events.forEach((eventItem) => {
        const title = eventItem.title || eventItem.text || String(eventItem);
        const eventBtn = element("button", { className: "v8-button v8-button--secondary v8-mail-brain__action", attributes: { type: "button" }, text: translateSource("Événement") });
        const noteBtn = element("button", { className: "v8-button v8-button--outline v8-mail-brain__action", attributes: { type: "button" }, text: translateSource("Note") });
        eventBtn.addEventListener("click", () => createItem(eventItem, "event"));
        noteBtn.addEventListener("click", () => createItem(eventItem, "note"));
        list.append(element("li", { className: "v8-mail-brain__item" }, [
          element("span", { className: "v8-mail-brain__item-title", text: title }),
          element("span", { className: "v8-mail-brain__actions" }, [eventBtn, noteBtn])
        ]));
      });
      wrap.append(element("strong", { className: "v8-mail-brain__section-title", text: translateSource("Événements") }), list);
    }
    if (!tasks.length && !events.length) {
      wrap.append(element("p", { text: translateSource("Aucun élément extrait.") }));
    }
    return wrap;
  }

  function buildDetail(message) {
    const from = message.from_name || getFromAddress(message) || translateSource("Inconnu");
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
          attributes: { type: "button", "aria-label": translateSource("Retirer {0}").replace("{0}", name) }
        }, [icon("x")])
      ]);
    });
    labels.forEach((node) => {
      const name = node.querySelector("span")?.textContent;
      if (!name) return;
      node.querySelector("button").addEventListener("click", () => assignLabel([message.id], name, true));
    });

    const assignSelect = element("select", { className: "v8-input v8-mail-assign-label" }, [
      element("option", { text: translateSource("Étiquette..."), attributes: { value: "" } }),
      ...state.labels.map((l) => element("option", { text: l.name, attributes: { value: String(l.name) } }))
    ]);
    assignSelect.addEventListener("change", () => {
      if (assignSelect.value) {
        assignLabel([message.id], assignSelect.value);
        assignSelect.value = "";
      }
    });

    const participants = [
      translateSource("De : {0}").replace("{0}", from),
      to ? translateSource("À : {0}").replace("{0}", to) : "",
      cc ? translateSource("Cc : {0}").replace("{0}", cc) : "",
      bcc ? translateSource("Cci : {0}").replace("{0}", bcc) : ""
    ].filter(Boolean).join(" · ");

    const backButton = element("button", {
      className: "v8-icon-button v8-mail-back",
      attributes: { type: "button", "aria-label": translateSource("Retour") },
      events: { click: backToList }
    }, [icon("arrow-left")]);

    const replyBtn = actionButton({ actionId: "v8.mail.reply", variant: "secondary" }, [icon("reply"), element("span", { text: translateSource("Répondre") })]);
    const forwardBtn = actionButton({ actionId: "v8.mail.forward", variant: "secondary" }, [icon("forward"), element("span", { text: translateSource("Transférer") })]);
    const archiveBtn = actionButton({ actionId: "v8.mail.archive", className: "v8-icon-button", ariaLabel: translateSource("Archiver") }, [icon("archive")]);
    const spamBtn = actionButton({ actionId: "v8.mail.spam", className: "v8-icon-button", ariaLabel: translateSource("Spam") }, [icon("shield-alert")]);
    const deleteBtn = actionButton({ actionId: "v8.mail.delete", className: "v8-icon-button", ariaLabel: translateSource("Supprimer") }, [icon("trash-2")]);
    const starBtn = actionButton({
      actionId: "v8.mail.star",
      className: `v8-icon-button${message.is_starred ? " is-active" : ""}`,
      ariaLabel: message.is_starred ? translateSource("Retirer des favoris") : translateSource("Mettre en favori")
    }, [icon(message.is_starred ? "star" : "star-off")]);
    const importantBtn = actionButton({
      actionId: "v8.mail.important",
      className: `v8-icon-button${message.is_important ? " is-active" : ""}`,
      ariaLabel: message.is_important ? translateSource("Marquer comme non important") : translateSource("Marquer comme important")
    }, [icon("alert-circle")]);
    const snoozeBtn = actionButton({
      actionId: "v8.mail.snooze",
      className: "v8-icon-button",
      ariaLabel: translateSource("Snooze")
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
    }, [element("span", { text: translateSource("Bloquer") })]);
    const trustBtn = actionButton({
      actionId: "v8.mail.trust",
      variant: "outline",
      className: "v8-mail-security__btn v8-mail-security__btn--trust"
    }, [element("span", { text: translateSource("Faire confiance") })]);
    blockBtn.addEventListener("click", () => { blockSenderFrom(senderEmail, senderDomain); moveMessage(message, "trash"); });
    trustBtn.addEventListener("click", () => trustSenderFrom(senderEmail, senderDomain));

    const securityBar = buildSecurityBar(message);

    const header = element("header", { className: "v8-mail-detail__header" }, [
      element("div", { className: "v8-mail-detail__title" }, [
        backButton,
        element("h2", { text: message.subject || translateSource("(aucun sujet)") })
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

    const summarizeBtn = actionButton({ actionId: "v8.mail.brain.summarize", variant: "secondary" }, [icon("brain"), element("span", { text: translateSource("Résumer") })]);
    const suggestBtn = actionButton({ actionId: "v8.mail.brain.suggest", variant: "secondary" }, [icon("message-square"), element("span", { text: translateSource("Réponses suggérées") })]);
    const extractBtn = actionButton({ actionId: "v8.mail.brain.extract", variant: "secondary" }, [icon("search"), element("span", { text: translateSource("Extraire") })]);
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
        "aria-label": translateSource("Message"),
        "data-placeholder": translateSource("Votre message...")
      }
    });

    const commands = [
      { cmd: "bold", icon: "bold", label: translateSource("Gras") },
      { cmd: "italic", icon: "italic", label: translateSource("Italique") },
      { cmd: "underline", icon: "underline", label: translateSource("Souligné") },
      { cmd: "insertUnorderedList", icon: "list", label: translateSource("Liste à puces") },
      { cmd: "insertOrderedList", icon: "list-ordered", label: translateSource("Liste numérotée") },
      { cmd: "formatBlock:blockquote", icon: "quote", label: translateSource("Citation") },
      { cmd: "formatBlock:pre", icon: "code", label: translateSource("Code") },
      { cmd: "createLink", icon: "link", label: translateSource("Lien") }
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
        const url = globalThis.prompt?.(translateSource("Adresse du lien"), "https://");
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
      attributes: { type: "text", placeholder: translateSource("Sujet"), "aria-label": translateSource("Sujet"), value: initialSubject }
    });

    const ccToggle = element("button", {
      className: "v8-button v8-button--outline v8-mail-compose__toggle",
      attributes: { type: "button" },
      text: translateSource("Cc")
    });
    const bccToggle = element("button", {
      className: "v8-button v8-button--outline v8-mail-compose__toggle",
      attributes: { type: "button" },
      text: translateSource("Cci")
    });

    const ccWrap = element("div", { className: "v8-mail-compose__cc", attributes: { hidden: initialCc ? null : "" } }, [
      element("span", { text: translateSource("Cc") }),
      ccField.wrap
    ]);
    const bccWrap = element("div", { className: "v8-mail-compose__bcc", attributes: { hidden: initialBcc ? null : "" } }, [
      element("span", { text: translateSource("Cci") }),
      bccField.wrap
    ]);

    ccToggle.addEventListener("click", () => { ccWrap.hidden = false; ccField.input.focus(); });
    bccToggle.addEventListener("click", () => { bccWrap.hidden = false; bccField.input.focus(); });

    const templateSelect = element("select", { className: "v8-input v8-mail-template", attributes: { "aria-label": translateSource("Modèle") } }, [
      element("option", { text: translateSource("Aucun modèle"), attributes: { value: "" } }),
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

    const signatureSelect = element("select", { className: "v8-input v8-mail-signature", attributes: { "aria-label": translateSource("Signature") } }, [
      element("option", { text: translateSource("Aucune signature"), attributes: { value: "" } }),
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
      attributes: { type: "datetime-local", "aria-label": translateSource("Envoyer plus tard") }
    });

    const fileInput = element("input", {
      className: "v8-input v8-file-input",
      attributes: { type: "file", multiple: "true", "aria-label": translateSource("Pièces jointes") }
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
          attributes: { type: "button", "aria-label": translateSource("Retirer {0}").replace("{0}", a.filename) }
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
      attributes: { type: "button", "aria-label": translateSource("Retour") },
      events: { click: backToList }
    }, [icon("arrow-left")]);

    const sendBtn = actionButton({ actionId: "v8.mail.send", variant: "primary" }, [icon("send"), element("span", { text: translateSource("Envoyer") })]);
    const saveBtn = actionButton({ actionId: "v8.mail.save", variant: "secondary" }, [icon("save"), element("span", { text: translateSource("Enregistrer") })]);
    const discardBtn = actionButton({ actionId: "v8.mail.discard", variant: "danger" }, [icon("trash-2"), element("span", { text: translateSource("Supprimer") })]);

    sendBtn.addEventListener("click", sendNow);
    saveBtn.addEventListener("click", saveDraftNow);
    discardBtn.addEventListener("click", discardNow);

    const header = element("header", { className: "v8-mail-compose__header" }, [
      backButton,
      element("h2", { text: draft ? translateSource("Brouillon") : translateSource("Nouveau message") }),
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
    if (status) status.textContent = translateSource("Enregistrement...");
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
      if (status) status.textContent = isOnline() ? translateSource("Enregistré") : translateSource("En attente");
    } catch (error) {
      if (status) status.textContent = translateSource("Erreur d'enregistrement");
      mailNotify({ type: "error", title: translateSource("Brouillon"), message: errorDescription(error) });
    }
  }

  async function sendNow() {
    if (!mailApi || !composeEditor) return;
    const payload = collectPayload();
    if (!payload.to.length) {
      mailNotify({ type: "warning", title: translateSource("Mail"), message: translateSource("Ajoutez au moins un destinataire.") });
      return;
    }
    const isScheduled = !!payload.scheduled_at;
    try {
      await withQueue("send", payload);
      mailNotify({ type: "success", title: translateSource("Mail"), message: isScheduled ? translateSource("Message programmé.") : translateSource("Message envoyé.") });
      const draftToDelete = composeDraftId;
      composeDraftId = null;
      if (isOnline() && draftToDelete) {
        try { await mailApi.deleteDraft(draftToDelete); } catch {}
      }
      backToList();
      loadFolder();
    } catch (error) {
      mailNotify({ type: "error", title: isScheduled ? translateSource("Échec de la programmation") : translateSource("Échec de l'envoi"), message: errorDescription(error) });
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
    try {
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
    } catch (error) {
      mailNotify({ type: "error", title: translateSource("Mail"), message: errorDescription(error) });
    }
  }

  init();

  return () => {
    if (searchTimer) clearTimeout(searchTimer);
    if (draftTimer) clearTimeout(draftTimer);
    globalThis.removeEventListener?.("online", onOnline);
    globalThis.removeEventListener?.("offline", onOffline);
    if (filterCloseHandler) document.removeEventListener("click", filterCloseHandler);
    if (filterKeyHandler) document.removeEventListener("keydown", filterKeyHandler);
    page.remove();
  };
}
