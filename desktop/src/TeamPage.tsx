import { FormEvent, useState } from "react";
import { Check, Layers, Plus, RefreshCw, Send, Trash2, Users } from "lucide-react";
import { apiCall, apiData } from "./api";
import { firstArray, Json, rowTitle } from "./generic";
import { errorText, tr } from "./i18n";
import { ErrorBox, Skeletons, useLoad } from "./kit";
import { mailInitials, mailSenderHue } from "./mail";
import { Button } from "./ui";

type Row = { [key: string]: Json };
const asRow = (row: Json): Row => (row && typeof row === "object" && !Array.isArray(row) ? (row as Row) : {});

function Confirmed({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <span className="team-confirm"><Button onClick={() => setAsking(false)}>{tr("Annuler", "Cancel")}</Button><Button className="danger" onClick={onConfirm}><Check size={14} />{tr("Confirmer", "Confirm")}</Button></span>
  ) : <button type="button" className="team-remove" aria-label={label} title={label} onClick={() => setAsking(true)}><Trash2 size={14} /></button>;
}

function Members({ reloadKey }: { reloadKey: number }) {
  const state = useLoad(() => apiCall<Json>("api/team/members"), [reloadKey]);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invite = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    setError(null);
    setSent(null);
    apiData("api/team/invite", "POST", { email: address }).then(() => {
      setEmail("");
      setSent(address);
      state.reload();
    }, (reason) => setError(errorText(reason)));
  };
  const remove = (id: string) => {
    setError(null);
    apiData("api/team/members", "DELETE", { id }).then(state.reload, (reason) => setError(errorText(reason)));
  };
  const rows = state.data ? firstArray(state.data).map(asRow) : null;
  return (
    <section className="team-card team-members" aria-labelledby="team-members">
      <header>
        <span className="team-icon"><Users size={17} /></span>
        <div><h2 id="team-members">{tr("Membres", "Members")}</h2><small>{rows ? tr(`${rows.length} personne(s)`, `${rows.length} people`) : " "}</small></div>
      </header>
      <form className="team-invite" onSubmit={invite}>
        <input type="email" required value={email} placeholder={tr("Adresse e-mail à inviter", "Email to invite")} aria-label={tr("Adresse e-mail à inviter", "Email to invite")} onChange={(event) => setEmail(event.target.value)} />
        <button type="submit" disabled={!email.includes("@")}><Send size={14} />{tr("Inviter", "Invite")}</button>
      </form>
      {sent && <p className="ok small" role="status">{tr(`Invitation envoyée à ${sent}.`, `Invitation sent to ${sent}.`)}</p>}
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!rows ? (state.loading ? <Skeletons count={3} height={48} /> : null) : rows.length === 0 ? (
        <div className="team-empty">
          <span className="team-faces" aria-hidden="true"><i /><i /><i /></span>
          <b>{tr("Tu es seul pour l'instant", "You're on your own for now")}</b>
          <p>{tr("Invite quelqu'un par e-mail pour travailler à plusieurs.", "Invite someone by email to work together.")}</p>
        </div>
      ) : (
        <ul className="team-people">
          {rows.map((row) => {
            const address = String(row.email ?? "");
            const name = String(row.name ?? row.display_name ?? address);
            return (
              <li key={String(row.id)}>
                <span className="mail-avatar" style={{ "--mail-hue": mailSenderHue(address || name) } as React.CSSProperties}>{mailInitials(name, address)}</span>
                <span className="team-person"><b>{name}</b>{address !== name && <small>{address}</small>}</span>
                {row.status ? <span className="team-chip">{String(row.status)}</span> : null}
                {row.role ? <span className="team-chip">{String(row.role)}</span> : null}
                <Confirmed label={tr(`Retirer ${name}`, `Remove ${name}`)} onConfirm={() => remove(String(row.id))} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Spaces({ reloadKey }: { reloadKey: number }) {
  const shared = useLoad(() => apiCall<Json>("api/shared-spaces"), [reloadKey]);
  const mine = useLoad(() => apiCall<Json>("api/user-data/spaces"), [reloadKey]);
  const [kind, setKind] = useState<"shared" | "mine">("shared");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const state = kind === "shared" ? shared : mine;
  const path = kind === "shared" ? "api/shared-spaces" : "api/user-data/spaces";
  const create = (event: FormEvent) => {
    event.preventDefault();
    const label = name.trim();
    if (!label) return;
    setError(null);
    const body = kind === "shared" ? { name: label } : { slug: `spaces-${Date.now()}`, label, data: { color: "#3aa8ff" } };
    apiData(path, "POST", body).then(() => {
      setName("");
      setAdding(false);
      state.reload();
    }, (reason) => setError(errorText(reason)));
  };
  const remove = (id: Json) => {
    setError(null);
    apiData(path, "DELETE", { id }).then(state.reload, (reason) => setError(errorText(reason)));
  };
  const rows = state.data ? firstArray(state.data).map(asRow) : null;
  const tabs: ["shared" | "mine", string, number | null][] = [["shared", tr("Partagés", "Shared"), shared.data ? firstArray(shared.data).length : null], ["mine", tr("Personnels", "Personal"), mine.data ? firstArray(mine.data).length : null]];
  return (
    <section className="team-card team-spaces" aria-labelledby="team-spaces">
      <header>
        <span className="team-icon"><Layers size={17} /></span>
        <div><h2 id="team-spaces">{tr("Espaces", "Spaces")}</h2><small>{kind === "shared" ? tr("Visibles par ton équipe", "Visible to your team") : tr("Visibles par toi seul", "Visible only to you")}</small></div>
        <div className="segmented" role="group" aria-label={tr("Type d'espace", "Space type")}>
          {tabs.map(([id, label, count]) => <button key={id} type="button" className={kind === id ? "on" : ""} aria-pressed={kind === id} onClick={() => { setKind(id); setAdding(false); setError(null); }}>{kind === id && <span className="segmented-pill" />}<span>{label}{count ? ` ${count}` : ""}</span></button>)}
        </div>
      </header>
      {(error || state.error) && <ErrorBox message={error ?? state.error ?? ""} onRetry={state.reload} />}
      {!rows ? (state.loading ? <Skeletons count={2} height={72} /> : null) : (
        <ul className="team-grid">
          {rows.map((row) => (
            <li key={String(row.id)} className="team-space">
              <i style={{ background: typeof asRow(row.data ?? null).color === "string" ? String(asRow(row.data ?? null).color) : "var(--accent-text)" }} />
              <b>{rowTitle(row)}</b>
              <Confirmed label={tr(`Supprimer ${rowTitle(row)}`, `Delete ${rowTitle(row)}`)} onConfirm={() => remove(row.id)} />
            </li>
          ))}
          <li className="team-space new">
            {adding ? (
              <form onSubmit={create}>
                <input autoFocus value={name} maxLength={60} placeholder={tr("Nom de l'espace", "Space name")} aria-label={tr("Nom de l'espace", "Space name")} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Escape" && setAdding(false)} />
                <button type="submit" disabled={!name.trim()} aria-label={tr("Créer", "Create")}><Check size={15} /></button>
              </form>
            ) : <button type="button" onClick={() => setAdding(true)}><Plus size={16} />{tr("Nouvel espace", "New space")}</button>}
          </li>
        </ul>
      )}
    </section>
  );
}

export function TeamPage() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="team-page">
      <header className="team-hero">
        <div><h1>{tr("Équipe", "Team")}</h1><p>{tr("Les personnes et les espaces avec qui tu travailles.", "The people and spaces you work with.")}</p></div>
        <Button onClick={() => setReloadKey(reloadKey + 1)}><RefreshCw size={14} />{tr("Actualiser", "Refresh")}</Button>
      </header>
      <div className="team-layout">
        <Members reloadKey={reloadKey} />
        <Spaces reloadKey={reloadKey} />
      </div>
    </div>
  );
}
