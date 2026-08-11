"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

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
      ref.current.innerHTML = defaultValue;
      setEmpty(!defaultValue);
    }
  }, [defaultValue]);

  function exec(cmd: string, value: string | undefined = undefined) {
    document.execCommand(cmd, false, value);
    if (ref.current) {
      onChange?.(ref.current.innerHTML);
      setEmpty(ref.current.innerHTML === "" || ref.current.innerHTML === "<br>");
    }
  }

  function handleInput() {
    if (ref.current) {
      onChange?.(ref.current.innerHTML);
      setEmpty(ref.current.innerHTML === "" || ref.current.innerHTML === "<br>");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.command}
            type="button"
            onClick={() => exec(tool.command)}
            title={tool.label}
            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label={tool.label}
          >
            <Icon name={tool.icon} className="h-4 w-4" />
          </button>
        ))}
        <div className="mx-1 w-px bg-[var(--border)]" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("URL du lien");
            if (url) exec("createLink", url);
          }}
          title="Lien"
          className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          aria-label="Lien"
        >
          <Icon name="link" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("removeFormat")}
          title="Effacer le format"
          className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          aria-label="Effacer le format"
        >
          <Icon name="remove-formatting" className="h-4 w-4" />
        </button>
      </div>
      <div
        className="relative min-h-[6rem] w-full cursor-text rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus-within:border-[var(--accent)]"
        onClick={() => ref.current?.focus()}
      >
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-[var(--muted)]">{placeholder}</span>
        )}
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          onInput={handleInput}
          className="min-h-[5rem] w-full whitespace-pre-wrap outline-none"
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}
