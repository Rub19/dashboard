import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { catalogGet, riotCall, riotStatus } from "./api";
import { agentIcon, modeName, rankColor, rankName, tierIcon } from "./eval";
import { lang, tr } from "./i18n";
import { Drawer, Empty, Skeletons } from "./kit";
import { listItem, listStagger } from "./motion";

interface RawPlayer { Subject: string; TeamID?: string; CharacterID?: string; CharacterSelectionState?: string; PlayerIdentity?: { PlayerCardID?: string; AccountLevel?: number; HideAccountLevel?: boolean } }
interface RawCore { Players?: RawPlayer[]; MapID?: string; MatchmakingData?: { QueueID?: string } }
interface RawPre { AllyTeam?: { TeamID?: string; Players?: RawPlayer[] }; EnemyTeam?: { TeamID?: string; Players?: RawPlayer[] } | null; MapID?: string; QueueID?: string; PhaseTimeRemainingNS?: number; EnemyTeamLockCount?: number; EnemyTeamSize?: number }
interface Rank { tier: number; rr: number; peak: number }
interface Stats { kd: number; hs: number; games: number; wins: number }
interface LiveMatch { id: string; pregame: boolean; map: string; queue: string; endsAt: number | null; players: RawPlayer[]; myTeam: string; enemyLocks: number; enemySize: number }

const SKIN_SOCKET = "3ad1b2b2-acdb-4524-852f-954a76ddae0a";
const MEDIA = "https://media.valorant-api.com";

async function fetchLive(puuid: string): Promise<LiveMatch | null> {
  const core = await riotCall<{ MatchID: string }>("/core-game/v1/players/{puuid}", { host: "glz" }).catch(() => null);
  if (core) {
    const data = await riotCall<RawCore>(`/core-game/v1/matches/${core.MatchID}`, { host: "glz" }).catch(() => null);
    if (data) {
      const players = data.Players ?? [];
      return { id: core.MatchID, pregame: false, map: data.MapID ?? "", queue: data.MatchmakingData?.QueueID ?? "", endsAt: null, players, myTeam: players.find((player) => player.Subject.toLowerCase() === puuid)?.TeamID ?? "Blue", enemyLocks: 0, enemySize: 0 };
    }
  }
  const pre = await riotCall<{ MatchID: string }>("/pregame/v1/players/{puuid}", { host: "glz" }).catch(() => null);
  if (!pre) return null;
  const data = await riotCall<RawPre>(`/pregame/v1/matches/${pre.MatchID}`, { host: "glz" }).catch(() => null);
  if (!data) return null;
  const team = data.AllyTeam?.TeamID ?? "Blue";
  const players = [...(data.AllyTeam?.Players ?? []).map((player) => ({ ...player, TeamID: team })), ...(data.EnemyTeam?.Players ?? []).map((player) => ({ ...player, TeamID: data.EnemyTeam?.TeamID ?? "Red" }))];
  const left = (data.PhaseTimeRemainingNS ?? 0) / 1e9;
  return { id: pre.MatchID, pregame: true, map: data.MapID ?? "", queue: data.QueueID ?? "", endsAt: left > 0 ? Date.now() + left * 1000 : null, players, myTeam: team, enemyLocks: data.EnemyTeamLockCount ?? 0, enemySize: data.EnemyTeamSize ?? 0 };
}

async function fetchRank(id: string): Promise<Rank | null> {
  const data = await riotCall<{ LatestCompetitiveUpdate?: { TierAfterUpdate?: number; RankedRatingAfterUpdate?: number }; QueueSkills?: { competitive?: { SeasonalInfoBySeasonID?: Record<string, { WinsByTier?: Record<string, number> | null }> | null } } }>(`/mmr/v1/players/${id}`).catch(() => null);
  if (!data) return null;
  const tier = data.LatestCompetitiveUpdate?.TierAfterUpdate ?? 0;
  const peak = Object.values(data.QueueSkills?.competitive?.SeasonalInfoBySeasonID ?? {}).flatMap((season) => Object.keys(season.WinsByTier ?? {})).map(Number).reduce((best, value) => Math.max(best, value), tier);
  return { tier, rr: data.LatestCompetitiveUpdate?.RankedRatingAfterUpdate ?? 0, peak };
}

interface RawDetails { players?: { subject: string; teamId?: string; stats?: { kills?: number; deaths?: number } }[]; teams?: { teamId: string; won?: boolean }[]; roundResults?: { playerStats?: { subject: string; damage?: { headshots?: number; bodyshots?: number; legshots?: number }[] }[] }[] }

async function fetchStats(id: string, cache: Map<string, RawDetails>): Promise<Stats | null> {
  const history = await riotCall<{ History?: { MatchID: string }[] }>(`/match-history/v1/history/${id}?startIndex=0&endIndex=3`).catch(() => null);
  const games = history?.History ?? [];
  if (games.length === 0) return null;
  let kills = 0;
  let deaths = 0;
  let head = 0;
  let shots = 0;
  let wins = 0;
  let count = 0;
  for (const game of games) {
    let details = cache.get(game.MatchID);
    if (!details) {
      details = (await riotCall<RawDetails>(`/match-details/v1/matches/${game.MatchID}`).catch(() => null)) ?? undefined;
      if (details) cache.set(game.MatchID, details);
    }
    const me = details?.players?.find((player) => player.subject === id);
    if (!details || !me) continue;
    count++;
    kills += me.stats?.kills ?? 0;
    deaths += me.stats?.deaths ?? 0;
    if (details.teams?.find((team) => team.teamId === me.teamId)?.won) wins++;
    for (const round of details.roundResults ?? []) {
      for (const hit of round.playerStats?.find((stat) => stat.subject === id)?.damage ?? []) {
        head += hit.headshots ?? 0;
        shots += (hit.headshots ?? 0) + (hit.bodyshots ?? 0) + (hit.legshots ?? 0);
      }
    }
  }
  return count ? { kd: kills / Math.max(1, deaths), hs: shots ? Math.round((head / shots) * 100) : 0, games: count, wins } : null;
}

function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  return <span className="live-timer" role="timer"><Clock size={14} />{Math.max(0, Math.round((endsAt - now) / 1000))} s</span>;
}

function PlayerRow({ player, me, name, rank, stats, onOpen }: { player: RawPlayer; me: boolean; name?: { name: string; tag: string }; rank?: Rank | null; stats?: Stats | null; onOpen: () => void }) {
  const locked = (player.CharacterSelectionState ?? "locked").toLowerCase() === "locked";
  const level = player.PlayerIdentity?.HideAccountLevel ? null : player.PlayerIdentity?.AccountLevel;
  return (
    <motion.li variants={listItem}>
      <button type="button" className={`live-row ${me ? "me" : ""}`} onClick={onOpen}>
        <span className={`live-agent ${locked ? "" : "picking"}`}>{player.CharacterID ? <img src={agentIcon(player.CharacterID.toLowerCase())} alt="" /> : <i />}</span>
        <span className="live-name"><b>{name?.name || tr("Joueur masqué", "Hidden player")}{name?.tag && <small>#{name.tag}</small>}</b><small>{level ? tr(`Niveau ${level}`, `Level ${level}`) : " "}</small></span>
        <span className="live-rank">{(rank?.tier ?? 0) > 0 && <img src={tierIcon(rank?.tier ?? 0)} alt="" />}<span><b style={{ color: rankColor(rank?.tier ?? 0) }}>{rank === undefined ? "…" : rankName(rank?.tier ?? 0)}</b><small>{(rank?.tier ?? 0) > 0 ? `${rank?.rr} RR` : " "}</small></span></span>
        <span className="live-peak" title={tr("Meilleur rang", "Peak rank")}>{(rank?.peak ?? 0) > 0 && <img src={tierIcon(rank?.peak ?? 0)} alt={rankName(rank?.peak ?? 0)} />}</span>
        <span className="live-stat"><b>{stats ? stats.kd.toFixed(1).replace(".", ",") : "–"}</b><small>K/D</small></span>
        <span className="live-stat"><b>{stats ? `${stats.hs} %` : "–"}</b><small>{tr("Tête", "HS")}</small></span>
      </button>
    </motion.li>
  );
}

export default function EvalLive({ linked, onConnect }: { linked: boolean; onConnect: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [match, setMatch] = useState<LiveMatch | null | undefined>(undefined);
  const [me, setMe] = useState("");
  const [names, setNames] = useState<Record<string, { name: string; tag: string }>>({});
  const [ranks, setRanks] = useState<Record<string, Rank | null>>({});
  const [stats, setStats] = useState<Record<string, Stats | null>>({});
  const [maps, setMaps] = useState<{ displayName: string; mapUrl?: string; splash?: string }[]>([]);
  const [open, setOpen] = useState<RawPlayer | null>(null);
  const [skins, setSkins] = useState<Record<string, Record<string, string>>>({});
  const [weapons, setWeapons] = useState<{ uuid: string; displayName: string }[]>([]);
  const details = useRef(new Map<string, RawDetails>());
  const loadedFor = useRef("");

  useEffect(() => {
    if (!linked) return;
    let active = true;
    catalogGet<typeof maps>("/maps").then((value) => active && setMaps(value), () => null);
    catalogGet<typeof weapons>("/weapons?language=fr-FR").then((value) => active && setWeapons(value), () => null);
    const tick = async () => {
      if (root.current && !root.current.offsetParent) return;
      const identity = await riotStatus().catch(() => null);
      const puuid = identity?.puuid.toLowerCase() ?? "";
      if (!active) return;
      setMe(puuid);
      setMatch(await fetchLive(puuid));
    };
    void tick();
    const timer = setInterval(() => void tick(), 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [linked]);

  useEffect(() => {
    if (!match || loadedFor.current === match.id) return;
    loadedFor.current = match.id;
    const ids = match.players.map((player) => player.Subject);
    riotCall<{ Subject: string; GameName: string; TagLine: string }[]>("/name-service/v2/players", { method: "PUT", body: ids }).then((rows) => setNames((current) => ({ ...current, ...Object.fromEntries(rows.filter((row) => row.GameName).map((row) => [row.Subject, { name: row.GameName, tag: row.TagLine }])) })), () => null);
    void (async () => {
      for (const id of ids) {
        const rank = await fetchRank(id);
        setRanks((current) => ({ ...current, [id]: rank }));
      }
      for (const id of ids) {
        const value = await fetchStats(id, details.current);
        setStats((current) => ({ ...current, [id]: value }));
      }
    })();
    riotCall<{ Loadouts?: { Subject?: string; Loadout?: { Subject?: string; Items?: Record<string, { Sockets?: Record<string, { Item?: { ID?: string } }> }> }; Items?: Record<string, { Sockets?: Record<string, { Item?: { ID?: string } }> }> }[] }>(match.pregame ? `/pregame/v1/matches/${match.id}/loadouts` : `/core-game/v1/matches/${match.id}/loadouts`, { host: "glz" }).then((data) => {
      const out: Record<string, Record<string, string>> = {};
      for (const entry of data.Loadouts ?? []) {
        const loadout = entry.Loadout ?? entry;
        if (!loadout.Subject) continue;
        out[loadout.Subject] = Object.fromEntries(Object.entries(loadout.Items ?? {}).flatMap(([weapon, item]) => (item.Sockets?.[SKIN_SOCKET]?.Item?.ID ? [[weapon.toLowerCase(), item.Sockets[SKIN_SOCKET].Item.ID as string]] : [])));
      }
      setSkins(out);
    }, () => null);
  }, [match]);

  if (!linked) return <div ref={root}><Empty title={tr("Compte Riot non connecté", "Riot account not linked")} text={tr("La vue en direct vient de ton compte Riot.", "The live view comes from your Riot account.")} action={<button type="button" className="btn primary" onClick={onConnect}>{tr("Connecter mon compte Riot", "Link my Riot account")}</button>} /></div>;
  if (match === undefined) return <div ref={root}><Skeletons count={5} height={56} /></div>;
  if (match === null) return <div ref={root}><Empty title={tr("Aucune partie en cours", "No match in progress")} text={tr("Lance une partie de VALORANT : les joueurs, leurs rangs et leurs statistiques apparaissent ici tout seuls.", "Start a VALORANT match: players, their ranks and stats show up here on their own.")} /></div>;

  const map = maps.find((item) => item.mapUrl?.toLowerCase() === match.map.toLowerCase());
  const allies = match.players.filter((player) => player.TeamID === match.myTeam);
  const enemies = match.players.filter((player) => player.TeamID !== match.myTeam);
  const nameOf = (player: RawPlayer) => names[player.Subject];
  const team = (title: string, players: RawPlayer[], tone: string) => (
    <section className={`live-team ${tone}`}>
      <h2>{title}</h2>
      <motion.ul variants={listStagger} initial="initial" animate="animate">
        {players.map((player) => <PlayerRow key={player.Subject} player={player} me={player.Subject.toLowerCase() === me} name={nameOf(player)} rank={ranks[player.Subject]} stats={stats[player.Subject]} onOpen={() => setOpen(player)} />)}
      </motion.ul>
    </section>
  );
  const openSkins = open ? skins[open.Subject] ?? {} : {};
  return (
    <div className="live" ref={root}>
      <header className="live-hero">
        {map?.splash && <img src={map.splash} alt="" />}
        <div>
          <span className="live-dot">{match.pregame ? tr("Sélection des agents", "Agent select") : tr("En direct", "Live")}</span>
          <h1>{map?.displayName ?? tr("Partie en cours", "Match in progress")}</h1>
          <p>{match.queue ? modeName(match.queue) : ""}</p>
        </div>
        {match.endsAt && <Countdown endsAt={match.endsAt} />}
      </header>
      <div className="live-teams">
        {team(tr("Ton équipe", "Your team"), allies, "ally")}
        {enemies.length > 0 ? team(tr("Adversaires", "Enemies"), enemies, "enemy") : match.pregame && <section className="live-team enemy"><h2>{tr("Adversaires", "Enemies")}</h2><p className="eval-soft">{tr(`${match.enemyLocks} sur ${match.enemySize} agents verrouillés.`, `${match.enemyLocks} of ${match.enemySize} agents locked.`)}</p></section>}
      </div>
      <Drawer open={Boolean(open)} title={open && nameOf(open)?.name ? `${nameOf(open)?.name}#${nameOf(open)?.tag}` : tr("Joueur masqué", "Hidden player")} onClose={() => setOpen(null)} width={640}>
        {open && stats[open.Subject] && <p className="eval-soft">{tr(`${stats[open.Subject]?.wins} victoires sur ses ${stats[open.Subject]?.games} dernières parties.`, `${stats[open.Subject]?.wins} wins in the last ${stats[open.Subject]?.games} games.`)}</p>}
        <h3>{tr("Équipement", "Loadout")}</h3>
        {Object.keys(openSkins).length === 0 ? <p className="eval-soft">{tr("Riot ne donne pas l'équipement de ce joueur pour l'instant.", "Riot doesn't provide this player's loadout right now.")}</p> : (
          <ul className="eval-skins">
            {Object.entries(openSkins).map(([weapon, chroma]) => <li key={weapon}><img src={`${MEDIA}/weaponskinchromas/${chroma}/fullrender.png`} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = `${MEDIA}/weaponskinchromas/${chroma}/displayicon.png`; }} /><small>{weapons.find((item) => item.uuid.toLowerCase() === weapon)?.displayName}</small></li>)}
          </ul>
        )}
        <p className="eval-soft small">{new Date().toLocaleTimeString(lang)}</p>
      </Drawer>
    </div>
  );
}
