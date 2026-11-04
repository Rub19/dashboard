import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { t, tr } from "./i18n";
import { matchRange, rank, remember } from "./palette-search";
import { readJson, write } from "./settings";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

const RECENT_KEY = "ethone-palette-recent";

function Label({ text, query }: { text: string; query: string }) {
  const range = matchRange(text, query);
  if (!range) return <span>{text}</span>;
  return <span>{text.slice(0, range[0])}<mark>{text.slice(range[0], range[1])}</mark>{text.slice(range[1])}</span>;
}

export default function Palette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const { list: results, recentCount } = useMemo(() => rank(commands, query, readJson<string[]>(RECENT_KEY) ?? []), [commands, query]);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    document.getElementById(`palette-${results[index]?.id}`)?.scrollIntoView({ block: "nearest" });
  }, [index, results]);

  const pick = (command?: Command) => {
    if (!command) return;
    write(RECENT_KEY, JSON.stringify(remember(readJson<string[]>(RECENT_KEY) ?? [], command.id)));
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
          <Fragment key={command.id}>
            {recentCount > 0 && position === 0 && <li className="palette-group" role="presentation">{tr("Récents", "Recent")}</li>}
            {recentCount > 0 && position === recentCount && <li className="palette-group" role="presentation">{tr("Tout", "All")}</li>}
            <li id={`palette-${command.id}`} role="option" aria-selected={position === index} onMouseEnter={() => setIndex(position)} onClick={() => pick(command)}>
              <Label text={command.label} query={query} />{command.hint && <kbd>{command.hint}</kbd>}
            </li>
          </Fragment>
        ))}
        {results.length === 0 && <li className="muted">{t("noResult")}</li>}
      </ul>
    </dialog>
  );
}
