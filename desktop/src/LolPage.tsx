import { FormEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { ExternalLink, RefreshCw, Search, Star, UserRound, X } from "lucide-react";
import { apiData, riotLogin, riotStatus } from "./api";
import { readCache, writeCache } from "./cache";
import { splitRiotId } from "./eval";
import { Friends } from "./EvalHub";
import { errorText, lang, t, tr } from "./i18n";
import { ErrorBox, Skeletons, Tabs } from "./kit";
import { championSplash, LolItem, lolLine, LolMatch, lolMode, LolProfile, lolRank, lolSession, lolStats, lolTeams, topChampions } from "./lol";
import { listItem, listStagger, SPRING_SWAP } from "./motion";
import { RotationView } from "./MorePages";
import { usePersisted } from "./qol";
import { readJson, write } from "./settings";
import TftView from "./TftView";
import { dayLabel, RiotIdForm } from "./TrackerPage";
import { Button, LeagueMark } from "./ui";

const ID_KEY = "ethone-lol-id";
const FRESH = 5 * 60 * 1000;
const TABS = ["profile", "tft", "rotation", "hub"] as const;
type LolTab = (typeof TABS)[number];
interface Loaded { profile: LolProfile; matches: LolMatch[] }

const decimal = (value: number) => value.toFixed(1).replace(".", ",");
const hourFormat = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const riotQuery = (id: string) => {
  const parts = splitRiotId(id);
  return `name=${encodeURIComponent(parts?.name ?? "")}&tag=${encodeURIComponent(parts?.tag ?? "")}`;
};

function Items({ items, className = "" }: { items: LolItem[]; className?: string }) {
  return <span className={`lol-items ${className}`}>{items.map((item, index) => <img key={`${item.id ?? index}-${index}`} src={item.image} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />)}</span>;
}

function RankDisc({ text, label }: { text?: string; label: string }) {
  const rank = lolRank(text, lang);
  const size = 96;
  const radius = size / 2 - 3;
  return (
    <div>
      <small>{label}</small>
      <span className="rank-disc lol-disc" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} className="rank-track" />
          <motion.circle cx={size / 2} cy={size / 2} r={radius} className="rank-fill" stroke={rank.color} transform={`rotate(-90 ${size / 2} ${size / 2})`} initial={{ pathLength: 0 }} animate={{ pathLength: Math.min(rank.lp, 100) / 100 }} transition={{ duration: 0.7 }} />
        </svg>
        {rank.emblem && <img src={rank.emblem} alt="" />}
      </span>
      <b style={{ color: rank.color }}>{rank.name}</b>
      {rank.emblem && <small>{rank.lp} LP</small>}
    </div>
  );
}

function ProfileCard({ profile, matches, id }: { profile: LolProfile; matches: LolMatch[]; id: string }) {
  const [name, tag] = (profile.handle ?? id).split("#");
  const level = profile.segments?.[0]?.stats?.level?.value ?? 0;
  const favorite = topChampions(matches, 1)[0];
  return (
    <section className="eval-card eval-profile" aria-label={t("evalProfile")}>
      <header className="eval-account"><b>{name}<span>#{tag}</span></b>{profile.avatarUrl && <img className="lol-avatar" src={profile.avatarUrl} alt="" />}</header>
      <div className="eval-banner">
        {favorite ? <img src={championSplash(favorite.image)} alt="" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="eval-banner-empty" />}
        {level > 0 && <span className="eval-level">{level}</span>}
      </div>
      <div className="eval-ranks">
        <RankDisc text={profile.rankSolo} label="Solo" />
        <RankDisc text={profile.rankFlex} label="Flex" />
      </div>
    </section>
  );
}

function Summary({ matches }: { matches: LolMatch[] }) {
  const stats = lolStats(matches);
  return (
    <section className="eval-card eval-summary">
      <h2>{t("evalSummary")}</h2>
      <p>{t("evalOnMatches", { count: String(stats.count) })}</p>
      <dl>
        <div><dt>{t("evalWinRate")}</dt><dd>{decimal(stats.winRate)} %</dd></div>
        <div><dt>{t("evalRecord")}</dt><dd>{stats.wins}V – {stats.losses}D</dd></div>
        <div><dt>KDA</dt><dd>{decimal(stats.kda)}</dd></div>
        <div><dt>{tr("CS/min", "CS/min")}</dt><dd>{decimal(stats.csPerMin)}</dd></div>
        <div><dt>{tr("Dégâts/min", "Damage/min")}</dt><dd>{stats.damagePerMin}</dd></div>
      </dl>
    </section>
  );
}

function Champions({ matches }: { matches: LolMatch[] }) {
  const rows = topChampions(matches);
  return (
    <section className="eval-card eval-summary lol-champions">
      <h2>{tr("Champions", "Champions")}</h2>
      <ul>
        {rows.map((row) => <li key={row.name}><img src={row.image} alt="" /><span><b>{row.name}</b><small>{tr(`${row.games} parties`, `${row.games} games`)}</small></span><span><b>{row.winRate} %</b><small>KDA {decimal(row.kda)}</small></span></li>)}
      </ul>
    </section>
  );
}

function Session({ matches }: { matches: LolMatch[] }) {
  const session = lolSession(matches);
  if (session.length === 0) return null;
  const stats = lolStats(session);
  if (stats.count === 0) return null;
  return (
    <section className="eval-session" aria-label={t("evalSession")}>
      <div><small>{t("evalSession")}</small><b>{stats.wins}V – {stats.losses}D</b></div>
      <div><small>KDA</small><b>{decimal(stats.kda)}</b></div>
      <div><small>{tr("CS/min", "CS/min")}</small><b>{decimal(stats.csPerMin)}</b></div>
      <div><small>{tr("Dégâts/min", "Damage/min")}</small><b>{stats.damagePerMin}</b></div>
    </section>
  );
}

function MatchRow({ match, onOpen }: { match: LolMatch; onOpen: () => void }) {
  const line = lolLine(match);
  const data = match.metadata;
  const when = data?.timestamp ? hourFormat.format(new Date(data.timestamp)) : "";
  return (
    <motion.li variants={listItem}>
      <button type="button" className={`match-row ${line.won ? "win" : "loss"}`} onClick={onOpen}>
        {data?.agentImageUrl && <img className="match-map" src={championSplash(data.agentImageUrl)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
        {data?.agentImageUrl ? <img className="match-agent" src={data.agentImageUrl} alt={data.agentName ?? ""} title={data.agentName} onError={(event) => { if (data.agentImageFallback) event.currentTarget.src = data.agentImageFallback; }} /> : <span className="match-agent" />}
        <span className="match-result">
          <b><span>{line.won ? tr("Victoire", "Win") : tr("Défaite", "Loss")}</span> {line.score[0]} – {line.score[1]}</b>
          <small>{[data?.agentName, lolMode(data?.modeName, lang), when].filter(Boolean).join(" · ")}</small>
        </span>
        <Items items={line.items} className="match-mvp" />
        <span className="match-stat"><b>{line.kills} / {line.deaths} / {line.assists}</b></span>
        <span className="match-stat"><b>{decimal(line.kda)}</b></span>
        <span className="match-stat"><b>{line.cs}</b></span>
        <span className="match-stat wide"><b>{decimal(line.csPerMin)}</b></span>
        <span className="match-stat wide"><b>{line.damagePerMin}</b></span>
        <span className="match-stat"><b>{line.minutes > 0 ? `${line.minutes} min` : ""}</b></span>
      </button>
    </motion.li>
  );
}

function MatchColumns() {
  return (
    <li className="match-columns" aria-hidden="true">
      <span /><span>{tr("Partie", "Match")}</span><span>{tr("Objets", "Items")}</span><span>K / D / A</span><span>KDA</span><span>CS</span><span className="wide">{tr("CS/min", "CS/min")}</span><span className="wide">{tr("Dég./min", "Dmg/min")}</span><span>{tr("Durée", "Length")}</span>
    </li>
  );
}

function MatchPanel({ match, onClose }: { match: LolMatch; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const [view, setView] = useState<"board" | "analysis">("board");
  const line = lolLine(match);
  const mine = line.me?.stats;
  const data = match.metadata;
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <>
      <motion.div className="eval-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
      <motion.aside role="dialog" aria-label={data?.agentName} className="eval-panel lol-panel" initial={reduce ? { opacity: 0 } : { transform: "translateX(100%)" }} animate={reduce ? { opacity: 1 } : { transform: "translateX(0%)" }} exit={reduce ? { opacity: 0 } : { transform: "translateX(100%)" }} transition={SPRING_SWAP}>
        <header>
          {data?.agentImageUrl && <img src={championSplash(data.agentImageUrl)} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
          <div>
            <h2>{data?.agentName}</h2>
            <p>{lolMode(data?.modeName, lang)}{data?.timestamp ? `, ${dateFormat.format(new Date(data.timestamp))}` : ""}{line.minutes > 0 ? `, ${line.minutes} min` : ""}</p>
          </div>
          <button ref={close} type="button" className="icon-btn" aria-label={t("close")} onClick={onClose}><X size={18} /></button>
        </header>
        {mine && <div className="eval-panel-tabs"><Tabs id="lol-match" label={tr("Vue du match", "Match view")} value={view} onChange={setView} tabs={[{ id: "board", label: tr("Tableau", "Scoreboard") }, { id: "analysis", label: tr("Analyse", "Analysis") }]} /></div>}
        <div className="eval-board-scroll">
          {view === "analysis" && mine && (
            <dl className="eval-analysis">
              <div><dt>{tr("Participation aux éliminations", "Kill participation")}</dt><dd>{mine.killParticipation ?? 0} %</dd></div>
              <div><dt>{tr("Or/min", "Gold/min")}</dt><dd>{Math.round(mine.goldPerMin)}</dd></div>
              <div><dt>{tr("Dégâts/min", "Damage/min")}</dt><dd>{Math.round(mine.damagePerMin)}</dd></div>
              <div><dt>{tr("Dégâts subis/min", "Damage taken/min")}</dt><dd>{Math.round(mine.damageTakenPerMin ?? 0)}</dd></div>
              <div><dt>{tr("Dégâts aux objectifs", "Objective damage")}</dt><dd>{(mine.damageToObjectives ?? 0).toLocaleString(lang)}</dd></div>
              <div><dt>{tr("Score de vision", "Vision score")}</dt><dd>{mine.visionScore ?? 0}</dd></div>
              <div><dt>{tr("Balises posées", "Wards placed")}</dt><dd>{mine.wardsPlaced ?? 0}</dd></div>
              <div><dt>{tr("Contrôle infligé", "Crowd control")}</dt><dd>{mine.timeCCingOthers ?? 0} s</dd></div>
            </dl>
          )}
          {view === "board" && lolTeams(match).map((team) => (
            <table key={team.team} className={team.won ? "won" : "lost"}>
              <caption><b>{team.kills}</b>{t(team.won ? "evalTeamWon" : "evalTeamLost")}</caption>
              <thead><tr><th scope="col">{t("evalPlayer")}</th><th scope="col">K/D/A</th><th scope="col">CS</th><th scope="col">{tr("Dégâts", "Damage")}</th><th scope="col">{tr("Or", "Gold")}</th><th scope="col">{tr("Objets", "Items")}</th></tr></thead>
              <tbody>
                {team.players.map((player, index) => (
                  <tr key={`${player.name}-${index}`} className={player.isMe ? "me" : ""}>
                    <th scope="row">
                      <span>
                        {player.assets?.champion?.small && <img src={player.assets.champion.small} alt={player.character ?? ""} title={player.character} onError={(event) => { if (player.assets?.champion?.fallback) event.currentTarget.src = player.assets.champion.fallback; }} />}
                        <b>{player.name || player.character}</b>
                      </span>
                    </th>
                    <td>{player.stats?.kills}/{player.stats?.deaths}/{player.stats?.assists}</td>
                    <td>{player.stats?.cs}</td>
                    <td>{player.stats?.damage?.toLocaleString(lang)}</td>
                    <td>{player.stats?.gold?.toLocaleString(lang)}</td>
                    <td><Items items={(player.items ?? []).filter((item) => item.image)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      </motion.aside>
    </>,
    document.body,
  );
}

function PlayerSearch({ onSubmit }: { onSubmit: (id: string) => void }) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parts = splitRiotId(value);
    setInvalid(!parts);
    if (parts) {
      onSubmit(`${parts.name}#${parts.tag}`);
      setValue("");
    }
  };
  return (
    <form className="lol-search" onSubmit={submit}>
      <input value={value} spellCheck={false} autoComplete="off" placeholder={t("evalRiotPlaceholder")} aria-label={t("evalOtherPlayer")} aria-invalid={invalid} onChange={(event) => setValue(event.target.value)} />
      <Button type="submit" aria-label={t("evalSearch")} title={t("evalSearch")}><Search size={14} /></Button>
    </form>
  );
}

export default function LolPage() {
  const [stored, setTab] = usePersisted<string>("ethone-section-games", "profile");
  const tab: LolTab = (TABS as readonly string[]).includes(stored) ? (stored as LolTab) : "profile";
  const [own, setOwn] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<LolMatch | null>(null);
  const [connecting, setConnecting] = useState(false);
  const firstLoad = useRef(true);

  const load = useCallback(async (riotId: string, force = false) => {
    setError(null);
    const key = `lol:${riotId.toLowerCase()}`;
    const cached = await readCache<Loaded>(key);
    if (cached) setData(cached.value);
    else setData(null);
    if (!force && cached && Date.now() - cached.at < FRESH) return;
    setBusy(true);
    try {
      const query = riotQuery(riotId);
      const [profile, matches] = await Promise.all([apiData<LolProfile>(`api/stats/lol-profile?${query}`), apiData<LolMatch[]>(`api/stats/lol-matches?${query}`).catch(() => [] as LolMatch[])]);
      const next = { profile, matches: Array.isArray(matches) ? matches : [] };
      setData(next);
      writeCache(key, next);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  const readIdentity = useCallback(async () => {
    const identity = await riotStatus().catch(() => null);
    const mine = identity?.name && identity.tag ? `${identity.name}#${identity.tag}` : null;
    setOwn(mine);
    return mine;
  }, []);

  useEffect(() => {
    void readIdentity().then((mine) => {
      const start = mine ?? readJson<string>(ID_KEY);
      setReady(true);
      if (start) {
        setId(start);
        void load(start);
      }
    });
  }, [load, readIdentity]);

  useEffect(() => {
    const stop = listen<{ status: string; message: string | null }>("riot-login", ({ payload }) => {
      setConnecting(false);
      if (payload.status !== "linked") {
        if (payload.message) setError(payload.message);
        return;
      }
      void readIdentity().then((mine) => {
        if (!mine) return;
        setId(mine);
        void load(mine, true);
      });
    });
    return () => void stop.then((unlisten) => unlisten());
  }, [load, readIdentity]);

  const connect = () => {
    setConnecting(true);
    setError(null);
    riotLogin().catch((reason) => {
      setConnecting(false);
      setError(errorText(reason));
    });
  };

  const show = (riotId: string) => {
    setId(riotId);
    setOpen(null);
    setTab("profile");
    if (!own) write(ID_KEY, JSON.stringify(riotId));
    firstLoad.current = true;
    void load(riotId);
  };

  const matches = useMemo(() => data?.matches ?? [], [data]);
  useEffect(() => {
    if (matches.length > 0) firstLoad.current = false;
  }, [matches]);

  if (!ready) return <Skeletons count={4} height={70} />;
  if (!id) {
    return (
      <div className="eval-connect">
        <LeagueMark size={44} />
        <h1>E:LOL</h1>
        <p>{tr("Relie ton compte Riot ou cherche un joueur pour voir son rang et ses parties.", "Link your Riot account or search a player to see their rank and games.")}</p>
        <div className="eval-connect-actions"><Button variant="primary" disabled={connecting} onClick={connect}><ExternalLink size={15} />{tr("Se connecter avec Riot", "Sign in with Riot")}</Button></div>
        {connecting && <p role="status">{t("evalConnecting")}</p>}
        {error && <p className="bad" role="alert">{error}</p>}
        <RiotIdForm onSubmit={(name, tag) => show(`${name}#${tag}`)} />
      </div>
    );
  }

  return (
    <>
      <div className="eval-tabs-row">
        <Tabs id="lol" label="E:LOL" value={tab} onChange={setTab} tabs={[{ id: "profile", label: tr("Profil", "Profile") }, { id: "tft", label: "TFT" }, { id: "rotation", label: tr("Rotation", "Rotation") }, { id: "hub", label: tr("Amis", "Friends") }]} />
      </div>
      {tab === "tft" && <TftView />}
      {tab === "rotation" && <RotationView />}
      {tab === "hub" && <Friends game="lol" linked={Boolean(own)} account={null} connecting={connecting} onConnect={connect} onOpen={show} />}
      {tab === "profile" && (
        <div className="eval-grid" inert={Boolean(open)}>
          <div className="eval-side">
            {data ? <ProfileCard profile={data.profile} matches={matches} id={id} /> : <Skeletons count={1} height={280} />}
            {matches.length > 0 && <Summary matches={matches} />}
            {matches.length > 0 && <Champions matches={matches} />}
          </div>
          <div className="eval-main">
            <div className="eval-head">
              <h1>{t("evalMatches")}</h1>
              <div className="row">
                {own && id !== own && <Button onClick={() => show(own)}><UserRound size={14} />{tr("Mon profil", "My profile")}</Button>}
                <PlayerSearch onSubmit={show} />
                <Button disabled={busy} onClick={() => void load(id, true)}><RefreshCw size={14} className={busy ? "spin" : ""} />{t("refresh")}</Button>
              </div>
            </div>
            {error && <ErrorBox message={error} onRetry={() => void load(id, true)} />}
            {!data && !error && <Skeletons count={6} height={58} />}
            {data && matches.length === 0 && !busy && <div className="eval-card eval-empty"><Star size={22} /><h2>{t("evalNoMatches")}</h2><p>{tr("Aucune partie récente trouvée pour ce joueur.", "No recent games found for this player.")}</p></div>}
            {matches.length > 0 && (
              <>
                <Session matches={matches} />
                <motion.ul className="eval-matches" variants={listStagger} initial={firstLoad.current ? "initial" : false} animate="animate" transition={SPRING_SWAP}>
                  <MatchColumns />
                  {matches.map((match, position) => {
                    const at = match.metadata?.timestamp;
                    const before = matches[position - 1]?.metadata?.timestamp;
                    const newDay = at && (!before || new Date(before).toDateString() !== new Date(at).toDateString());
                    return (
                      <Fragment key={match.id}>
                        {newDay && <li className="match-day">{dayLabel(at)}</li>}
                        <MatchRow match={match} onOpen={() => setOpen(match)} />
                      </Fragment>
                    );
                  })}
                </motion.ul>
              </>
            )}
          </div>
        </div>
      )}
      <AnimatePresence>{open && <MatchPanel key={open.id} match={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}
