import { searchCommands } from "./search.mjs";
import { commandById } from "./catalog.mjs";
import { workspaceById } from "../data/workspaces.mjs";
import { debounce, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons, scheduleIconRefresh } from "../ui/icons.mjs";
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
  settings: "Réglages"
});

export function commandHudIntent(e={}, i=0, n=0) { const k=e.key||"", m=e.ctrlKey||e.metaKey; if (m && k.toLowerCase()==="k") return {type:"close"}; if (m && k.toLowerCase()==="p") return {type:"pin"}; if (k==="Enter") return {type:"execute"}; if (k==="Home" || k==="End") return {type:"select",index:k==="Home"?0:Math.max(0,n-1)}; const d=k==="ArrowDown" || (k==="Tab" && !e.shiftKey) ? 1 : k==="ArrowUp" || (k==="Tab" && e.shiftKey) ? -1 : k==="PageDown" ? 5 : k==="PageUp" ? -5 : 0; return d ? {type:"select",index:n>0?(((i+d)%n)+n)%n:0} : null; }

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
  const shell = host?.closest?.(".v8-shell") || null;
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
    const selected = rows[selectedIndex] || null;
    if (selected) input?.setAttribute("aria-activedescendant", selected.id);
    else input?.removeAttribute("aria-activedescendant");
    selected?.scrollIntoView({ block: "nearest" });
  }

  function renderResults(preferred){
    if (!resultsNode || !input) return;
    const pinned=history?.pinned?.()||[];
    const recent=history?.recent?.()||[];
    const additionalCommands = options.additionalCommands?.(context) || [];
    results = searchCommands(input.value, { ...context, pinned, recent, additionalCommands }, 10);
    selectedIndex=preferred?Math.max(0,results.findIndex(({id})=>id===preferred)):Math.min(Math.max(0,selectedIndex),Math.max(0,results.length-1));
    resultsNode.replaceChildren();

    resultsNode.append(element("div", { className: "v8-command-section-label" }, [
      element("span", { text: input.value.trim() ? "Résultats" : (pinned.length ? "Accès rapide" : `Suggestions pour ${context.flow}`) }),
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
        kind: "no-results",
        iconName: "search-x",
        eyebrow: "Recherche universelle",
        title: "Aucun résultat",
        description: "Essayez une page, une action, un Space ou un réglage.",
        actions: [clearSearch],
        compact: true
      }));
      scheduleIconRefresh();
      return;
    }

    results.forEach((command, index) => {
      const isPinned = pinned.includes(command.id);
      const result = element("button", {
        id: `v8-command-result-${index}`,
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
        element("span", { className: "v8-command-result__category", text: command.category, dataset: { category: command.category } })
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
            renderResults(command.id);
          }
        }
      }, [icon(isPinned ? "pin-off" : "pin")]);
      resultsNode.append(element("div", { className: "v8-command-row" }, [result, pin]));
    });
    scheduleIconRefresh();
  }

  const debouncedRenderResults = debounce(() => renderResults(), 120);
  function handleInput() {
    selectedIndex = 0;
    debouncedRenderResults();
  }

  function handleKeydown(event) {
    const intent = commandHudIntent(event, selectedIndex, results.length);
    if (!intent) return;
    event.preventDefault();
    event.stopPropagation();
    if (intent.type === "select") {
      selectedIndex = intent.index;
      updateSelection();
    } else if (intent.type === "execute") {
      execute(selectedCommand());
    } else if (intent.type === "pin") {
      const selected = selectedCommand();
      if (selected) history?.togglePin(selected.id);
      renderResults(selected?.id);
      input?.focus({ preventScroll: true });
    } else if (intent.type === "close") {
      onClose();
    }
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
        placeholder: "Rechercher ou executer une commande...",
        autocomplete: "off",
        spellcheck: "false",
        role: "combobox",
        "aria-expanded": "true",
        "aria-controls": "v8-command-results",
        "aria-autocomplete": "list",
        "aria-activedescendant": "v8-command-result-0",
        "aria-keyshortcuts": "Control+K Meta+K"
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
      element("span", {}, [icon("layers-3"), workspaceById(context.space).label]),
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
        element("h2", { id: "v8-command-title", className: "v8-visually-hidden", text: "ETHONE Command HUD" }),
        input,
        element("kbd", { text: "ESC", attributes: { translate: "no" } })
      ]),
      contextBar,
      resultsNode,
      element("footer", { className: "v8-command-footer" }, [
        element("span", {}, [element("kbd", { text: "Up/Down", attributes: { translate: "no" } }), " Naviguer"]),
        element("span", {}, [element("kbd", { text: "Tab", attributes: { translate: "no" } }), " Naviguer"]),
        element("span", {}, [element("kbd", { text: "Enter", attributes: { translate: "no" } }), " Ouvrir"]),
        element("span", {}, [element("kbd", { text: "Ctrl P", attributes: { translate: "no" } }), " Favori"]),
        element("span", { className: "v8-command-footer__brand" }, [icon("command"), " ETHONE Command HUD"])
      ])
    ]);
    layer = element("div", { className: "v8-command-layer" }, [dialog]);
    host.append(layer);
    renderResults();
    refreshIcons();
    const opened = windowController.open(layer, {
      initialFocus: input,
      modal: true,
      onAfterClose: () => shell?.classList.remove("is-command-hud-open")
    });
    if (opened) shell?.classList.add("is-command-hud-open");
    return opened;
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
      shell?.classList.remove("is-command-hud-open");
      windowController.destroy();
    },
    isOpen: () => windowController.isOpen(),
    selected: () => selectedCommand()?.id || null,
    command: commandById
  });
}
