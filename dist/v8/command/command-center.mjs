import { searchCommands } from "./search.mjs";
import { commandById } from "./catalog.mjs";
import { element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createWindowController } from "../ui/window-system.mjs";

const ROUTE_LABELS = Object.freeze({
  home: "Accueil",
  notes: "Notes",
  tasks: "Taches",
  calendar: "Calendrier",
  files: "Fichiers",
  activity: "Activity Hub",
  connections: "Connections",
  spaces: "Spaces",
  flows: "Flows",
  brain: "Brain",
  settings: "Reglages"
});

const SPACE_LABELS = Object.freeze({ personal: "Personnel", focus: "Focus", studio: "Studio" });

export function createCommandCenter(host, options = {}) {
  const history = options.history;
  const onExecute = typeof options.onExecute === "function" ? options.onExecute : () => {};
  const onClose = typeof options.onClose === "function" ? options.onClose : () => {};
  let layer = null;
  let input = null;
  let resultsNode = null;
  let results = [];
  let selectedIndex = 0;
  let context = { route: "home", space: "personal", flow: "Essentiel" };
  const windowController = createWindowController({ onEscape: onClose });

  function selectedCommand() {
    return results[selectedIndex] || null;
  }

  function execute(command) {
    if (!command) return;
    history?.record(command.id);
    onExecute(command);
    onClose();
  }

  function updateSelection() {
    const rows = resultsNode?.querySelectorAll(".v8-command-result") || [];
    rows.forEach((row, index) => {
      const selected = index === selectedIndex;
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-selected", selected ? "true" : "false");
    });
    rows[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }

  function renderResults() {
    if (!resultsNode || !input) return;
    const pinned = history?.pinned?.() || [];
    const recent = history?.recent?.() || [];
    const additionalCommands = options.additionalCommands?.(context) || [];
    results = searchCommands(input.value, { ...context, pinned, recent, additionalCommands }, 10);
    selectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, results.length - 1));
    resultsNode.replaceChildren();

    resultsNode.append(element("div", { className: "v8-command-section-label" }, [
      element("span", { text: input.value.trim() ? "Resultats" : (pinned.length ? "Acces rapide" : `Suggestions pour ${context.flow}`) }),
      element("span", { text: `${results.length} commande${results.length > 1 ? "s" : ""}` })
    ]));

    if (!results.length) {
      const clearSearch = element("button", {
        className: "v8-button v8-button--primary",
        text: "Effacer la recherche",
        attributes: { type: "button" },
        events: {
          click: () => {
            input.value = "";
            selectedIndex = 0;
            renderResults();
            input.focus({ preventScroll: true });
          }
        }
      });
      resultsNode.append(emptyState({
        iconName: "search-x",
        eyebrow: "Recherche universelle",
        title: "Aucun résultat",
        description: "Essayez une page, une action, un Space ou un réglage.",
        actions: [clearSearch],
        compact: true
      }));
      refreshIcons();
      return;
    }

    results.forEach((command, index) => {
      const isPinned = pinned.includes(command.id);
      const result = element("button", {
        className: `v8-command-result${index === selectedIndex ? " is-selected" : ""}`,
        attributes: {
          type: "button",
          role: "option",
          "aria-selected": index === selectedIndex ? "true" : "false"
        },
        dataset: { commandId: command.id },
        events: {
          mouseenter: () => {
            selectedIndex = index;
            updateSelection();
          },
          click: () => execute(command)
        }
      }, [
        element("span", { className: "v8-command-result__icon" }, [icon(command.icon)]),
        element("span", { className: "v8-command-result__copy" }, [
          element("strong", { text: command.label }),
          element("small", { text: command.subtitle })
        ]),
        element("span", { className: "v8-command-result__category", text: command.category })
      ]);
      const pin = element("button", {
        className: `v8-command-pin${isPinned ? " is-pinned" : ""}`,
        attributes: {
          type: "button",
          "aria-label": isPinned ? `Retirer ${command.label} des favoris` : `Epingler ${command.label}`,
          "aria-pressed": isPinned ? "true" : "false"
        },
        events: {
          click: (event) => {
            event.stopPropagation();
            history?.togglePin(command.id);
            renderResults();
          }
        }
      }, [icon(isPinned ? "pin-off" : "pin")]);
      resultsNode.append(element("div", { className: "v8-command-row" }, [result, pin]));
    });
    refreshIcons();
  }

  function handleInput() {
    selectedIndex = 0;
    renderResults();
  }

  function handleKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(results.length - 1, selectedIndex + 1);
      updateSelection();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      updateSelection();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      execute(selectedCommand());
      return;
    }
  }

  function handleLayerClick(event) {
    if (event.target === layer) onClose();
  }

  function open(currentContext = {}) {
    if (layer) {
      input?.focus({ preventScroll: true });
      return false;
    }
    context = { route: "home", space: "personal", flow: "Essentiel", ...currentContext };
    input = element("input", {
      id: "v8-command-input",
      className: "v8-command-input",
      attributes: {
        type: "search",
        placeholder: "Rechercher une page, un Space ou lancer une action...",
        autocomplete: "off",
        spellcheck: "false",
        role: "combobox",
        "aria-expanded": "true",
        "aria-controls": "v8-command-results",
        "aria-autocomplete": "list"
      },
      events: { input: handleInput, keydown: handleKeydown }
    });
    resultsNode = element("div", {
      id: "v8-command-results",
      className: "v8-command-results",
      attributes: { role: "listbox", "aria-label": "Commandes" }
    });
    const contextBar = element("div", { className: "v8-command-context" }, [
      element("span", {}, [icon("map-pin"), ROUTE_LABELS[context.route] || context.route]),
      element("span", {}, [icon("layers-3"), SPACE_LABELS[context.space] || "Personnel"]),
      element("span", {}, [icon("workflow"), context.flow]),
      element("span", { className: "v8-command-context__brain" }, [icon("brain"), "Contexte actif"])
    ]);
    const dialog = element("section", {
      className: "v8-command-dialog",
      attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-command-title" }
    }, [
      element("header", { className: "v8-command-search" }, [
        element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
        icon("search"),
        element("h2", { id: "v8-command-title", className: "v8-visually-hidden", text: "ETHONE Command Center" }),
        input,
        element("kbd", { text: "ESC" })
      ]),
      contextBar,
      resultsNode,
      element("footer", { className: "v8-command-footer" }, [
        element("span", {}, [element("kbd", { text: "Up/Down" }), " Naviguer"]),
        element("span", {}, [element("kbd", { text: "Enter" }), " Ouvrir"]),
        element("span", { className: "v8-command-footer__brand" }, [icon("command"), " ETHONE Command Center"])
      ])
    ]);
    layer = element("div", { className: "v8-command-layer", events: { click: handleLayerClick } }, [dialog]);
    host.append(layer);
    renderResults();
    refreshIcons();
    return windowController.open(layer, { initialFocus: input, modal: true });
  }

  function close() {
    if (!layer) return false;
    layer = null;
    input = null;
    resultsNode = null;
    results = [];
    return windowController.close();
  }

  return Object.freeze({
    open,
    close,
    destroy: () => {
      layer = null;
      input = null;
      resultsNode = null;
      results = [];
      windowController.destroy();
    },
    isOpen: () => windowController.isOpen(),
    selected: () => selectedCommand()?.id || null,
    command: commandById
  });
}
