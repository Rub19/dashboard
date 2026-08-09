import { actionButton, element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";

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

function mailRow(message, handlers) {
  const isRead = message.is_read === true;
  const from = message.from_name || message.from_address || "Inconnu";
  const subject = message.subject || "(aucun sujet)";
  const preview = message.body_text?.slice(0, 120).replace(/\s+/g, " ") || "";
  const date = formatMailDate(message.received_at || message.created_at);
  return element("button", { className: `v8-mail-row${isRead ? "" : " v8-mail-row--unread"}`, attributes: { type: "button" }, events: { click: () => handlers.onOpen(message) } }, [
    element("span", { className: "v8-mail-row__from", text: from }),
    element("span", { className: "v8-mail-row__subject", text: subject }),
    element("span", { className: "v8-mail-row__preview", text: preview }),
    element("span", { className: "v8-mail-row__date", text: date })
  ]);
}

function mailDetail(message, handlers) {
  const from = message.from_name || message.from_address || "Inconnu";
  const to = Array.isArray(message.to_addresses) ? message.to_addresses.join(", ") : message.to_addresses || "";
  const date = new Date(message.received_at || message.created_at).toLocaleString("fr-FR");
  return element("article", { className: "v8-mail-detail" }, [
    element("header", { className: "v8-mail-detail__header" }, [
      element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Retour" }, events: { click: handlers.onBack } }, [icon("arrow-left")]),
      element("div", { className: "v8-mail-detail__meta" }, [
        element("strong", { text: message.subject || "(aucun sujet)" }),
        element("small", { text: `De : ${from}` }),
        element("small", { text: `À : ${to}` }),
        element("small", { text: date })
      ])
    ]),
    element("div", { className: "v8-mail-detail__body", attributes: { translate: "no" } }, [
      element("div", { className: "v8-mail-detail__content", html: message.body_html || message.body_text?.replace(/\n/g, "<br>") || "" })
    ]),
    element("footer", { className: "v8-mail-detail__actions" }, [
      actionButton("Répondre", "reply", handlers.onReply),
      actionButton("Transférer", "forward", handlers.onForward)
    ])
  ]);
}

function composeForm(handlers) {
  const toInput = element("input", { className: "v8-input", attributes: { type: "email", placeholder: "Destinataire", "aria-label": "Destinataire" } });
  const subjectInput = element("input", { className: "v8-input", attributes: { type: "text", placeholder: "Sujet", "aria-label": "Sujet" } });
  const bodyInput = element("textarea", { className: "v8-input v8-input--textarea", attributes: { placeholder: "Votre message...", "aria-label": "Message" } });

  const send = () => {
    const to = toInput.value.trim();
    const subject = subjectInput.value.trim();
    const text = bodyInput.value.trim();
    if (!to || !subject || !text) return;
    handlers.onSend({ to: [to], subject, text });
  };

  return element("form", { className: "v8-mail-compose", events: { submit: (e) => { e.preventDefault(); send(); } } }, [
    element("header", { className: "v8-mail-compose__header" }, [
      element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Retour" }, events: { click: handlers.onBack } }, [icon("arrow-left")]),
      element("strong", { text: "Nouveau message" })
    ]),
    toInput,
    subjectInput,
    bodyInput,
    element("footer", { className: "v8-mail-compose__actions" }, [
      actionButton("Envoyer", "send", send)
    ])
  ]);
}

export function mountMail(stage, options = {}) {
  const externalServices = options.externalServices || null;
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const state = { messages: [], alias: null, view: "list", selected: null, loading: false };

  const container = element("div", { className: "v8-page v8-mail" }, []);

  const mailApi = externalServices?.mail || null;

  async function fetchAlias() {
    try {
      const result = mailApi ? await mailApi.alias() : null;
      state.alias = result?.data || null;
    } catch {
      state.alias = null;
    }
  }

  async function fetchInbox() {
    state.loading = true;
    render();
    try {
      const result = mailApi ? await mailApi.inbox() : null;
      state.messages = result?.data || [];
    } catch (error) {
      state.messages = [];
      notify({ tone: "error", title: "Impossible de charger la boîte mail", description: String(error?.message || "Erreur inconnue") });
    }
    state.loading = false;
    render();
  }

  async function markRead(message) {
    if (!message || message.is_read) return;
    try {
      if (mailApi) await mailApi.read(message.id, true);
      message.is_read = true;
    } catch {
      // ignore
    }
  }

  async function sendMail(payload) {
    try {
      if (mailApi) await mailApi.send(payload);
      notify({ tone: "success", title: "Message envoyé" });
      state.view = "list";
      await fetchInbox();
    } catch (error) {
      notify({ tone: "error", title: "Échec de l'envoi", description: String(error?.message || "Erreur inconnue") });
    }
  }

  const handlers = {
    onOpen: async (message) => {
      state.selected = message;
      state.view = "detail";
      await markRead(message);
      render();
    },
    onBack: () => {
      state.view = "list";
      state.selected = null;
      render();
    },
    onReply: () => {
      state.view = "compose";
      render();
    },
    onForward: () => {
      state.view = "compose";
      render();
    },
    onSend: sendMail,
    onCompose: () => {
      state.view = "compose";
      state.selected = null;
      render();
    }
  };

  function render() {
    container.replaceChildren();
    if (state.loading && !state.messages.length) {
      container.append(statusState("loading", { title: "Chargement de la boîte mail...", compact: true }));
      refreshIcons();
      return;
    }

    const header = element("header", { className: "v8-page-header" }, [
      element("div", { className: "v8-page-header__copy" }, [
        element("h1", { text: "Mail" }),
        state.alias ? element("small", { text: `Adresse : ${state.alias.alias}` }) : null
      ]),
      element("div", { className: "v8-page-header__actions" }, [
        actionButton("Nouveau", "pencil", handlers.onCompose)
      ])
    ]);

    container.append(header);

    if (state.view === "compose") {
      container.append(composeForm(handlers));
      refreshIcons();
      return;
    }

    if (state.view === "detail" && state.selected) {
      container.append(mailDetail(state.selected, handlers));
      refreshIcons();
      return;
    }

    if (!state.messages.length) {
      container.append(statusState("empty", { title: "Aucun message", description: "Votre boîte est vide. Envoyez votre premier message avec ETHONE Mail.", compact: true, inline: true }));
      refreshIcons();
      return;
    }

    const list = element("ul", { className: "v8-mail-list" }, state.messages.map((m) => mailRow(m, handlers)));
    container.append(list);
    refreshIcons();
  }

  stage.replaceChildren(container);
  fetchAlias().then(fetchInbox);

  return function unmount() {
    container.replaceChildren();
  };
}
