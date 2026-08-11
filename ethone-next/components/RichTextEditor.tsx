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

const INLINE_TOOLS = [
  { command: "bold", icon: "bold", label: "Gras" },
  { command: "italic", icon: "italic", label: "Italique" },
  { command: "underline", icon: "underline", label: "Souligné" },
  { command: "strikeThrough", icon: "strikethrough", label: "Barré" },
  { command: "insertCode", icon: "code", label: "Code", custom: true },
];

const ALIGN_TOOLS = [
  { command: "justifyLeft", icon: "align-left", label: "Gauche" },
  { command: "justifyCenter", icon: "align-center", label: "Centre" },
  { command: "justifyRight", icon: "align-right", label: "Droite" },
];

const LIST_TOOLS = [
  { command: "insertUnorderedList", icon: "list", label: "Liste" },
  { command: "insertOrderedList", icon: "list-ordered", label: "Liste numérotée" },
];

const BLOCK_TOOLS = [
  { command: "formatBlock", value: "P", icon: "text", label: "Paragraphe" },
  { command: "formatBlock", value: "H2", icon: "heading-2", label: "Titre 2" },
  { command: "formatBlock", value: "H3", icon: "heading-3", label: "Titre 3" },
  { command: "formatBlock", value: "BLOCKQUOTE", icon: "quote", label: "Citation" },
  { command: "formatBlock", value: "PRE", icon: "code", label: "Code" },
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
  const [format, setFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    block: "P",
    justify: "left",
    list: false,
    orderedList: false,
  });

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== defaultValue) {
      ref.current.innerHTML = sanitizeHtml(defaultValue);
      setEmpty(!defaultValue);
    }
  }, [defaultValue]);

  function updateFormat() {
    if (!ref.current) return;
    let block = "P";
    try {
      const val = document.queryCommandValue("formatBlock");
      if (typeof val === "string" && /h2|h3|blockquote|pre/i.test(val)) {
        block = val.toUpperCase().replace(/[<>]/g, "");
      }
    } catch { /* ignore */ }
    setFormat({
      bold: !!document.queryCommandState("bold"),
      italic: !!document.queryCommandState("italic"),
      underline: !!document.queryCommandState("underline"),
      strikeThrough: !!document.queryCommandState("strikeThrough"),
      block,
      justify: (document.queryCommandValue("justify") as string) || "left",
      list: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
    });
  }

  function exec(cmd: string, value: string | undefined = undefined) {
    if (cmd === "insertCode") {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const text = selection.toString();
        document.execCommand("insertHTML", false, `<code class="rounded bg-[var(--surface-raised)] px-1 py-0.5 font-mono text-xs">${escapeHtml(text)}</code>`);
      }
    } else {
      document.execCommand(cmd, false, value);
    }
    if (ref.current) {
      const clean = sanitizeHtml(ref.current.innerHTML);
      ref.current.innerHTML = clean;
      onChange?.(clean);
      setEmpty(clean === "" || clean === "<br>");
      requestAnimationFrame(updateFormat);
    }
  }

  function handleInput() {
    if (ref.current) {
      const clean = sanitizeHtml(ref.current.innerHTML);
      if (ref.current.innerHTML !== clean) ref.current.innerHTML = clean;
      onChange?.(clean);
      setEmpty(clean === "" || clean === "<br>");
      updateFormat();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const raw = event.clipboardData.getData("text/html") || event.clipboardData.getData("text/plain");
    const clean = sanitizeHtml(raw);
    document.execCommand("insertHTML", false, clean);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      const key = event.key.toLowerCase();
      if (key === "b") { event.preventDefault(); exec("bold"); }
      if (key === "i") { event.preventDefault(); exec("italic"); }
      if (key === "u") { event.preventDefault(); exec("underline"); }
      if (key === "k") { event.preventDefault(); insertLink(); }
    }
  }

  function insertLink() {
    const url = window.prompt("URL du lien");
    if (url) {
      if (!/^https?:\/\//.test(url) && !/^mailto:/.test(url)) return;
      exec("createLink", url);
    }
  }

  function clearFormatting() {
    exec("removeFormat");
    exec("formatBlock", "P");
  }

  return (
    <div className="v8-rich-text space-y-2">
      <div
        className="v8-rich-text__toolbar flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1"
        role="toolbar"
        aria-label="Formatage du texte"
        onMouseDown={(e) => e.preventDefault()}
      >
        {INLINE_TOOLS.map((tool) => (
          <ToolbarButton
            key={tool.command}
            active={format[tool.command as keyof typeof format] as boolean}
            onClick={() => exec(tool.command, undefined)}
            label={tool.label}
            icon={tool.icon}
            data-rich-command={tool.command}
          />
        ))}
        <div className="mx-1 w-px self-stretch bg-[var(--border)]" />
        {ALIGN_TOOLS.map((tool) => (
          <ToolbarButton
            key={tool.command}
            active={format.justify === tool.command.replace("justify", "").toLowerCase()}
            onClick={() => exec(tool.command, undefined)}
            label={tool.label}
            icon={tool.icon}
            data-rich-command={tool.command}
          />
        ))}
        <div className="mx-1 w-px self-stretch bg-[var(--border)]" />
        {LIST_TOOLS.map((tool) => (
          <ToolbarButton
            key={tool.command}
            active={tool.command === "insertUnorderedList" ? format.list : format.orderedList}
            onClick={() => exec(tool.command, undefined)}
            label={tool.label}
            icon={tool.icon}
            data-rich-command={tool.command}
          />
        ))}
        <div className="mx-1 w-px self-stretch bg-[var(--border)]" />
        <select
          aria-label="Style de bloc"
          value={format.block}
          onChange={(e) => exec("formatBlock", e.target.value)}
          className="rounded-md border-0 bg-transparent px-2 py-1.5 text-xs text-[var(--foreground)] outline-none hover:bg-[var(--surface)]"
        >
          {BLOCK_TOOLS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div className="mx-1 w-px self-stretch bg-[var(--border)]" />
        <ToolbarButton active={false} onClick={insertLink} label="Lien" icon="link" data-rich-command="createLink" />
        <ToolbarButton active={false} onClick={() => exec("unlink")} label="Supprimer le lien" icon="unlink" data-rich-command="unlink" />
        <ToolbarButton active={false} onClick={clearFormatting} label="Effacer le format" icon="remove-formatting" data-rich-command="removeFormat" />
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
          onKeyDown={handleKeyDown}
          onKeyUp={updateFormat}
          onMouseUp={updateFormat}
          className={`min-h-[5rem] w-full whitespace-pre-wrap outline-none ${empty ? "is-empty" : ""}`}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  icon,
  "data-rich-command": command,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  "data-rich-command"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      data-rich-active={active}
      data-rich-command={command}
      className={`v8-rich-text__btn rounded-md p-1.5 transition-colors ${
        active
          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      }`}
      aria-label={label}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
