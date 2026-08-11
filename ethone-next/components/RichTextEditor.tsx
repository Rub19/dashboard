"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE", "A", "PRE", "CODE"]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel"]),
};

function sanitizeHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return "";

  function walk(node: Node) {
    const children = Array.from(node.childNodes);
    children.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toUpperCase();
        if (!ALLOWED_TAGS.has(tag)) {
          const span = document.createElement("span");
          span.textContent = el.textContent || "";
          el.replaceWith(span);
          walk(span);
          return;
        }
        Array.from(el.attributes).forEach((attr) => {
          const allowed = ALLOWED_ATTRS[tag];
          if (!allowed?.has(attr.name)) el.removeAttribute(attr.name);
        });
        if (tag === "A") {
          const href = el.getAttribute("href") || "";
          if (!/^https?:\/\//.test(href) && !/^mailto:/.test(href)) {
            el.removeAttribute("href");
          } else {
            el.setAttribute("target", "_blank");
            el.setAttribute("rel", "noopener noreferrer");
          }
        }
      }
      walk(child);
    });
  }

  walk(root);
  return root.innerHTML;
}

const TOOLS = [
  { command: "bold", icon: "bold", label: "Gras" },
  { command: "italic", icon: "italic", label: "Italique" },
  { command: "underline", icon: "underline", label: "Souligné" },
  { command: "insertUnorderedList", icon: "list", label: "Liste" },
  { command: "insertOrderedList", icon: "list-ordered", label: "Liste numérotée" },
  { command: "justifyLeft", icon: "align-left", label: "Gauche" },
  { command: "justifyCenter", icon: "align-center", label: "Centre" },
  { command: "justifyRight", icon: "align-right", label: "Droite" },
];

const BLOCK_TOOLS = [
  { command: "formatBlock", value: "H2", icon: "heading-2", label: "Titre 2" },
  { command: "formatBlock", value: "H3", icon: "heading-3", label: "Titre 3" },
  { command: "formatBlock", value: "BLOCKQUOTE", icon: "quote", label: "Citation" },
];

export default function RichTextEditor({
  defaultValue = "",
  onChange,
  placeholder = "",
}: {
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!defaultValue);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== defaultValue) {
      ref.current.innerHTML = sanitizeHtml(defaultValue);
      setEmpty(!defaultValue);
    }
  }, [defaultValue]);

  function exec(cmd: string, value: string | undefined = undefined) {
    document.execCommand(cmd, false, value);
    if (ref.current) {
      const clean = sanitizeHtml(ref.current.innerHTML);
      ref.current.innerHTML = clean;
      onChange?.(clean);
      setEmpty(clean === "" || clean === "<br>");
    }
  }

  function handleInput() {
    if (ref.current) {
      const clean = sanitizeHtml(ref.current.innerHTML);
      if (ref.current.innerHTML !== clean) ref.current.innerHTML = clean;
      onChange?.(clean);
      setEmpty(clean === "" || clean === "<br>");
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const raw = event.clipboardData.getData("text/html") || event.clipboardData.getData("text/plain");
    const clean = sanitizeHtml(raw);
    document.execCommand("insertHTML", false, clean);
  }

  function insertLink() {
    const url = window.prompt("URL du lien");
    if (url) {
      if (!/^https?:\/\//.test(url) && !/^mailto:/.test(url)) return;
      exec("createLink", url);
    }
  }

  return (
    <div className="v8-rich-text space-y-2">
      <div
        className="v8-rich-text__toolbar flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1"
        role="toolbar"
        aria-label="Formatage du texte"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.command}
            type="button"
            onClick={() => exec(tool.command)}
            title={tool.label}
            className="v8-rich-text__btn rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label={tool.label}
            data-rich-command={tool.command}
          >
            <Icon name={tool.icon} className="h-4 w-4" />
          </button>
        ))}
        <div className="mx-1 w-px bg-[var(--border)]" />
        {BLOCK_TOOLS.map((tool) => (
          <button
            key={tool.value}
            type="button"
            onClick={() => exec(tool.command, tool.value)}
            title={tool.label}
            className="v8-rich-text__btn rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label={tool.label}
            data-rich-command={tool.command}
          >
            <Icon name={tool.icon} className="h-4 w-4" />
          </button>
        ))}
        <div className="mx-1 w-px bg-[var(--border)]" />
        <button
          type="button"
          onClick={insertLink}
          title="Lien"
          className="v8-rich-text__btn rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          aria-label="Lien"
          data-rich-command="createLink"
        >
          <Icon name="link" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("unlink")}
          title="Supprimer le lien"
          className="v8-rich-text__btn rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          aria-label="Supprimer le lien"
          data-rich-command="unlink"
        >
          <Icon name="unlink" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("removeFormat")}
          title="Effacer le format"
          className="v8-rich-text__btn rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          aria-label="Effacer le format"
          data-rich-command="removeFormat"
        >
          <Icon name="remove-formatting" className="h-4 w-4" />
        </button>
      </div>
      <div
        className="v8-rich-text__body relative min-h-[6rem] w-full cursor-text rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus-within:border-[var(--accent)]"
        onClick={() => ref.current?.focus()}
      >
        {empty && placeholder && (
          <span
            className="pointer-events-none absolute left-3 top-2 text-sm text-[var(--muted)]"
            data-placeholder={placeholder}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label="Éditeur de texte riche"
          onInput={handleInput}
          onPaste={handlePaste}
          className={`min-h-[5rem] w-full whitespace-pre-wrap outline-none ${empty ? "is-empty" : ""}`}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}
