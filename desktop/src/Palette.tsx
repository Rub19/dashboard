import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { t } from "./i18n";

export interface Command {
  id: string;
  label: string;
  run: () => void;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export default function Palette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const results = useMemo(() => commands.filter((command) => normalize(command.label).includes(normalize(query))), [commands, query]);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    document.getElementById(`palette-${results[index]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [index, results]);

  const pick = (command?: Command) => {
    if (!command) return;
    onClose();
    command.run();
  };

  return (
    <dialog ref={dialog} className="palette" aria-label={t("commands")} onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => event.target === dialog.current && onClose()}>
      <div className="palette-input">
        <Search size={16} className="muted" />
        <input
          autoFocus
          value={query}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={results[index] ? `palette-${results[index].id}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((value) => Math.min(value + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((value) => Math.max(value - 1, 0));
            }
            if (event.key === "Enter") pick(results[index]);
          }}
        />
      </div>
      <ul id="palette-results" role="listbox">
        {results.map((command, position) => (
          <li key={command.id} id={`palette-${command.id}`} role="option" aria-selected={position === index} onMouseEnter={() => setIndex(position)} onClick={() => pick(command)}>
            {command.label}
          </li>
        ))}
        {results.length === 0 && <li className="muted">{t("noResult")}</li>}
      </ul>
    </dialog>
  );
}
