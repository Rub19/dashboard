import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";

const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "A"]);
const ALLOWED_ATTRS = Object.freeze({ A: new Set(["href", "target", "rel"]) });
const STRIP_ENTIRELY = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "FORM", "INPUT", "BUTTON", "LINK", "META", "BASE", "IMG", "VIDEO", "AUDIO", "SOURCE", "NOSCRIPT"]);

function safeHref(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://ethone.invalid/");
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return "";
    return raw;
  } catch {
    return "";
  }
}

function sanitizeChildren(node) {
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
    if (STRIP_ENTIRELY.has(tag)) {
      child.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      sanitizeChildren(child);
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      child.remove();
      return;
    }
    const allowedAttrs = ALLOWED_ATTRS[tag];
    [...child.attributes].forEach((attr) => {
      if (!allowedAttrs || !allowedAttrs.has(attr.name.toLowerCase())) child.removeAttribute(attr.name);
    });
    if (tag === "A") {
      const safe = safeHref(child.getAttribute("href"));
      if (safe) {
        child.setAttribute("href", safe);
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      } else {
        child.removeAttribute("href");
      }
    }
    sanitizeChildren(child);
  });
}

export function sanitizeRichText(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  sanitizeChildren(doc.body);
  return doc.body.innerHTML;
}

export function stripHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function plainTextToHtml(text) {
  const container = document.createElement("div");
  const paragraphs = String(text || "").split(/\n{2,}/);
  paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    const lines = paragraph.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) p.append(document.createElement("br"));
      p.append(document.createTextNode(line));
    });
    container.append(p);
  });
  return container.innerHTML;
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

export function toEditableHtml(content) {
  const raw = String(content || "");
  if (!raw) return "";
  return sanitizeRichText(looksLikeHtml(raw) ? raw : plainTextToHtml(raw));
}

const TOOLBAR_COMMANDS = Object.freeze([
  { command: "bold", icon: "bold", label: "Gras" },
  { command: "italic", icon: "italic", label: "Italique" },
  { command: "underline", icon: "underline", label: "Souligné" },
  { command: "formatBlock:H2", icon: "heading-2", label: "Titre" },
  { command: "formatBlock:H3", icon: "heading-3", label: "Sous-titre" },
  { command: "insertUnorderedList", icon: "list", label: "Liste à puces" },
  { command: "insertOrderedList", icon: "list-ordered", label: "Liste numérotée" },
  { command: "createLink", icon: "link-2", label: "Lien" },
  { command: "removeFormat", icon: "eraser", label: "Effacer la mise en forme" }
]);

export function createRichTextEditor(options = {}) {
  const onInput = typeof options.onInput === "function" ? options.onInput : () => {};
  const buttonNodes = new Map();

  const body = element("div", {
    className: "v8-rich-text__body",
    attributes: {
      contenteditable: "true",
      role: "textbox",
      "aria-multiline": "true",
      "aria-label": options.ariaLabel || "Contenu",
      "data-placeholder": options.placeholder || ""
    }
  });

  const toolbar = element("div", { className: "v8-rich-text__toolbar", attributes: { role: "toolbar", "aria-label": "Mise en forme" } },
    TOOLBAR_COMMANDS.map((entry) => {
      const button = element("button", {
        className: "v8-rich-text__btn",
        attributes: { type: "button", "aria-label": entry.label, "data-tooltip": entry.label, "aria-pressed": "false" },
        dataset: { richCommand: entry.command }
      }, [icon(entry.icon)]);
      buttonNodes.set(entry.command, button);
      return button;
    }));

  function formatBlockTag(command) {
    return command.split(":")[1];
  }

  function isBlockActive(tag) {
    const current = document.queryCommandValue("formatBlock") || "";
    return current.toLowerCase() === tag.toLowerCase();
  }

  function runCommand(command) {
    body.focus();
    if (command === "createLink") {
      const url = globalThis.prompt?.("Adresse du lien", "https://");
      if (url == null) return;
      const safe = safeHref(url);
      if (!safe) return;
      document.execCommand("createLink", false, safe);
      return;
    }
    if (command.startsWith("formatBlock:")) {
      const tag = formatBlockTag(command);
      document.execCommand("formatBlock", false, isBlockActive(tag) ? "<p>" : `<${tag.toLowerCase()}>`);
      return;
    }
    document.execCommand(command);
  }

  function updateToolbarState() {
    buttonNodes.forEach((button, command) => {
      if (command === "createLink" || command === "removeFormat") return;
      let active = false;
      if (command.startsWith("formatBlock:")) active = isBlockActive(formatBlockTag(command));
      else { try { active = document.queryCommandState(command); } catch { active = false; } }
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function handleToolbarMousedown(event) {
    event.preventDefault();
  }

  function handleToolbarClick(event) {
    const button = event.target.closest("[data-rich-command]");
    if (!button) return;
    runCommand(button.dataset.richCommand);
    updateToolbarState();
    onInput();
  }

  function markEmptyState() {
    body.classList.toggle("is-empty", !body.textContent.trim());
  }

  function handleInput() {
    markEmptyState();
    updateToolbarState();
    onInput();
  }

  function handleSelectionChange() {
    if (document.activeElement !== body) return;
    updateToolbarState();
  }

  toolbar.addEventListener("mousedown", handleToolbarMousedown);
  toolbar.addEventListener("click", handleToolbarClick);
  body.addEventListener("input", handleInput);
  body.addEventListener("keyup", updateToolbarState);
  body.addEventListener("mouseup", updateToolbarState);
  document.addEventListener("selectionchange", handleSelectionChange);

  function setHTML(html) {
    body.innerHTML = html || "";
    markEmptyState();
  }

  function getHTML() {
    return sanitizeRichText(body.innerHTML);
  }

  function destroy() {
    document.removeEventListener("selectionchange", handleSelectionChange);
    toolbar.removeEventListener("mousedown", handleToolbarMousedown);
    toolbar.removeEventListener("click", handleToolbarClick);
    body.removeEventListener("input", handleInput);
    body.removeEventListener("keyup", updateToolbarState);
    body.removeEventListener("mouseup", updateToolbarState);
  }

  const root = element("div", { className: "v8-rich-text" }, [toolbar, body]);
  refreshIcons();

  return Object.freeze({
    element: root,
    body,
    toolbar,
    setHTML,
    getHTML,
    focus: (opts) => body.focus(opts),
    destroy
  });
}
