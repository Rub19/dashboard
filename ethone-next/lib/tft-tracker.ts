// Teamfight Tactics match tracker — Riot TFT-Match-V1 API.
// Mirrors lib/lol-tracker.ts: tries a direct Riot call with the user's own
// API key, and the ETHONE Worker (`/api/stats/tft-matches`) is the fallback.

export interface TftTrait {
  name: string;
  numUnits: number;
  tierCurrent: number;
  tierTotal: number;
  style: number; // 0 none, 1 bronze, 2 silver, 3 gold, 4 chromatic/prismatic
}

export interface TftUnit {
  characterId: string;
  name: string;
  tier: number; // star level 1-3
  rarity: number; // 0..6 -> cost 1..5(+)
  items: string[];
}

export interface TftPlayer {
  puuid: string;
  isMe: boolean;
  placement: number;
  level: number;
  playersEliminated: number;
  damage: number;
  goldLeft: number;
  lastRound: number;
  companionSpecies: string;
  traits: TftTrait[];
  units: TftUnit[];
}

export interface TftMatch {
  id: string;
  mode: string;
  setNumber: number;
  playedAt: string;
  durationSeconds: number;
  me: Pick<TftPlayer, "placement" | "level" | "playersEliminated" | "damage" | "goldLeft" | "lastRound" | "traits" | "units"> | null;
  players: TftPlayer[];
}

const RIOT_EUROPE = "https://europe.api.riotgames.com";
const TFT_MATCH_LIMIT = 20;

const TFT_QUEUE_NAMES: Record<number, string> = {
  1090: "Normale",
  1100: "Classée",
  1130: "Hyper Roll",
  1160: "Double Up",
  1180: "Coup double",
  6120: "Choncc's Treasure",
};

export function tftQueueName(queueId?: number): string {
  return (queueId != null && TFT_QUEUE_NAMES[queueId]) || "TFT";
}

/** 1st gold, 2-4 green, 5-8 red. */
export function tftPlacementColor(placement: number): { text: string; bg: string; border: string } {
  if (placement === 1) return { text: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/40" };
  if (placement <= 4) return { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  return { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30" };
}

/** Trait activation tier → colour. */
export function tftTraitStyleColor(style: number): string {
  switch (style) {
    case 4: return "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-200"; // prismatic / chromatic
    case 3: return "border-amber-400/50 bg-amber-500/10 text-amber-200"; // gold
    case 2: return "border-zinc-300/40 bg-zinc-400/10 text-zinc-200"; // silver
    case 1: return "border-orange-500/40 bg-orange-600/10 text-orange-300"; // bronze
    default: return "border-white/10 bg-white/[0.03] text-zinc-400";
  }
}

/** Unit rarity → cost colour (1..5). */
export function tftUnitCostColor(rarity: number): string {
  const cost = Math.min(4, rarity);
  return ["border-zinc-500/50", "border-emerald-500/60", "border-sky-500/60", "border-fuchsia-500/60", "border-amber-400/70"][cost] || "border-zinc-500/50";
}

export function tftUnitCost(rarity: number): number {
  return Math.min(5, rarity + 1);
}

/** Best-effort Community Dragon square icon for a unit. */
export function getTftUnitIcon(characterId?: string): string {
  const id = String(characterId || "").toLowerCase();
  if (!id) return "";
  return `https://raw.communitydragon.org/latest/game/assets/characters/${id}/hud/${id}_square.png`;
}

export function formatTftTimeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function formatTftDuration(seconds?: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function normTrait(t: Record<string, unknown>): TftTrait {
  return {
    name: String(t.name || "").replace(/^Set\d+_/i, ""),
    numUnits: Number(t.num_units) || 0,
    tierCurrent: Number(t.tier_current) || 0,
    tierTotal: Number(t.tier_total) || 0,
    style: Number(t.style) || 0,
  };
}

function normUnit(u: Record<string, unknown>): TftUnit {
  return {
    characterId: String(u.character_id || ""),
    name: String(u.name || String(u.character_id || "").replace(/^TFT\d+_/i, "")),
    tier: Number(u.tier) || 1,
    rarity: Number(u.rarity) || 0,
    items: Array.isArray(u.itemNames) ? (u.itemNames as string[]).slice(0, 3).map((i) => String(i).replace(/^TFT_Item_/i, "")) : [],
  };
}

function normalizeTftMatch(raw: Record<string, any>, puuid: string): TftMatch {
  const info = raw.info || {};
  const players: TftPlayer[] = (info.participants || []).map((p: Record<string, any>) => ({
    puuid: String(p.puuid || ""),
    isMe: p.puuid === puuid,
    placement: Number(p.placement) || 8,
    level: Number(p.level) || 1,
    playersEliminated: Number(p.players_eliminated) || 0,
    damage: Number(p.total_damage_to_players) || 0,
    goldLeft: Number(p.gold_left) || 0,
    lastRound: Number(p.last_round) || 0,
    companionSpecies: String(p.companion?.species || ""),
    traits: (p.traits || [])
      .filter((t: Record<string, unknown>) => Number(t.tier_current) > 0)
      .map(normTrait)
      .sort((a: TftTrait, b: TftTrait) => b.tierCurrent - a.tierCurrent || b.numUnits - a.numUnits),
    units: (p.units || [])
      .map(normUnit)
      .sort((a: TftUnit, b: TftUnit) => b.rarity - a.rarity || b.tier - a.tier),
  }));
  players.sort((a, b) => a.placement - b.placement);
  const me = players.find((p) => p.isMe) || null;

  return {
    id: String(raw.metadata?.match_id || ""),
    mode: tftQueueName(info.queue_id),
    setNumber: Number(info.tft_set_number) || 0,
    playedAt: new Date(info.game_datetime || 0).toISOString(),
    durationSeconds: Math.round(Number(info.game_length) || 0),
    me: me
      ? {
          placement: me.placement,
          level: me.level,
          playersEliminated: me.playersEliminated,
          damage: me.damage,
          goldLeft: me.goldLeft,
          lastRound: me.lastRound,
          traits: me.traits,
          units: me.units,
        }
      : null,
    players,
  };
}

export async function fetchTftMatchesDirect(name: string, tag: string, apiKey?: string | null): Promise<TftMatch[]> {
  const cleanName = name.trim();
  const cleanTag = tag.trim().replace(/^#/, "");
  if (!cleanName || !cleanTag) return [];

  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Riot-Token"] = apiKey;

  const accRes = await fetch(
    `${RIOT_EUROPE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(cleanName)}/${encodeURIComponent(cleanTag)}`,
    { headers }
  );
  if (!accRes.ok) throw new Error(`Riot Account: ${accRes.status}`);
  const puuid = (await accRes.json())?.puuid as string | undefined;
  if (!puuid) return [];

  const idsRes = await fetch(
    `${RIOT_EUROPE}/tft/match/v1/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${TFT_MATCH_LIMIT}`,
    { headers }
  );
  if (!idsRes.ok) throw new Error(`TFT match ids: ${idsRes.status}`);
  const ids: string[] = await idsRes.json();
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const BATCH = 5;
  const out: TftMatch[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const settled = await Promise.allSettled(
      ids.slice(i, i + BATCH).map(async (id) => {
        const r = await fetch(`${RIOT_EUROPE}/tft/match/v1/matches/${encodeURIComponent(id)}`, { headers });
        if (!r.ok) return null;
        return r.json();
      })
    );
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) out.push(normalizeTftMatch(s.value, puuid));
    }
    if (i + BATCH < ids.length) await new Promise((res) => setTimeout(res, 250));
  }
  return out.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
}
