import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { ExternalLink, RefreshCw, Search, Star, UserRound, X } from "lucide-react";
import { apiData, riotLogin, riotStatus } from "./api";
import { cached, readCache, writeCache } from "./cache";
import { splitRiotId } from "./eval";
import { Friends } from "./EvalHub";
import { errorText, lang, t, tr } from "./i18n";
import { MatchCard, MatchFilters, ErrorBox, Skeletons, Tabs } from "./kit";
import { keepMatch, MatchFilter, NO_FILTER, options } from "./match-filter";
import { lolLiveMode, addLpPoint, LolAssets, LolLiveGame, LpPoint, parseLolAssets, championSplash, LolItem, lolLine, LolMatch, lolMode, LolProfile, lolRank, lolSession, lolStats, lolTeams, topChampions } from "./lol";
import { listStagger, SPRING_SWAP } from "./motion";
import { RotationView } from "./MorePages";
import { usePersisted } from "./qol";
import { readJson, write } from "./settings";
import TftView from "./TftView";
import { RiotIdForm } from "./TrackerPage";
import { Button, LeagueMark } from "./ui";

const ID_KEY = "ethone-lol-id";
const FRESH = 5 * 60 * 1000;
const TABS = ["profile", "live", "tft", "rotation", "hub"] as const;
type LolTab = (typeof TABS)[number];
interface Loaded { profile: LolProfile; matches: LolMatch[] }

const decimal = (value: number) => value.toFixed(1).replace(".", ",");
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

function useLolAssets() {
  const [assets, setAssets] = useState<LolAssets | null>(null);
  useEffect(() => {
    let active = true;
    void cached("lol-assets", 86400000, async () => {
      const [summoner, runes, champions] = await Promise.all(["summoner", "runesReforged", "champion"].map((file) => invoke<unknown>("ddragon_get", { file })));
      return parseLolAssets(summoner as Parameters<typeof parseLolAssets>[0], runes as Parameters<typeof parseLolAssets>[1], champions as Parameters<typeof parseLolAssets>[2]);
    }).then((value) => active && setAssets(value), () => null);
    return () => {
      active = false;
    };
  }, []);
  return assets;
}

function Icons({ ids, table, className = "lol-icons" }: { ids: (number | undefined)[]; table?: Record<string, { image?: string; name?: string }>; className?: string }) {
  const rows = ids.flatMap((id) => (id && table?.[String(id)]?.image ? [{ id, ...table[String(id)] }] : []));
  return rows.length ? <span className={className}>{rows.map((row, index) => <img key={`${row.id}-${index}`} src={row.image} alt={row.name ?? ""} title={row.name} />)}</span> : null;
}

function LiveView({ id, assets, onOpen }: { id: string | null; assets: LolAssets | null; onOpen: (player: string) => void }) {
  const [game, setGame] = useState<LolLiveGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!id) return;
    let active = true;
    const load = () => apiData<LolLiveGame>(`api/stats/lol-live?${riotQuery(id)}`).then((value) => {
      if (!active) return;
      setGame(value);
      setError(null);
    }, (reason) => active && setError(errorText(reason)));
    void load();
    const poll = setInterval(() => void load(), 30000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [id]);
  if (!id) return <div className="eval-card eval-empty"><h2>{tr("Aucun joueur", "No player")}</h2></div>;
  if (error) return <ErrorBox message={error} />;
  if (!game) return <Skeletons count={3} height={58} />;
  if (!game.active) return <div className="eval-card eval-empty"><Star size={22} /><h2>{tr("Pas en partie", "Not in a game")}</h2><p>{tr(`${id} n'est pas en partie pour le moment. Cette page se met à jour toutes les 30 secondes.`, `${id} is not in a game right now. This page refreshes every 30 seconds.`)}</p></div>;
  const seconds = game.startedAt ? Math.max(0, Math.floor((now - game.startedAt) / 1000)) : game.length ?? 0;
  return (
    <div className="lol-live">
      <header className="eval-head"><h1>{lolLiveMode(game.mode, game.queueId, lang === "fr" ? "fr" : "en") || tr("Partie en cours", "Game in progress")}</h1><span className="muted">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span></header>
      <div className="lol-live-teams">
        {["Blue", "Red"].map((team) => (
          <section key={team} className={`lol-live-team ${team.toLowerCase()}`}>
            <h2>{team === "Blue" ? tr("Équipe bleue", "Blue team") : tr("Équipe rouge", "Red team")}</h2>
            <ul>
              {(game.players ?? []).filter((player) => player.team === team).map((player) => (
                <li key={`${player.name}#${player.tag}`} className={player.isMe ? "me" : ""}>
                  <button type="button" disabled={!player.tag} onClick={() => onOpen(`${player.name}#${player.tag}`)}>
                    {assets?.champions[String(player.championId)]?.image ? <img className="lol-live-champ" src={assets.champions[String(player.championId)].image} alt="" /> : <span className="lol-live-champ" />}
                    <span><b>{player.name}</b><small>{assets?.champions[String(player.championId)]?.name ?? ""}</small></span>
                    <Icons ids={player.spells} table={assets?.spells} />
                    <Icons ids={[player.keystone, player.secondary]} table={assets?.runes} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function LpHistory({ points }: { points: LpPoint[] }) {
  if (points.length === 0) return null;
  const low = Math.min(...points.map((point) => point.score));
  const high = Math.max(...points.map((point) => point.score));
  const recent = points.slice(-40);
  const changes = points.slice(-5).reverse();
  return (
    <section className="eval-card lol-lp">
      <h2>{tr("Historique des LP", "LP history")}</h2>
      <p className="muted small">{tr(`${points.length} relevé(s) sur ce PC, à chaque ouverture d'E:LOL`, `${points.length} reading(s) on this PC, each time E:LOL opens`)}</p>
      {points.length > 1 && <div className="lol-lp-bars" aria-hidden="true">{recent.map((point) => <i key={point.at} title={point.rank} style={{ height: `${high === low ? 50 : 10 + ((point.score - low) / (high - low)) * 90}%` }} />)}</div>}
      <ul>{changes.map((point, index) => {
        const before = points[points.length - 1 - index - 1];
        const delta = before ? point.score - before.score : 0;
        return <li key={point.at}><span>{lolRank(point.rank, lang === "fr" ? "fr" : "en").name} {lolRank(point.rank, lang === "fr" ? "fr" : "en").lp} LP</span>{before && <b className={delta >= 0 ? "ok" : "bad"}>{delta >= 0 ? "+" : ""}{delta}</b>}<small className="muted">{new Date(point.at).toLocaleDateString(lang, { day: "numeric", month: "short" })}</small></li>;
      })}</ul>
    </section>
  );
}

function MatchRow({ match, assets, onOpen }: { match: LolMatch; assets: LolAssets | null; onOpen: () => void }) {
  const line = lolLine(match);
  const data = match.metadata;
  return (
    <MatchCard
      mode={lolMode(data?.modeName, lang)}
      at={data?.timestamp}
      headIcon={<LeagueMark size={22} />}
      banner={data?.agentImageUrl ? championSplash(data.agentImageUrl) : undefined}
      portrait={data?.agentImageUrl}
      round
      onPortraitError={(element) => { if (data?.agentImageFallback && element.src !== data.agentImageFallback) element.src = data.agentImageFallback; }}
      title={data?.agentName ?? ""}
      chips={<><Icons ids={[line.me?.rune?.id]} table={assets?.runes} className="match-card-items" /><Icons ids={(line.me?.spells ?? []).map((spell) => spell.id)} table={assets?.spells} className="match-card-items" /><Items items={line.items} className="match-card-items" /></>}
      result={line.remake ? "draw" : line.won ? "win" : "loss"}
      resultLabel={line.remake ? tr("Remake", "Remake") : undefined}
      kda={`${line.kills} / ${line.deaths} / ${line.assists}`}
      middle={`${line.cs} CS`}
      last={line.minutes > 0 ? `${line.score[0]} — ${line.score[1]} · ${line.minutes} min` : `${line.score[0]} — ${line.score[1]}`}
      onOpen={onOpen}
    />
  );
}

function MatchPanel({ match, assets, onClose }: { match: LolMatch; assets: LolAssets | null; onClose: () => void }) {
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
              <caption><b>{team.kills}</b>{t(team.won ? "evalTeamWon" : "evalTeamLost")}{(() => {
                const objectives = match.scoreboard?.teams?.[team.team];
                return objectives ? <small className="lol-objectives">{tr(`${objectives.towers ?? 0} tours, ${objectives.dragons ?? 0} dragons, ${objectives.barons ?? 0} barons`, `${objectives.towers ?? 0} towers, ${objectives.dragons ?? 0} dragons, ${objectives.barons ?? 0} barons`)}</small> : null;
              })()}</caption>
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
                    <td><span className="lol-loadout"><Icons ids={[player.rune?.id]} table={assets?.runes} /><Icons ids={(player.spells ?? []).map((spell) => spell.id)} table={assets?.spells} /><Items items={(player.items ?? []).filter((item) => item.image)} /></span></td>
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
  const assets = useLolAssets();
  const [lpPoints, setLpPoints] = useState<LpPoint[]>(() => readJson<LpPoint[]>("ethone-lol-lp") ?? []);
  const [filter, setFilter] = useState<MatchFilter>(NO_FILTER);

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
  const shownMatches = matches.filter((match) => keepMatch(filter, { won: lolLine(match).won, draw: lolLine(match).remake, mode: lolMode(match.metadata?.modeName, lang), pick: match.metadata?.agentName ?? "" }));
  useEffect(() => {
    if (!own || id !== own || !data?.profile) return;
    setLpPoints((current) => {
      const next = addLpPoint(current, data.profile.rankSolo, Date.now());
      if (next !== current) write("ethone-lol-lp", JSON.stringify(next));
      return next;
    });
  }, [own, id, data]);
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
        <Tabs id="lol" label="E:LOL" value={tab} onChange={setTab} tabs={[{ id: "profile", label: tr("Profil", "Profile") }, { id: "live", label: tr("En direct", "Live") }, { id: "tft", label: "TFT" }, { id: "rotation", label: tr("Rotation", "Rotation") }, { id: "hub", label: tr("Amis", "Friends") }]} />
      </div>
      {tab === "live" && <LiveView id={id} assets={assets} onOpen={(player) => { setTab("profile"); show(player); }} />}
      {tab === "tft" && <TftView />}
      {tab === "rotation" && <RotationView />}
      {tab === "hub" && <Friends game="lol" linked={Boolean(own)} account={null} connecting={connecting} onConnect={connect} onOpen={show} />}
      {tab === "profile" && (
        <div className="eval-grid" inert={Boolean(open)}>
          <div className="eval-side">
            {data ? <ProfileCard profile={data.profile} matches={matches} id={id} /> : <Skeletons count={1} height={280} />}
            {matches.length > 0 && <Summary matches={matches} />}
            {id === own && <LpHistory points={lpPoints} />}
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
                <MatchFilters filter={filter} onChange={setFilter} modes={options(matches.map((match) => lolMode(match.metadata?.modeName, lang)))} picks={options(matches.map((match) => match.metadata?.agentName ?? ""))} pickLabel={tr("Tous les champions", "All champions")} shown={shownMatches.length} total={matches.length} />
                <motion.ul className="eval-matches" variants={listStagger} initial={firstLoad.current ? "initial" : false} animate="animate" transition={SPRING_SWAP}>
                  {shownMatches.map((match) => <MatchRow key={match.id} match={match} assets={assets} onOpen={() => setOpen(match)} />)}
                </motion.ul>
              </>
            )}
          </div>
        </div>
      )}
      <AnimatePresence>{open && <MatchPanel key={open.id} match={open} assets={assets} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}
