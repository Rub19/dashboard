import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { ExternalLink, LogOut, RefreshCw, Search, Star, X } from "lucide-react";
import { apiData, catalogGet, riotLinkUrl, riotLogin, riotLogout, riotOpenBrowser, riotRank, riotStatus, trackerIdentity, trackerMatches, trackerSync } from "./api";
import { agentIcon, bannerImage, EvalAccount, EvalHistoryPoint, EvalMatch, lastSession, mapImage, matchAnalysis, matchLine, matchSummary, modeName, rankColor, rankName, roundsFor, scoreboard, splitRiotId, statsFor, tierIcon, weaponIcon } from "./eval";
import { errorText, lang, t, tr } from "./i18n";
import { EASE_SNAP, listItem, listStagger, SPRING_SWAP, stepEnter } from "./motion";
import { readJson, write } from "./settings";
import EvalGame from "./EvalGame";
import EvalHub from "./EvalHub";
import EvalLive from "./EvalLive";
import { Tabs } from "./kit";
import { Button, ValorantMark } from "./ui";

const LOCAL_ID = "ethone-eval-riot-id";
const MATCH_LIMIT = 25;
type EvalTab = "profile" | "live" | "game" | "hub";

interface Loaded {
  account: EvalAccount;
  matches: EvalMatch[];
  linked: boolean;
}

type RiotRank = NonNullable<EvalAccount["mmr"]>;

let memory: Loaded | null = null;

const dateFormat = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const decimal = (value: number) => value.toFixed(1).replace(".", ",");

function Count({ value, format = String }: { value: number; format?: (value: number) => string }) {
  const reduce = useReducedMotion();
  const live = useMotionValue(reduce ? value : 0);
  const text = useTransform(live, (current) => format(Number.isInteger(value) ? Math.round(current) : current));
  useEffect(() => {
    if (reduce) {
      live.set(value);
      return;
    }
    const controls = animate(live, value, { duration: 0.7, ease: EASE_SNAP });
    return () => controls.stop();
  }, [live, reduce, value]);
  return <motion.span>{text}</motion.span>;
}

function RankDisc({ tier, progress, size }: { tier: number; progress: number; size: number }) {
  const radius = size / 2 - 3;
  return (
    <span className="rank-disc" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} className="rank-track" />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} className="rank-fill" stroke={rankColor(tier)} transform={`rotate(-90 ${size / 2} ${size / 2})`} initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 0.8, ease: EASE_SNAP }} />
      </svg>
      {tier > 0 && <img src={tierIcon(tier)} alt="" />}
    </span>
  );
}

function ProfileCard({ account, linked, onDisconnect }: { account: EvalAccount; linked: boolean; onDisconnect: () => void }) {
  const tier = account.mmr?.tier || account.tier || 0;
  const peak = account.mmr?.peakTier ?? 0;
  const rr = account.mmr?.rr ?? 0;
  return (
    <section className="eval-card eval-profile" aria-label={t("evalProfile")}>
      <header className="eval-account"><b>{account.name}<span>#{account.tag}</span></b>{linked && <button type="button" className="icon-btn" aria-label={t("evalDisconnect")} title={t("evalDisconnect")} onClick={onDisconnect}><LogOut size={15} /></button>}</header>
      <div className="eval-banner">
        {account.card ? <img src={bannerImage(account.card)} alt="" /> : <span className="eval-banner-empty" />}
        {(account.level ?? 0) > 0 && <span className="eval-level">{account.level}</span>}
      </div>
      <div className="eval-ranks">
        <div>
          <small>{t("evalCurrent")}</small>
          <RankDisc tier={tier} progress={tier > 0 ? rr / 100 : 0} size={96} />
          <b style={{ color: rankColor(tier) }}>{rankName(tier)}</b>
          {tier > 0 && <small>{rr} RR</small>}
          {(account.mmr?.leaderboardRank ?? 0) > 0 && <span className="eval-board">{t("evalBoard", { rank: String(account.mmr?.leaderboardRank) })}</span>}
        </div>
        <div>
          <small>{t("evalPeak")}</small>
          <RankDisc tier={peak} progress={peak > 0 ? 1 : 0} size={96} />
          <b style={{ color: rankColor(peak) }}>{rankName(peak)}</b>
        </div>
      </div>
    </section>
  );
}

function StatGrid({ matches, puuid }: { matches: EvalMatch[]; puuid: string }) {
  const stats = statsFor(matches, puuid);
  return (
    <section className="eval-card eval-summary">
      <h2>{t("evalSummary")}</h2>
      <p>{t("evalOnMatches", { count: String(stats.count) })}</p>
      <dl>
        <div><dt>{t("evalWinRate")}</dt><dd><Count value={stats.winRate} format={(value) => `${decimal(value)} %`} /></dd></div>
        <div><dt>{t("evalRecord")}</dt><dd>{stats.wins}V – {stats.losses}D</dd></div>
        <div><dt>K/D</dt><dd><Count value={stats.kd} format={decimal} /></dd></div>
        <div><dt>{t("evalHeadshots")}</dt><dd><Count value={stats.hs} format={(value) => `${value} %`} /></dd></div>
        <div><dt>{t("evalDamage")}</dt><dd><Count value={stats.adr} /></dd></div>
      </dl>
    </section>
  );
}

function Session({ matches, puuid }: { matches: EvalMatch[]; puuid: string }) {
  const session = lastSession(matches);
  if (session.length === 0) return null;
  const stats = statsFor(session, puuid);
  return (
    <section className="eval-session" aria-label={t("evalSession")}>
      <div><small>{t("evalSession")}</small><b>{stats.wins}V – {stats.losses}D</b></div>
      <div><small>K/D</small><b>{decimal(stats.kd)}</b></div>
      <div><small>{t("evalHeadshots")}</small><b>{stats.hs} %</b></div>
      <div><small>{t("evalDamage")}</small><b>{stats.adr}</b></div>
    </section>
  );
}

function useMapImages() {
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    catalogGet<{ displayName: string; listViewIconTall?: string | null; listViewIcon?: string | null; splash?: string | null }[]>("/maps").then((maps) => {
      if (active) setImages(Object.fromEntries(maps.map((item) => [item.displayName.toLowerCase(), item.listViewIcon ?? item.splash ?? ""])));
    }, () => null);
    return () => {
      active = false;
    };
  }, []);
  return images;
}

function MatchRow({ match, puuid, history, image, onOpen }: { match: EvalMatch; puuid: string; history?: EvalHistoryPoint; image?: string; onOpen: () => void }) {
  const summary = matchSummary(match, puuid);
  if (!summary) return null;
  const { me, won, draw, score, mvp, kd } = summary;
  const result = draw ? "draw" : won ? "win" : "loss";
  return (
    <motion.li variants={listItem}>
      <button type="button" className={`eval-match ${result}`} onClick={onOpen}>
        <span className="eval-match-head">
          <span className="eval-match-title">
            <b>{modeName(match.mode)}</b>
            {match.startedAt && <small>{dateFormat.format(new Date(match.startedAt))}</small>}
          </span>
          {history && (
            <span className="eval-rr">
              <span><b className={history.change >= 0 ? "up" : "down"}>{history.change >= 0 ? "+" : ""}{history.change}</b><small>{history.rr}</small></span>
              <RankDisc tier={history.tier} progress={history.rr / 100} size={44} />
            </span>
          )}
        </span>
        <span className="eval-match-art">
          {(image || match.mapId) && <img className="eval-map" src={image || mapImage(match.mapId)} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
          {me.agentId && <img className="eval-agent" src={agentIcon(me.agentId)} alt="" />}
          <span className="eval-match-copy">
            <b>{me.agent}</b>
            <span className="eval-chip">{match.map}{mvp && <i>{t(mvp === "match" ? "evalMvpMatch" : "evalMvpTeam")}</i>}</span>
          </span>
          <span className="eval-score"><b>{score[0]}</b><span>–</span><b>{score[1]}</b></span>
        </span>
        <span className="eval-match-foot">
          <span><small>K/D/A</small><b>{me.kills}/{me.deaths}/{me.assists}</b></span>
          <span><small>K/D</small><b>{decimal(kd)}</b></span>
          <span><small>ACS</small><b>{summary.acs}</b></span>
          <span><small>{t("evalHeadshots")}</small><b>{summary.hs} %</b></span>
          <span><small>{t("evalDamage")}</small><b>{summary.adr}</b></span>
        </span>
      </button>
    </motion.li>
  );
}

function MatchPanel({ match, puuid, image, onClose }: { match: EvalMatch; puuid: string; image?: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const [view, setView] = useState<"board" | "analysis" | "rounds" | "kills">("board");
  const nameOf = (id: string) => match.players.find((player) => player.puuid === id)?.name ?? "?";
  const rounds = roundsFor(match, puuid);
  const analysis = matchAnalysis(match, puuid);
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <>
      <motion.div className="eval-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
      <motion.aside role="dialog" aria-label={match.map} className="eval-panel" initial={reduce ? { opacity: 0 } : { transform: "translateX(100%)" }} animate={reduce ? { opacity: 1 } : { transform: "translateX(0%)" }} exit={reduce ? { opacity: 0 } : { transform: "translateX(100%)" }} transition={{ type: "spring", duration: 0.42, bounce: 0 }}>
        <header>
          {(image || match.mapId) && <img src={image || mapImage(match.mapId)} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
          <div>
            <h2>{match.map}</h2>
            <p>{modeName(match.mode)}{match.startedAt ? `, ${dateFormat.format(new Date(match.startedAt))}` : ""}{match.lengthSec > 0 ? `, ${Math.round(match.lengthSec / 60)} min` : ""}</p>
          </div>
          <button ref={close} type="button" className="icon-btn" aria-label={t("close")} onClick={onClose}><X size={18} /></button>
        </header>
        {rounds.length > 0 && <div className="eval-panel-tabs"><Tabs id="match" label={tr("Vue du match", "Match view")} value={view} onChange={setView} tabs={[{ id: "board", label: tr("Tableau", "Scoreboard") }, { id: "analysis", label: tr("Analyse", "Analysis") }, { id: "rounds", label: tr("Manches", "Rounds") }, { id: "kills", label: tr("Éliminations", "Kills") }]} /></div>}
        <div className="eval-board-scroll">
          {view === "analysis" && (
            <dl className="eval-analysis">
              <div><dt>KAST</dt><dd>{analysis.kast} %</dd></div>
              <div><dt>{tr("Premières éliminations", "First kills")}</dt><dd>{analysis.firstKills}</dd></div>
              <div><dt>{tr("Premières morts", "First deaths")}</dt><dd>{analysis.firstDeaths}</dd></div>
              <div><dt>{tr("Spikes posés", "Spikes planted")}</dt><dd>{analysis.plants}</dd></div>
              <div><dt>{tr("Spikes désamorcés", "Spikes defused")}</dt><dd>{analysis.defuses}</dd></div>
            </dl>
          )}
          {view === "rounds" && (
            <ol className="eval-rounds">
              {rounds.map((round) => (
                <li key={round.n} className={round.won ? "won" : "lost"}>
                  <b>{round.n}</b>
                  <span>{round.won ? tr("Gagnée", "Won") : tr("Perdue", "Lost")}{round.end ? `, ${round.end}` : ""}</span>
                  <small>{round.site ? tr(`Spike en ${round.site}`, `Spike at ${round.site}`) : ""}</small>
                  <small>{round.kills} {tr("élim.", "kills")}{round.died ? tr(", mort", ", died") : ""}</small>
                </li>
              ))}
            </ol>
          )}
          {view === "kills" && (
            <ol className="eval-feed">
              {(match.kills ?? []).map((kill, index) => (
                <li key={index} className={kill.k === puuid ? "mine" : kill.v === puuid ? "theirs" : ""}>
                  <small>{kill.r}</small>
                  <b>{nameOf(kill.k)}</b>
                  {kill.w && <img src={weaponIcon(kill.w)} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
                  <b>{nameOf(kill.v)}</b>
                </li>
              ))}
            </ol>
          )}
          {view === "board" && scoreboard(match, puuid).map((team) => (
            <table key={team.team} className={team.won ? "won" : "lost"}>
              <caption><b>{team.rounds}</b>{t(team.won ? "evalTeamWon" : "evalTeamLost")}</caption>
              <thead><tr><th scope="col">{t("evalPlayer")}</th><th scope="col">ACS</th><th scope="col">K/D/A</th><th scope="col">{t("evalHeadshots")}</th><th scope="col">{t("evalDamage")}</th></tr></thead>
              <tbody>
                {team.players.map((player) => {
                  const line = matchLine(player, match);
                  return (
                    <tr key={player.puuid} className={player.puuid === puuid ? "me" : ""}>
                      <th scope="row">
                        <span>
                          {player.agentId && <img src={agentIcon(player.agentId)} alt={player.agent} />}
                          <b>{player.name}</b>
                          {player.tier > 0 && <img className="tier" src={tierIcon(player.tier)} alt={rankName(player.tier)} title={rankName(player.tier)} />}
                        </span>
                      </th>
                      <td>{line.acs}</td>
                      <td>{player.kills}/{player.deaths}/{player.assists}</td>
                      <td>{line.hs} %</td>
                      <td>{line.adr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>
      </motion.aside>
    </>,
    document.body,
  );
}

function RiotIdForm({ onSubmit }: { onSubmit: (name: string, tag: string) => void }) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = splitRiotId(value);
    setInvalid(!id);
    if (id) onSubmit(id.name, id.tag);
  };
  return (
    <form className="eval-link" onSubmit={submit}>
      <label htmlFor="riot-id">{t("evalOtherPlayer")}</label>
      <div>
        <input id="riot-id" value={value} spellCheck={false} autoComplete="off" placeholder={t("evalRiotPlaceholder")} aria-invalid={invalid} onChange={(event) => setValue(event.target.value)} />
        <Button type="submit"><Search size={15} />{t("evalSearch")}</Button>
      </div>
      {invalid && <p className="bad" role="alert">{t("evalRiotInvalid")}</p>}
    </form>
  );
}

function BrowserLink({ onLinked }: { onLinked: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await riotLinkUrl(value);
      setValue("");
      onLinked();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.form className="eval-browser" variants={stepEnter} initial="initial" animate="animate" onSubmit={(event) => void submit(event)}>
      <ol>
        <li>{t("evalBrowserStep1")}</li>
        <li>{t("evalBrowserStep2")}</li>
        <li>{t("evalBrowserStep3")}</li>
      </ol>
      <label htmlFor="riot-url">{t("evalBrowserField")}</label>
      <div>
        <input id="riot-url" type="password" value={value} autoComplete="off" spellCheck={false} placeholder="https://playvalorant.com/opt_in#..." autoFocus onChange={(event) => setValue(event.target.value)} />
        <Button type="submit" variant="primary" disabled={busy || !value.trim()}>{t("evalBrowserSubmit")}</Button>
      </div>
      {error && <p className="bad" role="alert">{error}</p>}
      <p className="eval-note">{t("evalBrowserNote")}</p>
    </motion.form>
  );
}

function Connect({ error, connecting, onConnect, onLinked, onSearch }: { error: string | null; connecting: boolean; onConnect: () => void; onLinked: () => void; onSearch: (name: string, tag: string) => void }) {
  const [browser, setBrowser] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const openBrowser = () => {
    setBrowserError(null);
    riotOpenBrowser().then(() => setBrowser(true), (reason) => setBrowserError(errorText(reason)));
  };
  return (
    <div className="eval-connect">
      <ValorantMark size={44} />
      <h1>E:VAL</h1>
      <p>{t("evalConnectText")}</p>
      <div className="eval-connect-actions">
        <Button variant="primary" onClick={openBrowser}><ExternalLink size={15} />{t("evalConnectBrowser")}</Button>
        <Button disabled={connecting} onClick={onConnect}>{t("evalConnectWindow")}</Button>
      </div>
      {browser && <BrowserLink onLinked={onLinked} />}
      {connecting && <p role="status">{t("evalConnecting")}</p>}
      {(error || browserError) && <p className="bad" role="alert">{error ?? browserError}</p>}
      <RiotIdForm onSubmit={onSearch} />
    </div>
  );
}

export default function TrackerPage() {
  const [data, setData] = useState<Loaded | null>(memory);
  const [loading, setLoading] = useState(!memory);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsId, setNeedsId] = useState(false);
  const [open, setOpen] = useState<EvalMatch | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tab, setTab] = useState<EvalTab>("profile");
  const [limit, setLimit] = useState(MATCH_LIMIT);
  const [loadingMore, setLoadingMore] = useState(false);
  const firstLoad = useRef(!memory);
  const mapImages = useMapImages();

  const load = useCallback(async (name: string, tag: string, linkedId: string | null) => {
    const account = await trackerSync<EvalAccount>(name, tag);
    const [matches, rank] = await Promise.all([
      trackerMatches<EvalMatch>(account.puuid, MATCH_LIMIT),
      linkedId?.toLowerCase() === account.puuid.toLowerCase() ? riotRank<RiotRank>().catch(() => null) : null,
    ]);
    if (rank && (rank.tier ?? 0) > 0) account.mmr = { ...account.mmr, ...rank };
    memory = { account, matches, linked: Boolean(linkedId) };
    setData(memory);
    setNeedsId(false);
    setError(null);
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const riot = await riotStatus();
      const id = riot ?? readJson<{ name: string; tag: string }>(LOCAL_ID) ?? (await trackerIdentity());
      if (id) await load(id.name, id.tag, riot?.puuid ?? null);
      else setNeedsId(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (!memory) void start();
  }, [start]);

  useEffect(() => {
    const stop = listen<{ status: string; message: string | null }>("riot-login", ({ payload }) => {
      setConnecting(false);
      if (payload.status === "linked") {
        memory = null;
        setData(null);
        void start();
      } else if (payload.status === "failed") {
        setError(errorText(payload.message));
      }
    });
    return () => void stop.then((unlisten) => unlisten());
  }, [start]);

  const refresh = async () => {
    if (!data) return;
    setRefreshing(true);
    try {
      await load(data.account.name, data.account.tag, data.linked ? data.account.puuid : null);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setRefreshing(false);
    }
  };

  const search = async (name: string, tag: string) => {
    setLoading(true);
    setError(null);
    try {
      await load(name, tag, null);
      write(LOCAL_ID, JSON.stringify({ name, tag }));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  };

  const connect = () => {
    setConnecting(true);
    setError(null);
    riotLogin().catch((reason) => {
      setConnecting(false);
      setError(errorText(reason));
    });
  };

  const linked = () => {
    memory = null;
    setData(null);
    void start();
  };

  const disconnect = () => {
    memory = null;
    setData(null);
    write(LOCAL_ID, "null");
    riotLogout().catch((reason) => setError(errorText(reason))).finally(() => setNeedsId(true));
  };

  const loadMore = async () => {
    if (!data) return;
    setLoadingMore(true);
    try {
      const next = limit + 10;
      await apiData(`api/valorant/eval/history?puuid=${data.account.puuid}&page=${Math.floor(limit / 10) + 1}`);
      const matches = await trackerMatches<EvalMatch>(data.account.puuid, Math.min(100, next));
      memory = { ...data, matches };
      setData(memory);
      setLimit(next);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setLoadingMore(false);
    }
  };

  const closeMatch = useCallback(() => setOpen(null), []);

  if (loading) {
    return (
      <div className="eval-grid" aria-busy="true" aria-label={t("loading")}>
        <p className="eval-loading" role="status"><RefreshCw size={14} className="spin" />{t("evalLoading")}</p>
        <div className="eval-side"><span className="eval-skeleton tall" /><span className="eval-skeleton" /></div>
        <div className="eval-main"><span className="eval-skeleton" /><span className="eval-skeleton" /><span className="eval-skeleton" /></div>
      </div>
    );
  }
  if (needsId) return <Connect error={error} connecting={connecting} onConnect={connect} onLinked={linked} onSearch={(name, tag) => void search(name, tag)} />;
  if (!data) {
    return (
      <div className="eval-error" role="alert">
        <h1>{t("evalUnavailable")}</h1>
        <p>{error}</p>
        <Button onClick={() => void start()}>{t("retry")}</Button>
      </div>
    );
  }

  const { account, matches, linked: isLinked } = data;
  const history = account.mmr?.history ?? [];
  return (
    <>
      <div className="eval-tabs-row">
        <Tabs id="eval" label="E:VAL" value={tab} onChange={setTab} tabs={[{ id: "profile", label: tr("Profil", "Profile") }, { id: "live", label: tr("En direct", "Live") }, { id: "game", label: tr("Jeu", "Game") }, { id: "hub", label: "Hub" }]} />
      </div>
      {tab === "live" && <EvalLive linked={isLinked} onConnect={connect} />}
      {tab === "game" && <EvalGame linked={isLinked} onConnect={connect} />}
      {tab === "hub" && <EvalHub account={account} linked={isLinked} matches={matches} />}
      {tab === "profile" && <div className="eval-grid" inert={Boolean(open)}>
        <div className="eval-side">
          <ProfileCard account={account} linked={isLinked} onDisconnect={disconnect} />
          {matches.length > 0 && <StatGrid matches={matches} puuid={account.puuid} />}
        </div>
        <div className="eval-main">
          <div className="eval-head">
            <h1>{t("evalMatches")}</h1>
            <Button disabled={refreshing} onClick={() => void refresh()}><RefreshCw size={14} className={refreshing ? "spin" : ""} />{t("refresh")}</Button>
          </div>
          {error && <p className="bad eval-inline-error" role="alert">{error}</p>}
          {matches.length === 0 ? (
            <div className="eval-card eval-empty"><Star size={22} /><h2>{t("evalNoMatches")}</h2><p>{t("evalNoMatchesText")}</p></div>
          ) : (
            <>
              <Session matches={matches} puuid={account.puuid} />
              <motion.ul className="eval-matches" variants={listStagger} initial={firstLoad.current ? "initial" : false} animate="animate" transition={SPRING_SWAP}>
                {matches.map((match) => (
                  <MatchRow key={match.id} match={match} puuid={account.puuid} history={history.find((point) => point.match?.toLowerCase() === match.id.toLowerCase())} image={mapImages[match.map.toLowerCase()]} onOpen={() => setOpen(match)} />
                ))}
              </motion.ul>
              {matches.length >= limit && <Button disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? t("loading") : tr("Charger plus de matchs", "Load more matches")}</Button>}
            </>
          )}
        </div>
      </div>}
      <AnimatePresence>{open && <MatchPanel key={open.id} match={open} puuid={account.puuid} image={mapImages[open.map.toLowerCase()]} onClose={closeMatch} />}</AnimatePresence>
    </>
  );
}
