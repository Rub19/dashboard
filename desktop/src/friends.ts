export interface FriendRow {
  id: string;
  name: string;
  tag: string;
  online: boolean;
  show: string;
  product: string;
  state: string;
  queue: string;
  tier: number;
  partySize: number;
  partyMax: number;
  partyId: string;
  partyState: string;
  allyScore: number;
  enemyScore: number;
  map: string;
  idle: boolean;
  playing: boolean;
  icon: string;
  card: string;
  title: string;
  lastOnline: string;
}

export interface FriendParty {
  id: string;
  size: number;
  max: number;
  members: FriendRow[];
  others: number;
}

export interface FriendBoard {
  parties: FriendParty[];
  valorant: FriendRow[];
  platforms: { name: string; rows: FriendRow[] }[];
  offline: FriendRow[];
}

const PLATFORMS: Record<string, string> = { league_of_legends: "League of Legends", tft: "Teamfight Tactics", bacon: "Legends of Runeterra", lion: "2XKO" };
const PLATFORM_ORDER = ["League of Legends", "Teamfight Tactics", "Legends of Runeterra", "2XKO", "Riot Client"];

const byName = (left: FriendRow, right: FriendRow) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
const inGame = (friend: FriendRow) => friend.state === "INGAME" || friend.state === "PREGAME" || friend.playing;
const byActivity = (left: FriendRow, right: FriendRow) => Number(inGame(right)) - Number(inGame(left)) || byName(left, right);

export function lastOnlineTime(raw: string): number {
  const text = raw.trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) {
    const value = Number(text);
    return value > 10_000_000_000 ? value : value * 1000;
  }
  const time = Date.parse(/^\d{4}-\d{2}-\d{2} /.test(text) ? `${text.replace(" ", "T")}Z` : text);
  return Number.isNaN(time) ? 0 : time;
}

export function boardOf(friends: FriendRow[], query = ""): FriendBoard {
  const text = query.trim().toLowerCase();
  const rows = text ? friends.filter((friend) => `${friend.name}#${friend.tag}`.toLowerCase().includes(text)) : friends;
  const groups = new Map<string, FriendRow[]>();
  const valorant: FriendRow[] = [];
  const others = new Map<string, FriendRow[]>();
  const offline: FriendRow[] = [];
  for (const friend of rows) {
    if (!friend.online) offline.push(friend);
    else if (friend.product === "valorant") {
      if (friend.partyId && friend.partySize > 1) groups.set(friend.partyId, [...(groups.get(friend.partyId) ?? []), friend]);
      else valorant.push(friend);
    } else {
      const name = PLATFORMS[friend.product] ?? "Riot Client";
      others.set(name, [...(others.get(name) ?? []), friend]);
    }
  }
  const parties = [...groups].map(([id, members]) => {
    const size = Math.max(...members.map((member) => member.partySize));
    return { id, size, max: Math.max(...members.map((member) => member.partyMax), size), members: [...members].sort(byActivity), others: Math.max(0, size - members.length) };
  }).sort((left, right) => byActivity(left.members[0], right.members[0]));
  return {
    parties,
    valorant: valorant.sort(byActivity),
    platforms: [...others].map(([name, list]) => ({ name, rows: list.sort(byActivity) })).sort((left, right) => PLATFORM_ORDER.indexOf(left.name) - PLATFORM_ORDER.indexOf(right.name)),
    offline: offline.sort((left, right) => lastOnlineTime(right.lastOnline) - lastOnlineTime(left.lastOnline) || byName(left, right)),
  };
}

export function presenceKind(friend: FriendRow): "offline" | "busy" | "away" | "online" {
  if (!friend.online) return "offline";
  if (inGame(friend) || friend.show === "dnd") return "busy";
  return friend.idle || friend.show === "away" ? "away" : "online";
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

export function lastSeenText(raw: string, now = Date.now()): string {
  const time = lastOnlineTime(raw);
  if (!time) return "Hors ligne";
  const minutes = Math.floor((now - time) / 60000);
  if (minutes < 1) return "Dernière connexion à l'instant";
  if (minutes < 60) return `Dernière connexion il y a ${plural(minutes, "minute")}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Dernière connexion il y a ${plural(hours, "heure")}${minutes % 60 ? ` et ${plural(minutes % 60, "minute")}` : ""}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Dernière connexion il y a ${plural(days, "jour")}`;
  return `Dernière connexion le ${new Date(time).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}

export function lastSeenShort(raw: string, now = Date.now()): string {
  const time = lastOnlineTime(raw);
  if (!time) return "";
  const minutes = Math.floor((now - time) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} j`;
  return new Date(time).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
}

