// Tracker E:VAL (app iOS) : HenrikDev -> matchs compactés stockés une fois dans Supabase.
// Les clients lisent Supabase ; ce module est le seul à appeler HenrikDev et il est borné
// par les horodatages de ethone_valorant_accounts (pas par un cache mémoire d'isolat).
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";

const HENRIK = "https://api.henrikdev.xyz";
export const MATCHES_SYNC_SECONDS = 10 * 60;
export const ACCOUNT_SYNC_SECONDS = 24 * 60 * 60;

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const uuidIn = (value) => (String(value || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [""])[0].toLowerCase();
const team = (value) => (String(value || "").toLowerCase() === "red" ? "Red" : "Blue");

// --- Supabase (clé service) ---------------------------------------------------

function origin(env) {
  try {
    const url = new URL(String(env.SUPABASE_URL || ""));
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

async function rest(env, path, { method = "GET", body, prefer, maxBytes = 65536 } = {}) {
  const base = origin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  const headers = { apikey: secret, "content-type": "application/json" };
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(secret)) headers.Authorization = `Bearer ${secret}`;
  if (prefer) headers.Prefer = prefer;
  const response = await requestExternal(new URL(`/rest/v1/${path}`, base), {
    env,
    expectedOrigin: base,
    service: "supabase",
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    retries: 0,
    maxBytes
  });
  return response.data;
}

// --- HenrikDev ----------------------------------------------------------------

async function henrik(env, path, dedupeKey, maxBytes = 1048576) {
  const response = await requestExternal(new URL(path, HENRIK), {
    env,
    expectedOrigin: HENRIK,
    service: "tracker",
    dedupeKey,
    headers: { Authorization: requireSecret(env, "HENRIK_API_KEY") },
    retries: 1,
    maxBytes
  });
  return response.data?.data;
}

function accountRow(raw, previous) {
  return {
    puuid: safeText(raw?.puuid, 80),
    name: safeText(raw?.name, 32),
    tag: safeText(raw?.tag, 10),
    region: safeText(raw?.region, 8).toLowerCase() || previous?.region || "eu",
    level: num(raw?.account_level),
    card: uuidIn(raw?.card?.id || raw?.card?.small || raw?.card),
    title: safeText(raw?.title, 80),
    tier: previous?.tier || 0,
    mmr: previous?.mmr || {},
    account_synced_at: new Date().toISOString(),
    matches_synced_at: previous?.matches_synced_at || null,
    updated_at: new Date().toISOString()
  };
}

// --- Compaction d'un match v3 -------------------------------------------------
// Garde tout ce qu'il faut pour le tableau des scores, les manches, les duels,
// la performance par manche et l'économie ; jette les positions et les assets.

export function compactMatch(match) {
  const meta = match?.metadata || {};
  const id = safeText(meta.matchid, 64);
  if (!id) return null;
  const all = Array.isArray(match?.players?.all_players) ? match.players.all_players : [];
  const players = all.map((p) => ({
    puuid: safeText(p.puuid, 80),
    name: safeText(p.name, 32),
    tag: safeText(p.tag, 10),
    team: team(p.team),
    agent: safeText(p.character, 32),
    agentId: uuidIn(p.assets?.agent?.small),
    tier: num(p.currenttier),
    card: uuidIn(p.player_card),
    title: uuidIn(p.player_title),
    level: num(p.level),
    party: safeText(p.party_id, 64),
    score: num(p.stats?.score),
    kills: num(p.stats?.kills),
    deaths: num(p.stats?.deaths),
    assists: num(p.stats?.assists),
    hs: num(p.stats?.headshots),
    bs: num(p.stats?.bodyshots),
    ls: num(p.stats?.legshots),
    dmg: num(p.damage_made),
    dmgIn: num(p.damage_received),
    spent: num(p.economy?.spent?.overall),
    loadout: num(p.economy?.loadout_value?.overall)
  })).filter((p) => p.puuid);

  const rounds = (Array.isArray(match?.rounds) ? match.rounds : []).map((r, index) => ({
    n: index + 1,
    winner: team(r.winning_team),
    end: safeText(r.end_type, 40),
    plant: safeText(r.plant_events?.planted_by?.puuid, 80),
    site: safeText(r.plant_events?.plant_site, 4),
    defuse: safeText(r.defuse_events?.defused_by?.puuid, 80),
    stats: (Array.isArray(r.player_stats) ? r.player_stats : []).map((s) => ({
      p: safeText(s.player_puuid, 80),
      score: num(s.score),
      kills: num(s.kills),
      dmg: num(s.damage),
      hs: num(s.headshots),
      bs: num(s.bodyshots),
      ls: num(s.legshots),
      loadout: num(s.economy?.loadout_value),
      spent: num(s.economy?.spent),
      bank: num(s.economy?.remaining),
      weapon: uuidIn(s.economy?.weapon?.id),
      armor: uuidIn(s.economy?.armor?.id),
      afk: Boolean(s.was_afk)
    }))
  }));

  const kills = (Array.isArray(match?.kills) ? match.kills : []).map((k) => ({
    r: num(k.round) + 1,
    t: num(k.kill_time_in_round),
    k: safeText(k.killer_puuid, 80),
    v: safeText(k.victim_puuid, 80),
    w: uuidIn(k.damage_weapon_id),
    a: (Array.isArray(k.assistants) ? k.assistants : []).map((a) => safeText(a.assistant_puuid, 80)).filter(Boolean)
  }));

  const startedAt = num(meta.game_start) > 0 ? new Date(num(meta.game_start) * 1000).toISOString() : null;
  return {
    v: 1,
    id,
    map: safeText(meta.map, 40),
    mapId: uuidIn(meta.map?.id) || "",
    mode: safeText(meta.mode, 40),
    queue: safeText(meta.queue, 40),
    season: safeText(meta.season_id, 64),
    version: safeText(meta.game_version, 80),
    cluster: safeText(meta.cluster, 40),
    startedAt,
    // v3 renvoie game_length en secondes (anciennes réponses en millisecondes).
    lengthSec: num(meta.game_length) > 100000 ? Math.round(num(meta.game_length) / 1000) : num(meta.game_length),
    teams: {
      Red: { won: Boolean(match?.teams?.red?.has_won), rounds: num(match?.teams?.red?.rounds_won) },
      Blue: { won: Boolean(match?.teams?.blue?.has_won), rounds: num(match?.teams?.blue?.rounds_won) }
    },
    players,
    rounds,
    kills
  };
}

// v3 mmr -> rang actuel, pic, place au classement et bilan de chaque acte classé.
export function compactMmr(raw) {
  const current = raw?.current || {};
  const seasons = (Array.isArray(raw?.seasonal) ? raw.seasonal : []).map((s) => ({
    season: safeText(s.season?.id, 64),
    short: safeText(s.season?.short, 16),
    wins: num(s.wins),
    games: num(s.games),
    endTier: num(s.end_tier?.id),
    endRR: num(s.end_rr),
    leaderboardRank: num(s.leaderboard_placement?.rank)
  })).filter((s) => s.season && s.games > 0);
  return {
    tier: num(current.tier?.id),
    rr: num(current.rr),
    lastChange: num(current.last_change),
    leaderboardRank: num(current.leaderboard_placement?.rank),
    peakTier: num(raw?.peak?.tier?.id),
    peakSeason: safeText(raw?.peak?.season?.id, 64),
    seasons
  };
}

// v1 mmr-history -> évolution du rang partie par partie (courbe « notes de rang »).
export function compactMmrHistory(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, 40).map((h) => ({
    tier: num(h.currenttier),
    rr: num(h.ranking_in_tier),
    change: num(h.mmr_change_to_last_game),
    elo: num(h.elo),
    at: num(h.date_raw) > 0 ? new Date(num(h.date_raw) * 1000).toISOString() : null,
    map: safeText(h.map?.name, 40),
    match: safeText(h.match_id, 64)
  })).filter((h) => h.at);
}

function matchRow(compact) {
  return {
    match_id: compact.id,
    started_at: compact.startedAt,
    map: compact.map,
    mode: compact.mode,
    puuids: compact.players.map((p) => p.puuid),
    payload: compact
  };
}

// --- Synchronisation ----------------------------------------------------------

const ageSeconds = (iso) => (iso ? (Date.now() - Date.parse(iso)) / 1000 : Infinity);

// ilike sans jokers : « _ » et « % » sont permis dans un Riot ID.
const literal = (value) => encodeURIComponent(String(value).replace(/[\\%_]/g, "\\$&"));

async function findAccount(env, { puuid, name, tag }) {
  const filter = puuid
    ? `puuid=eq.${encodeURIComponent(puuid)}`
    : `name=ilike.${literal(name)}&tag=ilike.${literal(tag)}`;
  const rows = await rest(env, `ethone_valorant_accounts?${filter}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function saveAccount(env, row) {
  await rest(env, "ethone_valorant_accounts?on_conflict=puuid", {
    method: "POST",
    body: [row],
    prefer: "resolution=merge-duplicates,return=minimal"
  });
  await rememberNames(env, [{ puuid: row.puuid, name: row.name, tag: row.tag }]);
}

async function rememberNames(env, rows) {
  const unique = [...new Map(rows.filter((r) => r.puuid && r.name).map((r) => [`${r.puuid}|${r.name}|${r.tag}`, r])).values()];
  if (!unique.length) return;
  await rest(env, "ethone_valorant_name_history?on_conflict=puuid,name,tag", {
    method: "POST",
    body: unique,
    prefer: "resolution=ignore-duplicates,return=minimal"
  });
}

/** Compte par Riot ID ou PUUID ; HenrikDev seulement si inconnu ou vieux de plus de 24 h. */
export async function resolveAccount(env, query) {
  const known = await findAccount(env, query);
  if (known && ageSeconds(known.account_synced_at) < ACCOUNT_SYNC_SECONDS) return known;
  const path = query.puuid
    ? `/valorant/v2/by-puuid/account/${encodeURIComponent(query.puuid)}`
    : `/valorant/v2/account/${encodeURIComponent(query.name)}/${encodeURIComponent(query.tag)}`;
  const raw = await henrik(env, path, `eval:account:${query.puuid || `${query.name}#${query.tag}`.toLowerCase()}`, 65536);
  if (!raw?.puuid) return known;
  const previous = known?.puuid === raw.puuid ? known : await findAccount(env, { puuid: raw.puuid });
  const row = accountRow(raw, previous);
  await saveAccount(env, row);
  return row;
}

/** Au plus un appel « matchs » HenrikDev par compte toutes les 10 minutes, tous clients confondus. */
export async function syncMatches(env, account, { force = false } = {}) {
  if (!force && ageSeconds(account.matches_synced_at) < MATCHES_SYNC_SECONDS) {
    return { synced: false, stored: 0 };
  }
  // Pose l'horodatage avant l'appel : deux requêtes simultanées ne déclenchent qu'un appel.
  const now = new Date().toISOString();
  await rest(env, `ethone_valorant_accounts?puuid=eq.${encodeURIComponent(account.puuid)}`, {
    method: "PATCH",
    body: { matches_synced_at: now },
    prefer: "return=minimal"
  });
  account.matches_synced_at = now;

  // Rang / saisons : même cadence que les matchs. Un échec ne bloque pas les matchs.
  try {
    const rawMmr = await henrik(env, `/valorant/v3/by-puuid/mmr/${encodeURIComponent(account.region || "eu")}/pc/${encodeURIComponent(account.puuid)}`, `eval:mmr:${account.puuid}`, 262144);
    if (rawMmr) {
      const mmr = compactMmr(rawMmr);
      try {
        const rawHistory = await henrik(env, `/valorant/v1/by-puuid/mmr-history/${encodeURIComponent(account.region || "eu")}/${encodeURIComponent(account.puuid)}`, `eval:mmr-history:${account.puuid}`, 524288);
        mmr.history = compactMmrHistory(rawHistory);
      } catch {}
      await rest(env, `ethone_valorant_accounts?puuid=eq.${encodeURIComponent(account.puuid)}`, {
        method: "PATCH",
        body: { mmr, ...(mmr.tier > 0 ? { tier: mmr.tier } : {}) },
        prefer: "return=minimal"
      });
      account.mmr = mmr;
      if (mmr.tier > 0) account.tier = mmr.tier;
    }
  } catch {}

  const path = `/valorant/v3/by-puuid/matches/${encodeURIComponent(account.region || "eu")}/${encodeURIComponent(account.puuid)}?size=25`;
  const raw = await henrik(env, path, `eval:matches:${account.puuid}`, 16777216);
  const compact = (Array.isArray(raw) ? raw : []).map(compactMatch).filter(Boolean);
  if (!compact.length) return { synced: true, stored: 0 };

  await rest(env, "ethone_valorant_matches?on_conflict=match_id", {
    method: "POST",
    body: compact.map(matchRow),
    prefer: "resolution=ignore-duplicates,return=minimal",
    maxBytes: 4096
  });
  await rememberNames(env, compact.flatMap((m) => m.players.map((p) => ({ puuid: p.puuid, name: p.name, tag: p.tag }))));

  // Rang actuel = dernier match compétitif classé du joueur (gratuit, déjà dans les données).
  const ranked = compact
    .filter((m) => m.mode.toLowerCase() === "competitive")
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
    .map((m) => m.players.find((p) => p.puuid === account.puuid))
    .find((p) => p && p.tier > 0);
  if (ranked && !(account.mmr?.tier > 0) && ranked.tier !== account.tier) {
    await rest(env, `ethone_valorant_accounts?puuid=eq.${encodeURIComponent(account.puuid)}`, {
      method: "PATCH",
      body: { tier: ranked.tier },
      prefer: "return=minimal"
    });
    account.tier = ranked.tier;
  }
  return { synced: true, stored: compact.length };
}

/**
 * Historique plus ancien : une page de stored-matches (10 parties), puis le détail complet
 * uniquement des matchs absents de Supabase. Au plus 10 appels détail par page.
 */
export async function syncHistoryPage(env, account, page) {
  const region = encodeURIComponent(account.region || "eu");
  const response = await requestExternal(new URL(`/valorant/v1/by-puuid/stored-matches/${region}/${encodeURIComponent(account.puuid)}?page=${page}&size=10`, HENRIK), {
    env,
    expectedOrigin: HENRIK,
    service: "tracker",
    dedupeKey: `eval:history:${account.puuid}:${page}`,
    headers: { Authorization: requireSecret(env, "HENRIK_API_KEY") },
    retries: 1,
    maxBytes: 1048576
  });
  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const total = num(response.data?.results?.total);
  const ids = [...new Set(rows.map((r) => safeText(r.meta?.id, 64)).filter(Boolean))];
  if (!ids.length) return { stored: 0, total };

  const known = await rest(env, `ethone_valorant_matches?select=match_id&match_id=in.(${ids.map(encodeURIComponent).join(",")})`);
  const have = new Set((Array.isArray(known) ? known : []).map((r) => r.match_id));
  const compact = [];
  for (const id of ids.filter((x) => !have.has(x))) {
    try {
      const match = await henrik(env, `/valorant/v2/match/${encodeURIComponent(id)}`, `eval:match:${id}`, 4194304);
      const c = compactMatch(match);
      if (c) compact.push(c);
    } catch {
      break; // quota HenrikDev atteint : on garde ce qui a déjà été récupéré.
    }
  }
  if (compact.length) {
    await rest(env, "ethone_valorant_matches?on_conflict=match_id", {
      method: "POST",
      body: compact.map(matchRow),
      prefer: "resolution=ignore-duplicates,return=minimal",
      maxBytes: 4096
    });
    await rememberNames(env, compact.flatMap((m) => m.players.map((p) => ({ puuid: p.puuid, name: p.name, tag: p.tag }))));
  }
  return { stored: compact.length, total, already: have.size };
}
