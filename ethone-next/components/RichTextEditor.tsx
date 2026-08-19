"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/lib/icons";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "BLOCKQUOTE",
  "A",
  "PRE",
  "CODE",
  "IMG",
]);
const STRIP_ENTIRELY = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "FORM",
  "INPUT",
  "BUTTON",
  "LINK",
  "META",
  "BASE",
  "NOSCRIPT",
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel"]),
  CODE: new Set(["class"]),
  IMG: new Set(["src", "alt", "class"]),
};

function safeHref(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://ethone.invalid/");
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return raw;
  } catch {
    return "";
  }
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*/i.test(String(value || ""));
}

function plainTextToHtml(text: string): string {
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

function toEditableHtml(content: string): string {
  const raw = String(content || "");
  if (!raw) return "";
  return sanitizeRichText(looksLikeHtml(raw) ? raw : plainTextToHtml(raw));
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function sanitizeRichText(html: string): string {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  sanitizeChildren(doc.body);
  return doc.body.innerHTML;
}

function sanitizeChildren(node: Node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      return;
    }
    if (child.nodeType === Node.TEXT_NODE) return;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      return;
    }
    const el = child as Element;
    const tag = el.tagName.toUpperCase();
    if (STRIP_ENTIRELY.has(tag)) {
      el.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      sanitizeChildren(el);
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      el.remove();
      return;
    }
    const allowed = ALLOWED_ATTRS[tag];
    Array.from(el.attributes).forEach((attr) => {
      if (!allowed?.has(attr.name)) el.removeAttribute(attr.name);
    });
    if (tag === "A") {
      const safe = safeHref(el.getAttribute("href") || "");
      if (safe) {
        el.setAttribute("href", safe);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      } else {
        el.removeAttribute("href");
      }
    }
    if (tag === "IMG") {
      const safe = safeHref(el.getAttribute("src") || "");
      if (safe) {
        el.setAttribute("src", safe);
        el.classList.add("rounded", "max-w-full");
      } else {
        el.remove();
        return;
      }
    }
    sanitizeChildren(el);
  });
}

function sanitizeHtml(html: string): string {
  return toEditableHtml(html);
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
  { command: "formatBlock", value: "P", label: "Paragraphe" },
  { command: "formatBlock", value: "H1", label: "Titre 1" },
  { command: "formatBlock", value: "H2", label: "Titre 2" },
  { command: "formatBlock", value: "BLOCKQUOTE", label: "Citation" },
  { command: "formatBlock", value: "PRE", label: "Bloc de code" },
];

export default function RichTextEditor({
  defaultValue = "",
  onChange,
  placeholder = "",
  className = "",
}: {
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
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
  const [blockOpen, setBlockOpen] = useState(false);
  const blockButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== defaultValue) {
      ref.current.innerHTML = sanitizeHtml(defaultValue);
      setEmpty(!defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (blockButtonRef.current?.contains(e.target as Node)) return;
      const listbox = document.querySelector("[data-rich-block-listbox]");
      if (listbox && !listbox.contains(e.target as Node)) {
        setBlockOpen(false);
      }
    }
    if (blockOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [blockOpen]);

  function updateFormat() {
    if (!ref.current) return;
    let block = "P";
    try {
      const val = document.queryCommandValue("formatBlock");
      if (typeof val === "string" && /h1|h2|h3|blockquote|pre/i.test(val)) {
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
        document.execCommand("insertHTML", false, `<code class="rounded bg-zinc-800/60 px-1 py-0.5 font-mono text-xs text-emerald-300">${escapeHtml(text)}</code>`);
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

  function insertImage() {
    const url = window.prompt("URL de l'image");
    if (url) {
      if (!/^https?:\/\//.test(url)) return;
      document.execCommand("insertHTML", false, `<img src="${escapeHtml(url)}" alt="" class="rounded max-w-full my-2" />`);
      handleInput();
    }
  }

  function clearFormatting() {
    exec("removeFormat");
    exec("formatBlock", "P");
  }

  const selectedBlock = BLOCK_TOOLS.find((t) => t.value === format.block) || BLOCK_TOOLS[0];

  return (
    <div className={`v8-rich-text flex h-full min-h-0 flex-col ${className}`}>
      <div
        className="mb-4 flex flex-wrap items-center gap-1 v8-inset p-1.5"
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

        <span className="mx-1 h-4 w-[1px] bg-white/10" />

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

        <span className="mx-1 h-4 w-[1px] bg-white/10" />

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

        <span className="mx-1 h-4 w-[1px] bg-white/10" />

        <div className="relative">
          <button
            ref={blockButtonRef}
            type="button"
            onClick={() => setBlockOpen((v) => !v)}
            className="flex min-w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
          >
            <span>{selectedBlock.label}</span>
            <Icon name="chevronDown" className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </button>
          <AnimatePresence>
            {blockOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                data-rich-block-listbox
                className="absolute left-0 top-full z-50 mt-1.5 min-w-fit overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl"
              >
                {BLOCK_TOOLS.map((tool) => (
                  <button
                    key={tool.value}
                    type="button"
                    onClick={() => {
                      exec("formatBlock", tool.value);
                      setBlockOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-4 whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                      format.block === tool.value
                        ? "bg-white/[0.10] text-white"
                        : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span>{tool.label}</span>
                    {format.block === tool.value && <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="mx-1 h-4 w-[1px] bg-white/10" />

        <ToolbarButton active={false} onClick={insertLink} label="Lien" icon="link" data-rich-command="createLink" />
        <ToolbarButton active={false} onClick={() => exec("unlink")} label="Supprimer le lien" icon="unlink" data-rich-command="unlink" />
        <ToolbarButton active={false} onClick={insertImage} label="Image" icon="image" data-rich-command="insertImage" />
        <ToolbarButton active={false} onClick={clearFormatting} label="Effacer le format" icon="remove-formatting" data-rich-command="removeFormat" />
      </div>

      <div
        className="relative flex-1 min-h-0 cursor-text overflow-hidden v8-inset px-4 py-3 transition-all duration-200 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/15 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
        onClick={() => ref.current?.focus()}
      >
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-zinc-600">{placeholder}</span>
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
          data-testid="rich-editor"
          className="h-full min-h-0 w-full flex-1 overflow-y-auto resize-none whitespace-pre-wrap text-xs leading-relaxed text-zinc-300 outline-none sm:text-sm"
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
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors ${
        active ? "bg-white/[0.12] text-white" : "hover:bg-white/[0.08] hover:text-white"
      }`}
      aria-label={label}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
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
