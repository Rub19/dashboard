import { useEffect, useRef, useState } from "react";
import { Check, Plus, Users, X } from "lucide-react";
import { riotAccounts, RiotAccountBook, riotAdd, riotRemove, riotSwitch } from "./api";
import { errorText, tr } from "./i18n";
import { toast } from "./qol";

export default function RiotAccounts() {
  const [book, setBook] = useState<RiotAccountBook | null>(null);
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const reload = () => riotAccounts().then(setBook, (reason) => toast(errorText(reason)));

  useEffect(() => {
    if (!open) return;
    void reload();
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (action: Promise<unknown>) => {
    setOpen(false);
    setAsking(null);
    action.catch((reason) => toast(errorText(reason)));
  };
  const remove = (slot: string) => {
    if (asking !== slot) {
      setAsking(slot);
      return;
    }
    setAsking(null);
    riotRemove(slot).then(reload, (reason) => toast(errorText(reason)));
  };

  return (
    <div className="riot-accounts" ref={box}>
      <button type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={tr("Changer de compte Riot", "Switch Riot account")} title={tr("Changer de compte Riot", "Switch Riot account")} onClick={() => setOpen((value) => !value)}><Users size={15} /></button>
      {open && book && (
        <div className="riot-accounts-menu" role="menu">
          <ul>
            {book.accounts.map(({ slot, identity }) => {
              const active = slot === book.active;
              return (
                <li key={slot || "first"} className={active ? "on" : undefined}>
                  <button type="button" role="menuitemradio" aria-checked={active} className="riot-account-pick" onClick={() => (active ? setOpen(false) : run(riotSwitch(slot)))}>
                    <span className="riot-account-check">{active && <Check size={14} />}</span>
                    <b>{identity.name}<span>#{identity.tag}</span></b>
                  </button>
                  <button type="button" className={asking === slot ? "riot-account-remove asking" : "riot-account-remove"} aria-label={tr(`Retirer ${identity.name}`, `Remove ${identity.name}`)} title={tr("Retirer ce compte", "Remove this account")} onClick={() => remove(slot)}>
                    {asking === slot ? tr("Confirmer", "Confirm") : <X size={13} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" role="menuitem" className="riot-account-add" onClick={() => run(riotAdd())}><Plus size={14} />{tr("Ajouter un compte", "Add an account")}</button>
        </div>
      )}
    </div>
  );
}
