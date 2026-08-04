import { element, icon } from "./dom.mjs";
import { createWindowController } from "./window-system.mjs";
import { refreshIcons } from "./icons.mjs";

const SCRATCHPAD_KEY = "v8_scratchpad_v1";
const SAVE_DELAY_MS = 600;

function loadContent() {
  try { return globalThis.localStorage?.getItem(SCRATCHPAD_KEY) || ""; } catch { return ""; }
}

function saveContent(text) {
  try { globalThis.localStorage?.setItem(SCRATCHPAD_KEY, text); } catch { /* silent */ }
}

export function createScratchpad(host, options = {}) {
  let mounted = null;
  let saveTimer = 0;
  const windowController = createWindowController({ onEscape: () => close() });

  function close() {
    if (!mounted) return;
    clearTimeout(saveTimer);
    if (mounted.textarea) saveContent(mounted.textarea.value);
    windowController.close({});
    mounted.root.remove();
    mounted = null;
  }

  function open() {
    if (mounted) { close(); return; }

    const saved = loadContent();
    const charCount = element("span", { className: "v8-scratchpad__count", text: `${saved.length} car.` });
    let saveStatus = "saved";

    const statusDot = element("span", {
      className: "v8-scratchpad__status",
      attributes: { title: "Sauvegardé automatiquement", "aria-label": "Sauvegardé" }
    });

    const textarea = element("textarea", {
      className: "v8-scratchpad__area",
      attributes: {
        placeholder: "Zone de brouillon rapide — sauvegardée automatiquement…",
        "aria-label": "Scratchpad",
        spellcheck: "false",
        autocomplete: "off"
      }
    });
    textarea.value = saved;

    function scheduleSave() {
      clearTimeout(saveTimer);
      saveStatus = "pending";
      statusDot.dataset.status = "pending";
      statusDot.title = "En cours de sauvegarde…";
      charCount.textContent = `${textarea.value.length} car.`;
      saveTimer = setTimeout(() => {
        saveContent(textarea.value);
        saveStatus = "saved";
        statusDot.dataset.status = "saved";
        statusDot.title = "Sauvegardé automatiquement";
      }, SAVE_DELAY_MS);
    }

    textarea.addEventListener("input", scheduleSave);

    const clearBtn = element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": "Effacer le brouillon", title: "Effacer" }
    }, [icon("trash-2")]);

    clearBtn.addEventListener("click", () => {
      if (!textarea.value.trim() || globalThis.confirm?.("Effacer tout le contenu du brouillon ?")) {
        textarea.value = "";
        saveContent("");
        charCount.textContent = "0 car.";
      }
    });

    const copyBtn = element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": "Copier le contenu", title: "Copier" }
    }, [icon("copy")]);

    copyBtn.addEventListener("click", () => {
      try {
        navigator.clipboard?.writeText(textarea.value);
        options.onCopy?.("Brouillon copié dans le presse-papier.");
      } catch { /* silent */ }
    });

    const closeBtn = element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": "Fermer le brouillon" }
    }, [icon("x")]);
    closeBtn.addEventListener("click", close);

    statusDot.dataset.status = "saved";

    const root = element("aside", {
      className: "v8-scratchpad",
      attributes: { role: "dialog", "aria-label": "Brouillon rapide", "aria-modal": "false" }
    }, [
      element("header", { className: "v8-scratchpad__header" }, [
        element("div", { className: "v8-scratchpad__title" }, [
          icon("pencil"),
          element("span", { text: "Brouillon rapide" }),
          statusDot
        ]),
        element("div", { className: "v8-scratchpad__toolbar" }, [charCount, copyBtn, clearBtn, closeBtn])
      ]),
      textarea
    ]);

    host.append(root);
    mounted = { root, textarea };
    refreshIcons();
    windowController.open(root, { initialFocus: () => textarea, modal: false });
  }

  function destroy() {
    clearTimeout(saveTimer);
    if (mounted) {
      saveContent(mounted.textarea.value);
      mounted.root.remove();
      mounted = null;
    }
    windowController.destroy();
  }

  return Object.freeze({ open, close, destroy, isOpen: () => mounted !== null });
}
