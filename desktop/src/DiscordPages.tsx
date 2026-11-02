import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Pause, Play, Search, Shuffle, SkipBack, SkipForward, Square, Trash2 } from "lucide-react";
import { botCall } from "./api";
import { errorText, lang, tr } from "./i18n";
import { Drawer, Empty, ErrorBox, PageHead, Skeletons, Status, Tabs, useLoad } from "./kit";
import { Button } from "./ui";

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
const when = (value: unknown) => {
  const date = new Date(text(value));
  return text(value) && !Number.isNaN(date.getTime()) ? date.toLocaleString(lang, { dateStyle: "short", timeStyle: "short" }) : "";
};

function useAction(reload: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      reload();
      return true;
    } catch (reason) {
      setError(errorText(reason));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

function Confirm({ label, disabled, onConfirm }: { label: string; disabled?: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return <span className="row"><Button onClick={() => setAsking(false)}>{tr("Annuler", "Cancel")}</Button><Button className="danger" disabled={disabled} onClick={() => { setAsking(false); onConfirm(); }}>{tr("Confirmer", "Confirm")}</Button></span>;
  }
  return <Button className="danger" disabled={disabled} onClick={() => setAsking(true)}>{label}</Button>;
}

function Badge({ tone, children }: { tone?: "good" | "bad" | "warn"; children: ReactNode }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

function Moderation({ guild }: { guild: string }) {
  const [view, setView] = useState<"cases" | "bans">("cases");
  const cases = useLoad(() => botCall<{ cases?: Row[] }>(`api/guilds/${guild}/moderation/cases`), [guild]);
  const bans = useLoad(() => botCall<{ bans?: Row[] }>(`api/guilds/${guild}/moderation/bans`), [guild]);
  const action = useAction(() => { cases.reload(); bans.reload(); });
  return (
    <>
      <PageHead title={tr("Modération", "Moderation")} onRefresh={() => { cases.reload(); bans.reload(); }} refreshing={cases.loading || bans.loading} />
      <Tabs id="moderation" label={tr("Modération", "Moderation")} value={view} onChange={setView} tabs={[{ id: "cases", label: tr("Sanctions", "Cases") }, { id: "bans", label: tr("Bannis", "Bans") }]} />
      {action.error && <ErrorBox message={action.error} />}
      {view === "cases" ? (
        <Status state={cases}>
          {(data) => (data.cases ?? []).length === 0 ? <Empty title={tr("Aucune sanction", "No cases")} /> : (
            <div className="data-table">
              <table>
                <thead><tr><th scope="col">#</th><th scope="col">{tr("Membre", "Member")}</th><th scope="col">{tr("Action", "Action")}</th><th scope="col">{tr("Raison", "Reason")}</th><th scope="col">{tr("Par", "By")}</th><th scope="col">{tr("Date", "Date")}</th><th /></tr></thead>
                <tbody>
                  {(data.cases ?? []).map((row) => (
                    <tr key={text(row.caseNumber)}>
                      <td>{text(row.caseNumber)}</td>
                      <th scope="row">{text(row.userTag) || text(row.userId)}</th>
                      <td><Badge tone={/ban|kick/i.test(text(row.action)) ? "bad" : "warn"}>{text(row.action)}</Badge></td>
                      <td className="wrap">{text(row.reason)}</td>
                      <td>{text(row.moderatorTag)}</td>
                      <td>{when(row.createdAt)}</td>
                      <td>{text(row.status) !== "reverted" && <Confirm label={tr("Annuler", "Revert")} disabled={action.busy} onConfirm={() => void action.run(() => botCall(`api/guilds/${guild}/moderation/cases/${text(row.caseNumber)}/revert`, "POST", {}))} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Status>
      ) : (
        <Status state={bans}>
          {(data) => (data.bans ?? []).length === 0 ? <Empty title={tr("Aucun membre banni", "No banned members")} /> : (
            <div className="data-table">
              <table>
                <thead><tr><th scope="col">{tr("Membre", "Member")}</th><th scope="col">{tr("Raison", "Reason")}</th><th /></tr></thead>
                <tbody>
                  {(data.bans ?? []).map((row) => (
                    <tr key={text(row.userId)}>
                      <th scope="row">{text(row.userTag) || text(row.username) || text(row.userId)}</th>
                      <td className="wrap">{text(row.reason)}</td>
                      <td><Confirm label={tr("Débannir", "Unban")} disabled={action.busy} onConfirm={() => void action.run(() => botCall(`api/guilds/${guild}/moderation/unban`, "POST", { userId: row.userId, reason: "Débanni depuis Ethone" }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Status>
      )}
    </>
  );
}

function Members({ guild }: { guild: string }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const state = useLoad(() => botCall<{ members?: Row[]; total?: number; totalPages?: number }>(`api/guilds/${guild}/server/members?page=${page}`), [guild, page]);
  useEffect(() => setPage(1), [guild]);
  useEffect(() => {
    if (state.data) setRows((current) => (page === 1 ? state.data?.members ?? [] : [...current, ...(state.data?.members ?? [])]));
  }, [page, state.data]);
  const filter = query.trim().toLowerCase();
  const shown = rows.filter((row) => !filter || `${text(row.displayName)} ${text(row.username)}`.toLowerCase().includes(filter));
  return (
    <>
      <PageHead title={tr("Membres", "Members")} text={state.data?.total !== undefined ? tr(`${state.data.total} membres`, `${state.data.total} members`) : undefined} />
      <label className="discord-search files-search"><Search size={14} /><input value={query} placeholder={tr("Filtrer les membres chargés", "Filter loaded members")} aria-label={tr("Filtrer les membres", "Filter members")} onChange={(event) => setQuery(event.target.value)} /></label>
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {rows.length === 0 && state.loading ? <Skeletons count={6} height={48} /> : (
        <ul className="member-list">
          {shown.map((row) => (
            <li key={text(row.id) || text(row.username)}>
              {text(row.avatar) ? <img src={text(row.avatar)} alt="" loading="lazy" /> : <span className="member-initial">{text(row.displayName || row.username).charAt(0)}</span>}
              <span><b>{text(row.displayName) || text(row.username)}{row.bot ? <Badge>BOT</Badge> : null}</b><small>{text(row.username)}</small></span>
              {text(row.communicationDisabledUntil) && <Badge tone="warn">{tr("Exclu temporairement", "Timed out")}</Badge>}
            </li>
          ))}
        </ul>
      )}
      {page < (state.data?.totalPages ?? 1) && <Button disabled={state.loading} onClick={() => setPage((value) => value + 1)}>{tr("Charger plus", "Load more")}</Button>}
    </>
  );
}

function Tickets({ guild }: { guild: string }) {
  const state = useLoad(() => botCall<{ tickets?: Row[] }>(`api/guilds/${guild}/tickets/list`), [guild]);
  const [open, setOpen] = useState<Row | null>(null);
  const action = useAction(state.reload);
  const rows = state.data?.tickets ?? [];
  const send = async (name: string, body: object) => {
    if (await action.run(() => botCall(`api/guilds/${guild}/tickets/tickets/${text(open?.id)}/${name}`, "POST", body))) setOpen(null);
  };
  return (
    <>
      <PageHead title="Tickets" onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {() => rows.length === 0 ? <Empty title={tr("Aucun ticket", "No tickets")} /> : (
          <ul className="card-rows">
            {rows.map((row) => (
              <li key={text(row.id)}>
                <button type="button" onClick={() => setOpen(row)}>
                  <span><b>{text(row.categoryName) || tr("Ticket", "Ticket")}{text(row.tag) ? ` ${text(row.tag)}` : ""}</b><small>{text(row.userTag) || text(row.authorTag)}{when(row.createdAt) ? `, ${when(row.createdAt)}` : ""}</small></span>
                  {text(row.priority) && <Badge tone={/high|urgent/i.test(text(row.priority)) ? "bad" : undefined}>{text(row.priority)}</Badge>}
                  <Badge tone={/closed|ferm/i.test(text(row.status)) ? undefined : "good"}>{text(row.status)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Status>
      <Drawer open={Boolean(open)} title={text(open?.categoryName) || "Ticket"} onClose={() => setOpen(null)}>
        <p className="muted">{text(open?.userTag) || text(open?.authorTag)}</p>
        {text(open?.description) && <p>{text(open?.description)}</p>}
        {action.error && <ErrorBox message={action.error} />}
        <div className="row">
          <Button disabled={action.busy} onClick={() => void send("claim", { claimedBy: "Ethone" })}>{tr("Prendre en charge", "Claim")}</Button>
          <Confirm label={tr("Fermer le ticket", "Close ticket")} disabled={action.busy} onConfirm={() => void send("close", { closedBy: "Ethone", reason: "Fermé depuis Ethone" })} />
        </div>
      </Drawer>
    </>
  );
}

function Giveaways({ guild }: { guild: string }) {
  const state = useLoad(() => botCall<{ giveaways?: Row[] }>(`api/guilds/${guild}/giveaways/list`), [guild]);
  const action = useAction(state.reload);
  const rows = state.data?.giveaways ?? [];
  const act = (id: string, name: string) => void action.run(() => botCall(`api/guilds/${guild}/giveaways/${id}/${name}`, "POST", {}));
  return (
    <>
      <PageHead title={tr("Concours", "Giveaways")} onRefresh={state.reload} refreshing={state.loading} />
      {action.error && <ErrorBox message={action.error} />}
      <Status state={state}>
        {() => rows.length === 0 ? <Empty title={tr("Aucun concours", "No giveaways")} /> : (
          <ul className="card-rows">
            {rows.map((row) => {
              const id = text(row.id);
              const active = /active|running|ongoing/i.test(text(row.status));
              const entries = Array.isArray(row.participants) ? row.participants.length : Number(row.participants ?? 0);
              return (
                <li key={id}>
                  <div>
                    <span><b>{text(row.prize)}</b><small>{tr(`${entries} participants, ${text(row.winnerCount)} gagnant(s)`, `${entries} entries, ${text(row.winnerCount)} winner(s)`)}{when(row.endsAt) ? `, ${when(row.endsAt)}` : ""}</small></span>
                    <Badge tone={active ? "good" : undefined}>{text(row.status)}</Badge>
                    {active ? <Confirm label={tr("Terminer", "End")} disabled={action.busy} onConfirm={() => act(id, "end")} /> : <Button disabled={action.busy} onClick={() => act(id, "reroll")}>{tr("Retirer un gagnant", "Reroll")}</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Status>
    </>
  );
}

function Suggestions({ guild }: { guild: string }) {
  const state = useLoad(() => botCall<{ suggestions?: Row[] }>(`api/guilds/${guild}/suggestions/list`), [guild]);
  const action = useAction(state.reload);
  const rows = state.data?.suggestions ?? [];
  const set = (id: string, status: string) => void action.run(() => botCall(`api/guilds/${guild}/suggestions/${id}/status`, "POST", { status }));
  return (
    <>
      <PageHead title={tr("Suggestions", "Suggestions")} onRefresh={state.reload} refreshing={state.loading} />
      {action.error && <ErrorBox message={action.error} />}
      <Status state={state}>
        {() => rows.length === 0 ? <Empty title={tr("Aucune suggestion", "No suggestions")} /> : (
          <ul className="card-rows">
            {rows.map((row) => (
              <li key={text(row.id)}>
                <div>
                  <span><b>{text(row.title) || text(row.suggestion)}</b><small>{text(row.authorTag)}, ▲ {text(row.upvotesCount) || 0}, ▼ {text(row.downvotesCount) || 0}</small></span>
                  <Badge tone={text(row.status) === "accepted" ? "good" : text(row.status) === "rejected" ? "bad" : undefined}>{text(row.status)}</Badge>
                  <Button disabled={action.busy} onClick={() => set(text(row.id), "accepted")}>{tr("Accepter", "Accept")}</Button>
                  <Button disabled={action.busy} className="danger" onClick={() => set(text(row.id), "rejected")}>{tr("Refuser", "Reject")}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Status>
    </>
  );
}

function AuditLog({ guild }: { guild: string }) {
  const state = useLoad(() => botCall<{ events?: Row[] }>(`api/guilds/${guild}/logs/events`), [guild]);
  const [query, setQuery] = useState("");
  const filter = query.trim().toLowerCase();
  const rows = (state.data?.events ?? []).filter((row) => !filter || JSON.stringify(row).toLowerCase().includes(filter));
  const name = (value: unknown) => (value && typeof value === "object" ? text((value as Row).tag) : text(value));
  return (
    <>
      <PageHead title={tr("Journal d'audit", "Audit log")} onRefresh={state.reload} refreshing={state.loading} />
      <label className="discord-search files-search"><Search size={14} /><input value={query} placeholder={tr("Filtrer", "Filter")} aria-label={tr("Filtrer le journal", "Filter the log")} onChange={(event) => setQuery(event.target.value)} /></label>
      <Status state={state}>
        {() => rows.length === 0 ? <Empty title={tr("Aucun événement", "No events")} /> : (
          <div className="data-table">
            <table>
              <thead><tr><th scope="col">{tr("Événement", "Event")}</th><th scope="col">{tr("Par", "By")}</th><th scope="col">{tr("Cible", "Target")}</th><th scope="col">{tr("Raison", "Reason")}</th><th scope="col">{tr("Date", "Date")}</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((row, index) => (
                  <tr key={index}>
                    <th scope="row"><Badge tone={/high|critical/i.test(text(row.severity)) ? "bad" : undefined}>{text(row.type)}</Badge></th>
                    <td>{name(row.actor)}</td>
                    <td>{name(row.target)}</td>
                    <td className="wrap">{text(row.reason)}</td>
                    <td>{when(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Status>
    </>
  );
}

function Music({ guild }: { guild: string }) {
  const root = useRef<HTMLDivElement>(null);
  const state = useLoad(() => botCall<{ state?: Row }>(`api/guilds/${guild}/music/state`), [guild]);
  const action = useAction(state.reload);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => root.current?.offsetParent && state.reload(), 8000);
    return () => clearInterval(timer);
  }, [state.reload]);
  const music = state.data?.state ?? {};
  const current = (["currentTrack", "current", "nowPlaying", "track"].map((key) => music[key]).find((value) => value && typeof value === "object") ?? null) as Row | null;
  const queue = Array.isArray(music.queue) ? (music.queue as Row[]) : [];
  const send = (name: string, body: object = {}) => void action.run(() => botCall(`api/guilds/${guild}/music/${name}`, "POST", body));
  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults((await botCall<{ results?: Row[] }>(`api/guilds/${guild}/music/search?q=${encodeURIComponent(query.trim())}`)).results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };
  const paused = Boolean(music.paused ?? music.isPaused);
  return (
    <div className="music" ref={root}>
      <PageHead title={tr("Musique", "Music")} />
      {action.error && <ErrorBox message={action.error} />}
      <section className="music-player">
        <div><b>{current ? text(current.title) : tr("Rien en lecture", "Nothing playing")}</b><small>{current ? text(current.author) || text(current.artist) : tr("Lance une musique depuis la recherche.", "Start a track from search.")}</small></div>
        <div className="row">
          <button type="button" className="icon-btn" aria-label={tr("Précédent", "Previous")} onClick={() => send("previous")}><SkipBack size={18} /></button>
          <button type="button" className="icon-btn music-main" aria-label={paused ? tr("Reprendre", "Resume") : tr("Pause", "Pause")} onClick={() => send(paused ? "resume" : "pause")}>{paused ? <Play size={20} /> : <Pause size={20} />}</button>
          <button type="button" className="icon-btn" aria-label={tr("Suivant", "Next")} onClick={() => send("skip")}><SkipForward size={18} /></button>
          <button type="button" className="icon-btn" aria-label={tr("Mélanger", "Shuffle")} onClick={() => send("shuffle")}><Shuffle size={16} /></button>
          <button type="button" className="icon-btn" aria-label={tr("Arrêter", "Stop")} onClick={() => send("stop")}><Square size={16} /></button>
          {typeof music.volume === "number" && <input type="range" min={0} max={100} defaultValue={music.volume} aria-label={tr("Volume", "Volume")} onPointerUp={(event) => send("volume", { volume: Number(event.currentTarget.value) })} />}
        </div>
      </section>
      <form className="daily-add" onSubmit={(event) => void search(event)}><input value={query} placeholder={tr("Chercher une musique", "Search for a track")} aria-label={tr("Chercher une musique", "Search for a track")} onChange={(event) => setQuery(event.target.value)} /><Button type="submit" disabled={searching || !query.trim()}><Search size={15} />{tr("Chercher", "Search")}</Button></form>
      {results.length > 0 && (
        <ul className="card-rows">
          {results.slice(0, 10).map((row, index) => <li key={index}><div><span><b>{text(row.title)}</b><small>{text(row.author) || text(row.artist)}</small></span><Button onClick={() => send("play", { query: text(row.uri) || text(row.url) || text(row.title) })}><Play size={14} />{tr("Lire", "Play")}</Button></div></li>)}
        </ul>
      )}
      <h2 className="group-title">{tr("File d'attente", "Queue")}{queue.length ? ` (${queue.length})` : ""}</h2>
      {queue.length === 0 ? <p className="muted">{tr("La file est vide.", "The queue is empty.")}</p> : (
        <ul className="card-rows">
          {queue.map((row, index) => <li key={index}><div><span><b>{text(row.title)}</b><small>{text(row.author) || text(row.artist)}</small></span><button type="button" className="icon-btn" aria-label={tr(`Retirer ${text(row.title)}`, `Remove ${text(row.title)}`)} onClick={() => void action.run(() => botCall(`api/guilds/${guild}/music/queue/${index}`, "DELETE"))}><Trash2 size={15} /></button></div></li>)}
        </ul>
      )}
    </div>
  );
}

export const CUSTOM_DISCORD_PAGES: Record<string, (props: { guild: string }) => ReactNode> = {
  moderation: Moderation,
  members: Members,
  tickets: Tickets,
  giveaways: Giveaways,
  suggestions: Suggestions,
  "audit-log": AuditLog,
  music: Music,
};
