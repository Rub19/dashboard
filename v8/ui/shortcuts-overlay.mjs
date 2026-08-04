import { element, icon, actionButton } from "./dom.mjs";
import { createWindowController } from "./window-system.mjs";
import { refreshIcons } from "./icons.mjs";

const GROUPS = Object.freeze([
  {
    label: "Navigation",
    icon: "navigation",
    shortcuts: [
      { keys: ["1", "…", "9"], label: "Aller à la page correspondante (Accueil→Fichiers)" },
      { keys: ["Ctrl", "K"], label: "Ouvrir le Command Center" },
      { keys: ["/"], label: "Ouvrir le Command Center (alternative)" },
      { keys: ["F2"], label: "Ouvrir Mission Control" },
      { keys: ["?"], label: "Ouvrir Mission Control (alternative)" },
      { keys: ["Ctrl", "Shift", "M"], label: "Basculer Mission Control" },
      { keys: ["Escape"], label: "Fermer panneau / dialog ouvert" }
    ]
  },
  {
    label: "Création rapide",
    icon: "plus-circle",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "N"], label: "Nouvelle note" },
      { keys: ["Ctrl", "Shift", "T"], label: "Nouvelle tâche" },
      { keys: ["Ctrl", "Shift", "E"], label: "Nouvel événement calendrier" },
      { keys: ["Ctrl", "Shift", "S"], label: "Ouvrir/fermer le Brouillon rapide" }
    ]
  },
  {
    label: "Interface & Affichage",
    icon: "layout-dashboard",
    shortcuts: [
      { keys: ["Alt", "Z"], label: "Basculer le Mode Zen (masque l'en-tête et le Dock)" },
      { keys: ["Ctrl", "S"], label: "Synchronisation manuelle Cloud" },
      { keys: ["PageDown"], label: "Défiler vers le bas" },
      { keys: ["PageUp"], label: "Défiler vers le haut" },
      { keys: ["Home"], label: "Aller en haut de la page" },
      { keys: ["End"], label: "Aller en bas de la page" }
    ]
  },
  {
    label: "Panneaux & overlays",
    icon: "panels-right-bottom",
    shortcuts: [
      { keys: ["Ctrl", "/"], label: "Raccourcis clavier (cette fenêtre)" },
      { keys: ["Clic", "sur avatar"], label: "Ouvrir le panneau Profil / Comptes" },
      { keys: ["Clic", "sur 🔔"], label: "Ouvrir le panneau Notifications" },
      { keys: ["Clic", "sur 📦"], label: "Ouvrir le panneau Widgets" }
    ]
  }
]);

function shortcutKey(text) {
  return element("kbd", { className: "v8-shortcut-key", text });
}

function shortcutRow(shortcut) {
  const keysEl = element("span", { className: "v8-shortcut-keys" });
  shortcut.keys.forEach((k, i) => {
    keysEl.append(shortcutKey(k));
    if (i < shortcut.keys.length - 1) {
      keysEl.append(element("span", { className: "v8-shortcut-sep", text: "+", attributes: { "aria-hidden": "true" } }));
    }
  });
  return element("div", { className: "v8-shortcut-row" }, [
    keysEl,
    element("span", { className: "v8-shortcut-label", text: shortcut.label })
  ]);
}

function shortcutGroup(group) {
  const rows = element("div", { className: "v8-shortcut-group__rows" });
  group.shortcuts.forEach((s) => rows.append(shortcutRow(s)));
  return element("div", { className: "v8-shortcut-group" }, [
    element("header", { className: "v8-shortcut-group__header" }, [
      icon(group.icon),
      element("strong", { text: group.label })
    ]),
    rows
  ]);
}

export function createShortcutsOverlay(host) {
  let mounted = null;
  const windowController = createWindowController({ onEscape: () => close() });

  function close() {
    if (!mounted) return;
    windowController.close({});
    mounted.remove();
    mounted = null;
  }

  function open() {
    if (mounted) { close(); return; }

    const closeBtn = element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": "Fermer les raccourcis" }
    }, [icon("x")]);
    closeBtn.addEventListener("click", close);

    const grid = element("div", { className: "v8-shortcuts-grid" });
    GROUPS.forEach((g) => grid.append(shortcutGroup(g)));

    const root = element("aside", {
      className: "v8-shortcuts-overlay",
      attributes: { role: "dialog", "aria-label": "Raccourcis clavier ETHONE", "aria-modal": "true" }
    }, [
      element("header", { className: "v8-shortcuts-overlay__header" }, [
        element("div", { className: "v8-shortcuts-overlay__title" }, [
          icon("keyboard"),
          element("strong", { text: "Raccourcis clavier" }),
          element("span", { className: "v8-eyebrow", text: "ETHONE" })
        ]),
        closeBtn
      ]),
      element("div", { className: "v8-shortcuts-overlay__body" }, [grid]),
      element("footer", { className: "v8-shortcuts-overlay__footer" }, [
        element("span", { text: "Ctrl+/" }),
        element("span", { text: "pour ouvrir / fermer cette vue" })
      ])
    ]);

    host.append(root);
    mounted = root;
    refreshIcons();
    windowController.open(root, { initialFocus: () => closeBtn, modal: true });
  }

  function destroy() {
    if (mounted) { mounted.remove(); mounted = null; }
    windowController.destroy();
  }

  return Object.freeze({ open, close, destroy, isOpen: () => mounted !== null });
}
