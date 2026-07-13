import { element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createWindowController } from "../ui/window-system.mjs";

const TYPE_LABELS = Object.freeze({
  personal: "Personnel",
  work: "Travail",
  development: "Développement",
  study: "Études",
  gaming: "Gaming",
  streaming: "Streaming",
  creative: "Créatif"
});

const ACCENT_LABELS = Object.freeze({
  mint: "Menthe",
  sky: "Azur",
  amber: "Ambre",
  violet: "Violet",
  rose: "Rose"
});

const WIDGETS_BY_TYPE = Object.freeze({
  personal: Object.freeze(["Aujourd'hui", "Notes", "Calendrier"]),
  work: Object.freeze(["Tâches", "Calendrier", "Focus"]),
  development: Object.freeze(["GitHub", "Terminal", "Brain"]),
  study: Object.freeze(["Notes", "Planning", "Focus"]),
  gaming: Object.freeze(["Discord", "Spotify", "Sessions"]),
  streaming: Object.freeze(["Direct", "Planning", "Clips"]),
  creative: Object.freeze(["Projets", "Fichiers", "Brain"])
});

const WIDGET_ICONS = Object.freeze({
  "Aujourd'hui": "sun-medium",
  Notes: "notebook-pen",
  Calendrier: "calendar-days",
  Tâches: "circle-check-big",
  Focus: "timer",
  GitHub: "github",
  Terminal: "square-terminal",
  Brain: "brain",
  Planning: "calendar-range",
  Discord: "message-circle",
  Spotify: "audio-lines",
  Sessions: "gamepad-2",
  Direct: "radio",
  Clips: "clapperboard",
  Projets: "panels-top-left",
  Fichiers: "folder"
});

const AVATAR_CHOICES = Object.freeze(["E", "R", "W", "D", "G", "S"]);

const MENU_ACTIONS = Object.freeze([
  Object.freeze({ id: "rename", label: "Renommer", icon: "text-cursor-input" }),
  Object.freeze({ id: "edit", label: "Modifier le profil", icon: "sliders-horizontal" }),
  Object.freeze({ id: "avatar", label: "Changer l'avatar", icon: "circle-user-round" }),
  Object.freeze({ id: "space", label: "Changer le Space", icon: "panels-top-left" }),
  Object.freeze({ id: "theme", label: "Changer le thème", icon: "palette" }),
  Object.freeze({ id: "export", label: "Exporter", icon: "download" }),
  Object.freeze({ id: "duplicate", label: "Dupliquer", icon: "copy" }),
  Object.freeze({ id: "delete", label: "Supprimer", icon: "trash-2", danger: true })
]);

export function nextProfileIndex(totalInput, currentInput, key) {
  const total = Math.max(0, Number(totalInput) || 0);
  if (!total) return -1;
  const current = Math.min(total - 1, Math.max(0, Number(currentInput) || 0));
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % total;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + total) % total;
  return current;
}

function count(value) {
  return Math.max(0, Number(value) || 0);
}

export function profilePreviewModel(profile = {}) {
  const avatar = profile.avatar && typeof profile.avatar === "object"
    ? Object.freeze({ kind: String(profile.avatar.kind || "initials"), value: String(profile.avatar.value || "E") })
    : Object.freeze({ kind: "initials", value: "E" });
  const type = TYPE_LABELS[profile.type] ? profile.type : "personal";
  const accent = Object.hasOwn(ACCENT_LABELS, profile.accent) ? profile.accent : "mint";
  const signals = Object.freeze([
    Object.freeze({ label: "Notes", value: count(profile.counts?.notes) }),
    Object.freeze({ label: "À faire", value: count(profile.counts?.openTasks) }),
    Object.freeze({ label: "Agenda", value: count(profile.counts?.events) }),
    Object.freeze({ label: "Fichiers", value: count(profile.counts?.files) })
  ]);
  return Object.freeze({
    id: String(profile.id || ""),
    name: String(profile.name || "Profil"),
    typeLabel: TYPE_LABELS[type],
    description: String(profile.description || "Votre environnement ETHONE."),
    avatar,
    accent,
    tone: TYPE_LABELS[profile.wallpaperTone] ? profile.wallpaperTone : type,
    locked: profile.locked === true,
    statusLabel: profile.locked === true ? "Protégé" : "Prêt",
    lastActiveLabel: profile.lastActiveAt ? "Session enregistrée" : "Récemment",
    spaceLabel: TYPE_LABELS[profile.space] || TYPE_LABELS[type],
    themeLabel: ACCENT_LABELS[accent],
    flowLabel: String(profile.flow || "Essentiel"),
    favoriteWidgets: WIDGETS_BY_TYPE[type],
    signals
  });
}

export function settleActivationResult(result, view) {
  if (!result || result.ok !== false) return false;
  view.surface.classList.remove("is-launching");
  view.surface.setAttribute("aria-busy", "false");
  view.enterButton.disabled = false;
  view.status.textContent = result.message || "L'environnement n'a pas pu être ouvert.";
  return true;
}

function avatarNode(avatar, className, loading = "lazy") {
  if (avatar.kind === "image") {
    return element("img", { className, attributes: { src: avatar.value, alt: "", loading, referrerpolicy: "no-referrer" } });
  }
  return element("span", { className, text: avatar.value, attributes: { "aria-hidden": "true" } });
}

function signalRow(signal) {
  return element("div", { className: "v8-profile-preview__signal" }, [
    element("span", { text: signal.label }),
    element("strong", { text: signal.value })
  ]);
}

function metaItem(iconName, label, value) {
  return element("div", { className: "v8-profile-preview__meta-item" }, [
    icon(iconName),
    element("span", {}, [element("small", { text: label }), element("strong", { text: value })])
  ]);
}

function widgetChip(name) {
  return element("span", { className: "v8-profile-preview__widget" }, [
    icon(WIDGET_ICONS[name] || "box"),
    element("span", { text: name })
  ]);
}

function optionNode(value, label) {
  return element("option", { text: label, attributes: { value } });
}

export function mountProfileSelection(root, options = {}) {
  if (!root) throw new TypeError("Profile selection requires a root element");
  const repository = options.repository;
  if (!repository) throw new TypeError("Profile selection requires a repository");
  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  let profiles = Object.freeze((options.profiles || repository.listProfiles()).map(profilePreviewModel));
  let selectedIndex = Math.max(0, profiles.findIndex((profile) => profile.id === repository.activeProfile()?.id));
  let cards = [];
  let destroyed = false;
  let launchTimer = 0;
  let activation = 0;
  let menuProfileId = "";
  let menuTrigger = null;
  const dialogWindow = createWindowController({ onEscape: () => closeDialog() });

  root.replaceChildren();
  root.dataset.entryState = "profiles";
  document.documentElement.dataset.entry = "profiles";

  const status = element("div", { className: "v8-profile-select__status", attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" } });
  const profileCount = element("span", { className: "v8-profile-browser__count" });
  const previewAvatarHost = element("div", { className: "v8-profile-preview__avatar" });
  const previewType = element("span", { className: "v8-profile-preview__type" });
  const previewName = element("h2", { className: "v8-profile-preview__name", attributes: { translate: "no" } });
  const previewDescription = element("p", { className: "v8-profile-preview__description" });
  const previewStatus = element("span", { className: "v8-profile-preview__status" });
  const previewLastActive = element("span", { className: "v8-profile-preview__last-active" });
  const previewSignals = element("div", { className: "v8-profile-preview__signals" });
  const previewMeta = element("div", { className: "v8-profile-preview__meta" });
  const previewWidgets = element("div", { className: "v8-profile-preview__widgets" });
  const miniGreeting = element("strong", { className: "v8-profile-mini__greeting" });
  const miniContext = element("span", { className: "v8-profile-mini__context" });
  const miniSignalA = element("strong");
  const miniSignalB = element("strong");
  const enterLabel = element("span");
  const enterButton = element("button", { className: "v8-button v8-button--primary v8-profile-select__enter", attributes: { type: "button" } }, [icon("arrow-right"), enterLabel]);

  const preview = element("section", { className: "v8-profile-preview", attributes: { "aria-label": "Aperçu de l'environnement" } }, [
    element("div", { className: "v8-profile-preview__ambient", attributes: { "aria-hidden": "true" } }, [element("span", { text: "08" }), element("i"), element("i")]),
    element("div", { className: "v8-profile-preview__header" }, [
      element("div", { className: "v8-profile-preview__eyebrow" }, [icon("orbit"), element("span", { text: "ENVIRONNEMENT ACTIF" })]),
      element("div", { className: "v8-profile-preview__presence" }, [previewStatus, previewLastActive])
    ]),
    element("div", { className: "v8-profile-preview__identity" }, [
      previewAvatarHost,
      element("div", { className: "v8-profile-preview__copy" }, [previewType, previewName, previewDescription])
    ]),
    previewMeta,
    element("div", { className: "v8-profile-preview__dashboard" }, [
      element("div", { className: "v8-profile-mini", attributes: { "aria-hidden": "true" } }, [
        element("div", { className: "v8-profile-mini__rail" }, [element("span", { text: "E" }), element("i"), element("i"), element("i"), element("i")]),
        element("div", { className: "v8-profile-mini__workspace" }, [
          element("div", { className: "v8-profile-mini__top" }, [element("span", { text: "ETHONE / HOME" }), element("i")]),
          element("div", { className: "v8-profile-mini__hero" }, [miniGreeting, miniContext]),
          element("div", { className: "v8-profile-mini__grid" }, [
            element("div", {}, [element("span", { text: "Continuité" }), miniSignalA]),
            element("div", {}, [element("span", { text: "Aujourd'hui" }), miniSignalB]),
            element("div", {}, [element("span", { text: "Signal" }), element("strong", { text: "Stable" })])
          ])
        ])
      ]),
      element("div", { className: "v8-profile-preview__utility" }, [
        element("div", { className: "v8-profile-preview__utility-title" }, [element("span", { text: "Widgets favoris" }), element("small", { text: "Préchargés" })]),
        previewWidgets,
        previewSignals
      ])
    ])
  ]);

  const list = element("div", { className: "v8-profile-list", attributes: { role: "listbox", "aria-label": "Profils ETHONE", "aria-orientation": "vertical" } });
  const createButton = element("button", { className: "v8-button v8-button--secondary v8-profile-browser__create", attributes: { type: "button" } }, [icon("plus"), element("span", { text: "Créer un profil" })]);
  const browserPanel = element("aside", { className: "v8-profile-browser", attributes: { "aria-label": "Sélecteur de profils" } }, [
    element("div", { className: "v8-profile-browser__header" }, [
      element("div", {}, [element("span", { className: "v8-entry__eyebrow", text: "VOS ENVIRONNEMENTS" }), element("div", { className: "v8-profile-browser__title" }, [element("h2", { text: "Choisir un profil" }), profileCount])]),
      createButton
    ]),
    list,
    element("div", { className: "v8-profile-browser__footnote" }, [icon("mouse-pointer-2"), element("span", { text: "Survolez pour prévisualiser · Double-cliquez pour ouvrir" })])
  ]);

  const menu = element("div", { className: "v8-profile-menu", attributes: { role: "menu", "aria-label": "Actions du profil", hidden: true } });
  const menuButtons = MENU_ACTIONS.map((action) => {
    const button = element("button", {
      className: `v8-profile-menu__item${action.danger ? " is-danger" : ""}`,
      attributes: { type: "button", role: "menuitem" },
      dataset: { profileAction: action.id }
    }, [icon(action.icon), element("span", { text: action.label })]);
    menu.append(button);
    return button;
  });

  const dialogLayer = element("div", { className: "v8-profile-dialog-layer", attributes: { hidden: true } });
  const signOut = element("button", { className: "v8-button v8-button--outline", attributes: { type: "button" } }, [icon("log-out"), element("span", { text: "Changer de compte" })]);

  const emptyCreateButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" } }, [icon("plus"), element("span", { text: "Créer un profil" })]);
  const profileEmpty = emptyState({
    iconName: "user-round-plus",
    eyebrow: "Premier environnement",
    title: "Créez votre premier univers",
    description: "Un profil réunit votre Space, votre thème et votre contexte local.",
    actions: [emptyCreateButton],
    className: "v8-profile-empty"
  });

  const workspace = element("div", { className: "v8-profile-select__workspace" }, [preview, browserPanel]);
  const surface = element("section", { className: "v8-entry v8-entry--profiles", attributes: { "aria-label": "Sélection du profil" } }, [
    element("div", { className: "v8-entry__signal-field", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
    element("div", { className: "v8-entry__frame v8-profile-select__frame" }, [
      element("header", { className: "v8-entry__topbar" }, [
        element("div", { className: "v8-entry__brand" }, [
          element("span", { className: "v8-entry__mark", text: "E", attributes: { "aria-hidden": "true" } }),
          element("span", { className: "v8-entry__wordmark", text: "ETHONE" }),
          element("span", { className: "v8-badge", text: "ENVIRONMENTS" })
        ]),
        signOut
      ]),
      element("main", { className: "v8-profile-select__main" }, [
        element("div", { className: "v8-profile-select__intro" }, [
          element("div", {}, [element("span", { className: "v8-entry__eyebrow", text: "CHOOSE YOUR SIGNAL" }), element("h1", { text: "Entrez dans votre environnement." })]),
          element("p", { text: "Chaque profil restaure instantanément son Space, son Flow et son rythme." })
        ]),
        workspace,
        profileEmpty,
        status
      ]),
      element("footer", { className: "v8-profile-select__footer" }, [
        element("div", { className: "v8-profile-select__hint" }, [icon("keyboard"), element("span", { text: "Flèches pour parcourir · Entrée pour ouvrir · Menu pour gérer" })]),
        enterButton
      ]),
      menu,
      dialogLayer
    ])
  ]);

  root.append(surface);

  function profileModels() {
    return Object.freeze(repository.listProfiles().map(profilePreviewModel));
  }

  function animatePreview() {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof preview.animate !== "function") return;
    preview.getAnimations().forEach((animation) => animation.cancel());
    preview.animate([
      { opacity: 0.78, transform: "translate3d(0, 5px, 0) scale(0.995)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
    ], { duration: 190, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  }

  function selectPreview(index, focusCard = false) {
    if (!profiles.length || destroyed) return;
    selectedIndex = Math.min(profiles.length - 1, Math.max(0, index));
    const profile = profiles[selectedIndex];
    document.documentElement.dataset.accent = profile.accent;
    surface.dataset.tone = profile.tone;
    cards.forEach((card, cardIndex) => {
      const selected = cardIndex === selectedIndex;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-selected", String(selected));
      card.tabIndex = selected ? 0 : -1;
    });
    previewAvatarHost.replaceChildren(avatarNode(profile.avatar, "v8-profile-preview__avatar-content", "eager"));
    previewType.textContent = profile.typeLabel;
    previewName.textContent = profile.name;
    previewDescription.textContent = profile.description;
    previewStatus.textContent = profile.statusLabel;
    previewLastActive.textContent = profile.lastActiveLabel;
    previewMeta.replaceChildren(
      metaItem("panels-top-left", "Space", profile.spaceLabel),
      metaItem("workflow", "Flow", profile.flowLabel),
      metaItem("palette", "Thème", profile.themeLabel)
    );
    previewWidgets.replaceChildren(...profile.favoriteWidgets.map(widgetChip));
    previewSignals.replaceChildren(...profile.signals.slice(0, 3).map(signalRow));
    miniGreeting.textContent = `Bonjour, ${profile.name}`;
    miniContext.textContent = profile.description;
    miniSignalA.textContent = `${profile.signals[0].value} notes`;
    miniSignalB.textContent = `${profile.signals[1].value} priorités`;
    enterButton.replaceChildren(icon(profile.locked ? "lock-keyhole" : "arrow-right"), enterLabel);
    enterLabel.textContent = profile.locked ? "Continuer avec vérification" : `Ouvrir ${profile.name}`;
    status.textContent = profile.locked ? "Ce profil nécessite un déverrouillage." : "";
    animatePreview();
    if (focusCard) cards[selectedIndex]?.focus();
    refreshIcons();
  }

  function cardNode(profile, index) {
    const menuButton = element("button", {
      className: "v8-icon-button v8-profile-card__menu",
      attributes: { type: "button", "aria-label": `Gérer ${profile.name}`, "aria-haspopup": "menu", "aria-expanded": "false" }
    }, icon("ellipsis"));
    const card = element("div", {
      className: "v8-profile-card",
      attributes: { role: "option", "aria-selected": "false", tabindex: "-1", "aria-label": `${profile.name}${profile.locked ? ", verrouillé" : ""}` },
      dataset: { profileId: profile.id, accent: profile.accent, tone: profile.tone }
    }, [
      element("div", { className: "v8-profile-card__avatar-wrap" }, [avatarNode(profile.avatar, "v8-profile-card__avatar")]),
      element("div", { className: "v8-profile-card__body" }, [
        element("div", { className: "v8-profile-card__headline" }, [element("strong", { text: profile.name, attributes: { translate: "no" } }), element("span", { text: profile.statusLabel })]),
        element("span", { className: "v8-profile-card__context", text: `${profile.spaceLabel} · ${profile.themeLabel}` }),
        element("div", { className: "v8-profile-card__widgets", attributes: { "aria-hidden": "true" } }, profile.favoriteWidgets.map((name) => icon(WIDGET_ICONS[name] || "box")))
      ]),
      menuButton
    ]);
    card.addEventListener("pointerenter", () => selectPreview(index), listenerOptions);
    card.addEventListener("focus", () => selectPreview(index), listenerOptions);
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      selectPreview(index, true);
    }, listenerOptions);
    card.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      activate(index);
    }, listenerOptions);
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      selectPreview(index);
      openMenu(profile.id, menuButton, { x: event.clientX, y: event.clientY });
    }, listenerOptions);
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectPreview(index);
      openMenu(profile.id, menuButton);
    }, listenerOptions);
    return card;
  }

  function renderProfiles(preferredId = "", focusSelected = false) {
    profiles = profileModels();
    const fallbackId = profiles[selectedIndex]?.id || repository.activeProfile()?.id || "";
    const nextIndex = profiles.findIndex((profile) => profile.id === (preferredId || fallbackId));
    selectedIndex = nextIndex >= 0 ? nextIndex : 0;
    cards = profiles.map(cardNode);
    list.replaceChildren(...cards);
    profileCount.textContent = String(profiles.length).padStart(2, "0");
    workspace.hidden = profiles.length === 0;
    profileEmpty.hidden = profiles.length > 0;
    enterButton.hidden = profiles.length === 0;
    if (profiles.length) selectPreview(selectedIndex, focusSelected);
    refreshIcons();
  }

  function closeMenu({ restoreFocus = false } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    menu.style.removeProperty("left");
    menu.style.removeProperty("top");
    menuTrigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) menuTrigger?.focus();
    menuTrigger = null;
    menuProfileId = "";
  }

  function openMenu(profileId, trigger, point = null) {
    closeMenu();
    menuProfileId = profileId;
    menuTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    menuButtons.find((button) => button.dataset.profileAction === "delete").disabled = profiles.length <= 1;
    menu.hidden = false;
    const anchor = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const wantedLeft = point?.x ?? anchor.right;
    const wantedTop = point?.y ?? (anchor.bottom + 6);
    menu.style.left = `${Math.max(8, Math.min(wantedLeft - menuRect.width, globalThis.innerWidth - menuRect.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(wantedTop, globalThis.innerHeight - menuRect.height - 8))}px`;
    refreshIcons();
    menuButtons[0]?.focus();
  }

  function closeDialog({ restoreFocus = true } = {}) {
    if (dialogLayer.hidden || !dialogWindow.isOpen()) return;
    surface.classList.remove("has-profile-dialog");
    dialogWindow.close({ restoreFocus });
  }

  function dialogShell(title, description, content, actions) {
    const closeButton = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Fermer" } }, icon("x"));
    const dialog = element("section", { className: "v8-profile-dialog", attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-profile-dialog-title" } }, [
      element("header", { className: "v8-profile-dialog__header" }, [
        element("div", { className: "v8-profile-dialog__identity" }, [
          element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
          element("div", {}, [element("span", { className: "v8-entry__eyebrow", text: "ENVIRONNEMENT ETHONE" }), element("h2", { id: "v8-profile-dialog-title", text: title }), element("p", { text: description })])
        ]),
        closeButton
      ]),
      content,
      actions
    ]);
    closeButton.addEventListener("click", () => closeDialog(), listenerOptions);
    dialogLayer.replaceChildren(dialog);
    dialogLayer.hidden = false;
    surface.classList.add("has-profile-dialog");
    refreshIcons();
    dialogWindow.open(dialogLayer, {
      initialFocus: closeButton,
      modal: true,
      retain: true,
      onAfterClose: () => dialogLayer.replaceChildren()
    });
    return dialog;
  }

  function openEditor(mode, profile = null, focusTarget = "name") {
    closeMenu();
    let chosenAccent = profile?.accent || "mint";
    let chosenAvatar = profile?.avatar.kind === "image" ? profile.name.slice(0, 1).toUpperCase() : (profile?.avatar.value || "E");
    const nameInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", required: true, value: profile?.name || "", placeholder: "Nom du profil", autocomplete: "off" } });
    const descriptionInput = element("textarea", { className: "v8-input v8-profile-dialog__textarea", attributes: { maxlength: "180", rows: "3", placeholder: "Décrivez cet environnement" } }, profile?.description || "");
    const typeSelect = element("select", { className: "v8-input", attributes: { "aria-label": "Space principal" } }, Object.entries(TYPE_LABELS).map(([value, label]) => optionNode(value, label)));
    typeSelect.value = profile?.tone || "personal";
    const flowInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", value: profile?.flowLabel || "Essentiel", placeholder: "Flow principal" } });
    const avatarPicker = element("div", { className: "v8-profile-dialog__avatar-picker", attributes: { role: "radiogroup", "aria-label": "Avatar" } });
    const accentPicker = element("div", { className: "v8-profile-dialog__accent-picker", attributes: { role: "radiogroup", "aria-label": "Thème" } });

    AVATAR_CHOICES.forEach((choice) => {
      const button = element("button", { className: "v8-profile-dialog__avatar-choice", text: choice, attributes: { type: "button", role: "radio", "aria-checked": String(choice === chosenAvatar), "aria-label": `Avatar ${choice}`, tabindex: choice === chosenAvatar ? "0" : "-1" } });
      button.addEventListener("click", () => {
        chosenAvatar = choice;
        [...avatarPicker.children].forEach((node) => {
          node.setAttribute("aria-checked", String(node === button));
          node.tabIndex = node === button ? 0 : -1;
        });
      }, listenerOptions);
      avatarPicker.append(button);
    });

    Object.entries(ACCENT_LABELS).forEach(([accent, label]) => {
      const button = element("button", { className: "v8-profile-dialog__accent-choice", attributes: { type: "button", role: "radio", "aria-checked": String(accent === chosenAccent), "aria-label": label, tabindex: accent === chosenAccent ? "0" : "-1" }, dataset: { accent } }, [element("span"), element("small", { text: label })]);
      button.addEventListener("click", () => {
        chosenAccent = accent;
        [...accentPicker.children].forEach((node) => {
          node.setAttribute("aria-checked", String(node === button));
          node.tabIndex = node === button ? 0 : -1;
        });
      }, listenerOptions);
      accentPicker.append(button);
    });

    const cancel = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [element("span", { text: "Annuler" })]);
    const submit = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon(mode === "create" ? "plus" : "check"), element("span", { text: mode === "create" ? "Créer le profil" : "Enregistrer" })]);
    const form = element("form", { className: "v8-profile-dialog__form" }, [
      element("label", { className: "v8-field" }, [element("span", { className: "v8-field__label", text: "Nom" }), nameInput]),
      element("label", { className: "v8-field" }, [element("span", { className: "v8-field__label", text: "Description" }), descriptionInput]),
      element("div", { className: "v8-profile-dialog__row" }, [
        element("label", { className: "v8-field" }, [element("span", { className: "v8-field__label", text: "Space principal" }), typeSelect]),
        element("label", { className: "v8-field" }, [element("span", { className: "v8-field__label", text: "Flow principal" }), flowInput])
      ]),
      element("fieldset", { className: "v8-profile-dialog__fieldset" }, [element("legend", { text: "Avatar" }), avatarPicker]),
      element("fieldset", { className: "v8-profile-dialog__fieldset" }, [element("legend", { text: "Thème" }), accentPicker]),
      element("div", { className: "v8-profile-dialog__actions" }, [cancel, submit])
    ]);
    const dialog = dialogShell(
      mode === "create" ? "Créer un environnement" : `Modifier ${profile.name}`,
      mode === "create" ? "Définissez son identité. Le dashboard restera vide et prêt à être construit." : "Ajustez son identité sans toucher à ses données.",
      form,
      element("span")
    );
    cancel.addEventListener("click", () => closeDialog(), listenerOptions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.classList.add("is-loading");
      const payload = {
        name: nameInput.value,
        description: descriptionInput.value,
        type: typeSelect.value,
        space: typeSelect.value,
        flow: flowInput.value,
        avatar: chosenAvatar,
        accent: chosenAccent
      };
      const response = mode === "create" ? repository.createProfile(payload) : repository.updateProfile(profile.id, payload);
      if (!response.ok) {
        submit.disabled = false;
        submit.classList.remove("is-loading");
        status.textContent = response.message;
        return;
      }
      closeDialog({ restoreFocus: false });
      renderProfiles(response.data.id, true);
      status.textContent = response.message;
    }, listenerOptions);
    const target = focusTarget === "avatar" ? avatarPicker.querySelector('[aria-checked="true"]')
      : focusTarget === "space" ? typeSelect
        : focusTarget === "theme" ? accentPicker.querySelector('[aria-checked="true"]')
          : nameInput;
    queueMicrotask(() => target?.focus());
    return dialog;
  }

  function openDeleteConfirmation(profile) {
    closeMenu();
    const cancel = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [element("span", { text: "Annuler" })]);
    const confirm = element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" } }, [icon("trash-2"), element("span", { text: "Supprimer définitivement" })]);
    const content = element("div", { className: "v8-profile-dialog__confirm" }, [
      element("div", { className: "v8-profile-dialog__danger-icon" }, icon("triangle-alert")),
      element("p", { text: `Les données locales du profil ${profile.name} seront supprimées de cet appareil. Cette action est irréversible.` })
    ]);
    dialogShell("Supprimer ce profil ?", "Une confirmation est nécessaire avant toute suppression.", content, element("div", { className: "v8-profile-dialog__actions" }, [cancel, confirm]));
    cancel.addEventListener("click", () => closeDialog(), listenerOptions);
    confirm.addEventListener("click", () => {
      const response = repository.deleteProfile(profile.id);
      if (!response.ok) {
        status.textContent = response.message;
        closeDialog();
        return;
      }
      closeDialog({ restoreFocus: false });
      renderProfiles(repository.activeProfile()?.id || "", true);
      status.textContent = response.message;
    }, listenerOptions);
    queueMicrotask(() => cancel.focus());
  }

  function downloadExport(profile) {
    const response = repository.exportProfile(profile.id);
    if (!response.ok) {
      status.textContent = response.message;
      return;
    }
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = element("a", { attributes: { href: url, download: `ethone-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "profil"}.json` } });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    status.textContent = "Export du profil prêt.";
  }

  function runMenuAction(actionId) {
    const profile = profiles.find((entry) => entry.id === menuProfileId);
    if (!profile) return;
    if (actionId === "rename") openEditor("edit", profile, "name");
    else if (actionId === "edit") openEditor("edit", profile, "name");
    else if (actionId === "avatar") openEditor("edit", profile, "avatar");
    else if (actionId === "space") openEditor("edit", profile, "space");
    else if (actionId === "theme") openEditor("edit", profile, "theme");
    else if (actionId === "export") { closeMenu(); downloadExport(profile); }
    else if (actionId === "duplicate") {
      closeMenu();
      const response = repository.duplicateProfile(profile.id);
      if (response.ok) renderProfiles(response.data.id, true);
      status.textContent = response.message;
    } else if (actionId === "delete") openDeleteConfirmation(profile);
  }

  function waitForLaunch() {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
    return new Promise((resolve) => {
      launchTimer = globalThis.setTimeout(() => {
        launchTimer = 0;
        resolve();
      }, 220);
    });
  }

  async function activate(index = selectedIndex) {
    if (!profiles.length || destroyed) return;
    const token = ++activation;
    selectPreview(index);
    const profile = profiles[selectedIndex];
    if (profile.locked) {
      status.textContent = "Profil verrouillé : le déverrouillage sécurisé arrive bientôt. Vos données restent intactes.";
      return;
    }
    const selected = repository.selectProfile(profile.id);
    if (!selected.ok) {
      status.textContent = selected.message;
      return;
    }
    surface.classList.add("is-launching");
    surface.setAttribute("aria-busy", "true");
    enterButton.disabled = true;
    await waitForLaunch();
    if (destroyed || token !== activation) return;
    try {
      const activationResult = await options.onSelect?.(selected.data);
      if (!destroyed && token === activation) settleActivationResult(activationResult, { surface, enterButton, status });
    } catch {
      if (!destroyed && token === activation) settleActivationResult({ ok: false, message: "L'environnement n'a pas pu être ouvert." }, { surface, enterButton, status });
    }
  }

  list.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      selectPreview(nextProfileIndex(profiles.length, selectedIndex, event.key), true);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activate(selectedIndex);
    }
    if (event.key === " ") {
      event.preventDefault();
      selectPreview(selectedIndex, true);
    }
  }, listenerOptions);
  enterButton.addEventListener("click", () => activate(selectedIndex), listenerOptions);
  createButton.addEventListener("click", () => openEditor("create"), listenerOptions);
  emptyCreateButton.addEventListener("click", () => openEditor("create"), listenerOptions);
  menuButtons.forEach((button) => button.addEventListener("click", () => runMenuAction(button.dataset.profileAction), listenerOptions));
  signOut.addEventListener("click", async () => {
    signOut.classList.add("is-loading");
    signOut.disabled = true;
    const response = await options.onSignOut?.();
    if (!destroyed && response && !response.ok) {
      signOut.classList.remove("is-loading");
      signOut.disabled = false;
      status.textContent = response.message;
    }
  }, listenerOptions);
  dialogLayer.addEventListener("pointerdown", (event) => { if (event.target === dialogLayer) closeDialog(); }, listenerOptions);
  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !menuTrigger?.contains(event.target)) closeMenu();
  }, listenerOptions);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  }, listenerOptions);

  renderProfiles(repository.activeProfile()?.id || "");
  queueMicrotask(() => { if (!destroyed && profiles.length) cards[selectedIndex]?.focus(); });

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    activation += 1;
    if (launchTimer) globalThis.clearTimeout(launchTimer);
    launchTimer = 0;
    closeMenu();
    closeDialog({ restoreFocus: false });
    dialogWindow.destroy();
    abortController.abort();
    surface.remove();
    root.removeAttribute("data-entry-state");
    if (document.documentElement.dataset.entry === "profiles") delete document.documentElement.dataset.entry;
    return true;
  }

  return Object.freeze({
    destroy,
    focus: () => profiles.length && cards[selectedIndex]?.focus(),
    selectedId: () => profiles[selectedIndex]?.id || null
  });
}
