export interface LolItem { id?: number; image?: string; name?: string }

export interface LolPlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  damage: number;
  damagePerMin: number;
  damageTakenPerMin?: number;
  damageToObjectives?: number;
  gold: number;
  goldPerMin: number;
  killParticipation?: number;
  timeCCingOthers?: number;
  visionScore?: number;
  wardsPlaced?: number;
}

export interface LolAsset { id?: number; image?: string; name?: string }
export interface LolAssets { spells: Record<string, LolAsset>; runes: Record<string, LolAsset>; champions: Record<string, LolAsset> }

interface DragonFile { version?: string; data?: Record<string, { key?: string; name?: string; image?: { full?: string } }> }
interface RuneRow { id?: number; name?: string; icon?: string; slots?: { runes?: RuneRow[] }[] }

export function parseLolAssets(summoner: DragonFile, runes: RuneRow[], champions: DragonFile): LolAssets {
  const dragon = "https://ddragon.leagueoflegends.com/cdn";
  const table = (file: DragonFile, folder: string) => Object.fromEntries(Object.values(file.data ?? {}).flatMap((item) => (item.key && item.image?.full ? [[item.key, { name: item.name, image: `${dragon}/${file.version}/img/${folder}/${item.image.full}` }]] : [])));
  const runeTable: Record<string, LolAsset> = {};
  const addRune = (rune: RuneRow) => {
    if (rune.id && rune.icon) runeTable[String(rune.id)] = { name: rune.name, image: `${dragon}/img/${rune.icon}` };
  };
  for (const path of runes) {
    addRune(path);
    for (const slot of path.slots ?? []) (slot.runes ?? []).forEach(addRune);
  }
  return { spells: table(summoner, "spell"), runes: runeTable, champions: table(champions, "champion") };
}

const LADDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 };

export function lpScore(text: string | undefined): number | null {
  const found = /^([A-Z]+)(?:\s+([IV]+))?\s*(?:\((\d+)\s*LP\))?/.exec((text ?? "").trim());
  const tier = found ? LADDER.indexOf(found[1]) : -1;
  if (!found || tier < 0) return null;
  return tier * 400 + (DIVISIONS[found[2] ?? ""] ?? 0) * 100 + Number(found[3] ?? 0);
}

export interface LpPoint { at: number; rank: string; score: number }

const LP_SPIKE = 100;

export function cleanLpPoints(points: LpPoint[]): LpPoint[] {
  const kept = points.filter((point, index) => {
    const before = points[index - 1];
    const after = points[index + 1];
    return !(before && after && before.score === after.score && Math.abs(point.score - before.score) >= LP_SPIKE);
  });
  return kept.filter((point, index) => point.score !== kept[index - 1]?.score);
}

export function keepKnownMatches<T>(fresh: T[] | null, known: T[] | undefined): { matches: T[]; stale: boolean } {
  if (fresh && fresh.length > 0) return { matches: fresh, stale: false };
  if (known && known.length > 0) return { matches: known, stale: true };
  return { matches: fresh ?? [], stale: fresh === null };
}

export function addLpPoint(points: LpPoint[], rank: string | undefined, at: number): LpPoint[] {
  const score = lpScore(rank);
  if (score === null || !rank || points.at(-1)?.score === score) return points;
  return [...points, { at, rank, score }].slice(-200);
}

export interface LolLiveGame {
  active: boolean;
  mode?: string;
  queueId?: number;
  startedAt?: number;
  length?: number;
  players?: { name: string; tag: string; team: string; isMe: boolean; championId: number; spells: number[]; keystone: number; secondary: number }[];
  bans?: { championId: number; team: string }[];
}

export interface LolPlayer {
  assets?: { champion?: { small?: string; fallback?: string } };
  character?: string;
  isMe?: boolean;
  items?: LolItem[];
  spells?: LolItem[];
  rune?: LolItem;
  level?: number;
  name?: string;
  position?: string;
  stats?: LolPlayerStats;
  tag?: string;
  team?: string;
  win?: boolean;
}

export interface LolMatch {
  id: string;
  metadata?: {
    agentImageFallback?: string;
    agentImageUrl?: string;
    agentName?: string;
    gameDuration?: string;
    mapName?: string;
    modeName?: string;
    result?: string;
    score?: { team?: number; opponent?: number };
    timestamp?: string;
  };
  scoreboard?: { duration?: number; players?: LolPlayer[]; teams?: Record<string, { kills?: number; won?: boolean; towers?: number; dragons?: number; barons?: number; riftHeralds?: number }> };
  segments?: { stats?: Record<string, { value?: number }> }[];
}

export interface LolProfile {
  avatarUrl?: string;
  handle?: string;
  rankFlex?: string;
  rankSolo?: string;
  segments?: { stats?: Record<string, { value?: number; displayValue?: string }> }[];
}

const TIERS: Record<string, { fr: string; en: string; color: string }> = {
  IRON: { fr: "Fer", en: "Iron", color: "#8d7f78" },
  BRONZE: { fr: "Bronze", en: "Bronze", color: "#b17a52" },
  SILVER: { fr: "Argent", en: "Silver", color: "#a6b5c2" },
  GOLD: { fr: "Or", en: "Gold", color: "#e3b341" },
  PLATINUM: { fr: "Platine", en: "Platinum", color: "#3fb8a9" },
  EMERALD: { fr: "Émeraude", en: "Emerald", color: "#2ecc71" },
  DIAMOND: { fr: "Diamant", en: "Diamond", color: "#6fa8ff" },
  MASTER: { fr: "Maître", en: "Master", color: "#b266ff" },
  GRANDMASTER: { fr: "Grand Maître", en: "Grandmaster", color: "#ff5a5f" },
  CHALLENGER: { fr: "Challenger", en: "Challenger", color: "#f4d35e" },
};

const MODES: Record<string, string> = { "Normal Draft Pick": "Normale", "Ranked Solo": "Classée Solo", "Ranked Flex": "Classée Flex", Custom: "Personnalisée" };
const SESSION_GAP = 2 * 60 * 60 * 1000;

export function lolRank(text: string | undefined, language: "fr" | "en" = "fr") {
  const found = /^([A-Z]+)(?:\s+([IV]+))?\s*(?:\((\d+)\s*LP\))?/.exec((text ?? "").trim());
  const tier = found ? TIERS[found[1]] : undefined;
  if (!found || !tier) return { name: language === "fr" ? "Non classé" : "Unranked", lp: 0, color: "var(--muted)", emblem: "" };
  return {
    name: [tier[language], found[2]].filter(Boolean).join(" "),
    lp: Number(found[3] ?? 0),
    color: tier.color,
    emblem: `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${found[1].toLowerCase()}.svg`,
  };
}

const QUEUES: Record<number, [string, string]> = { 420: ["Classée Solo", "Ranked Solo"], 440: ["Classée Flex", "Ranked Flex"], 400: ["Normale", "Normal"], 430: ["Normale", "Normal"], 490: ["Partie rapide", "Quickplay"], 450: ["ARAM", "ARAM"], 700: ["Clash", "Clash"], 900: ["ARURF", "ARURF"], 1700: ["Arena", "Arena"] };
const GAME_MODES: Record<string, [string, string]> = { CLASSIC: ["Faille de l'invocateur", "Summoner's Rift"], ARAM: ["ARAM", "ARAM"], CHERRY: ["Arena", "Arena"] };

export function lolLiveMode(mode = "", queueId = 0, language: "fr" | "en" = "fr"): string {
  const found = QUEUES[queueId] ?? GAME_MODES[mode];
  return found ? found[language === "fr" ? 0 : 1] : mode;
}

export const lolMode = (mode = "", language: "fr" | "en" = "fr") => (language === "fr" ? MODES[mode] ?? mode : mode);

export function championSplash(image = ""): string {
  const name = /\/champion\/([^/.]+)\.png$/.exec(image)?.[1];
  return name ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_0.jpg` : "";
}

const REMAKE_SECONDS = 300;

export function lolLine(match: LolMatch) {
  const me = match.scoreboard?.players?.find((player) => player.isMe);
  const segment = match.segments?.[0]?.stats ?? {};
  const value = (key: keyof LolPlayerStats) => Number(me?.stats?.[key] ?? segment[key]?.value ?? 0);
  const kills = value("kills");
  const deaths = value("deaths");
  const assists = value("assists");
  const duration = match.scoreboard?.duration;
  const remake = match.metadata?.result === "Remake" || (duration !== undefined && duration > 0 && duration < REMAKE_SECONDS);
  return {
    me,
    won: !remake && match.metadata?.result === "Victory",
    remake,
    kills,
    deaths,
    assists,
    kda: (kills + assists) / Math.max(1, deaths),
    cs: value("cs"),
    csPerMin: value("csPerMin"),
    damagePerMin: Math.round(value("damagePerMin")),
    items: (me?.items ?? []).filter((item) => item.image),
    score: [match.metadata?.score?.team ?? 0, match.metadata?.score?.opponent ?? 0] as const,
    minutes: Math.round((match.scoreboard?.duration ?? 0) / 60),
  };
}

export function lolStats(matches: LolMatch[]) {
  const lines = matches.filter((match) => match.metadata?.modeName !== "Custom").map(lolLine).filter((line) => !line.remake);
  const sum = (pick: (line: ReturnType<typeof lolLine>) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const wins = lines.filter((line) => line.won).length;
  const average = (pick: (line: ReturnType<typeof lolLine>) => number) => (lines.length ? sum(pick) / lines.length : 0);
  return {
    count: lines.length,
    wins,
    losses: lines.length - wins,
    winRate: lines.length ? (wins / lines.length) * 100 : 0,
    kda: (sum((line) => line.kills) + sum((line) => line.assists)) / Math.max(1, sum((line) => line.deaths)),
    csPerMin: average((line) => line.csPerMin),
    damagePerMin: Math.round(average((line) => line.damagePerMin)),
  };
}

const startOf = (match: LolMatch) => new Date(match.metadata?.timestamp ?? 0).getTime();

export function lolSession(matches: LolMatch[]): LolMatch[] {
  const sorted = [...matches].sort((left, right) => startOf(right) - startOf(left));
  const session: LolMatch[] = [];
  for (const match of sorted) {
    const previous = session[session.length - 1];
    if (previous && startOf(previous) - startOf(match) > SESSION_GAP) break;
    session.push(match);
  }
  return session;
}

export function topChampions(matches: LolMatch[], limit = 3) {
  const groups = new Map<string, LolMatch[]>();
  for (const match of matches) {
    const name = match.metadata?.agentName;
    if (name) groups.set(name, [...(groups.get(name) ?? []), match]);
  }
  return [...groups].map(([name, rows]) => {
    const stats = lolStats(rows.length ? rows : []);
    const custom = stats.count === 0 ? lolStats(rows.map((row) => ({ ...row, metadata: { ...row.metadata, modeName: "" } }))) : stats;
    return { name, image: rows[0].metadata?.agentImageUrl ?? "", games: rows.length, winRate: Math.round(custom.winRate), kda: custom.kda };
  }).sort((left, right) => right.games - left.games || right.winRate - left.winRate).slice(0, limit);
}

export function lolTeams(match: LolMatch) {
  const players = match.scoreboard?.players ?? [];
  const names = [...new Set(players.map((player) => player.team ?? ""))];
  const mine = players.find((player) => player.isMe)?.team;
  return names.sort((left, right) => Number(right === mine) - Number(left === mine)).map((team) => {
    const rows = players.filter((player) => (player.team ?? "") === team);
    return { team, players: rows, won: rows[0]?.win ?? false, kills: rows.reduce((total, player) => total + (player.stats?.kills ?? 0), 0) };
  });
}
