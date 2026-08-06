import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { cachedLoad } from "../utils/cache.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const ORIGIN = "https://api.henrikdev.xyz";
const VALORANT_API_ORIGIN = "https://valorant-api.com";
const AGENT_CATALOGUE_CACHE_KEY = "valorant:agents:catalogue";
const AGENT_IMAGE_HOSTS = ["henrikdev.xyz", "valorant-api.com"];

async function loadAgentCatalogue(env) {
  const result = await cachedLoad(AGENT_CATALOGUE_CACHE_KEY, 3600, async () => {
    try {
      const response = await requestExternal(new URL("/v1/agents", VALORANT_API_ORIGIN), {
        env,
        expectedOrigin: VALORANT_API_ORIGIN,
        service: "tracker",
        dedupeKey: "valorant:agents:catalogue",
        retries: 1,
        maxBytes: 4194304
      });
      const agents = Array.isArray(response.data?.data) ? response.data.data : [];
      return Object.freeze(new Map(agents.map((agent) => {
        const name = safeText(agent?.displayName).toLowerCase();
        const icon = safePublicUrl(agent?.displayIcon, ["valorant-api.com"]);
        return [name, icon];
      }).filter(([name, icon]) => name && icon)));
    } catch {
      return null;
    }
  });
  return result.data;
}

function resolveAgentImage(value, character, catalogue) {
  const supplied = safePublicUrl(value, AGENT_IMAGE_HOSTS);
  if (supplied) {
    const hostname = new URL(supplied).hostname;
    if (hostname === "valorant-api.com" || hostname.endsWith(".valorant-api.com")) return supplied;
  }
  return catalogue?.get(safeText(character).toLowerCase()) || "";
}

async function getAccount(env, name, tag, apiKey) {
  const path = `/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const headers = {};
  if (apiKey) headers["Authorization"] = apiKey;
  
  const response = await requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `henrik:account:${name.toLowerCase()}:${tag.toLowerCase()}`,
    headers,
    retries: 1
  });
  
  return response.data?.data;
}

export async function getValorantProfile(env, riotId, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "HENRIK_API_KEY");
  const [name, tag] = riotId.split("#");
  
  const account = await getAccount(env, name, tag, apiKey);
  if (!account) return null;
  
  const region = account.region || "eu";
  
  const mmrPath = `/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const headers = {};
  if (apiKey) headers["Authorization"] = apiKey;

  const mmrResponse = await requestExternal(new URL(mmrPath, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `henrik:mmr:${region}:${name.toLowerCase()}:${tag.toLowerCase()}`,
    headers,
    retries: 1
  });
  
  const mmr = mmrResponse.data?.data || {};
  const currentData = mmr.current_data || {};
  
  return Object.freeze({
    platform: "riot",
    identifier: riotId,
    handle: riotId,
    avatarUrl: safePublicUrl(account.card?.small, ["henrikdev.xyz", "valorant-api.com"]),
    segments: Object.freeze([{
      type: "overview",
      name: "Ranked",
      stats: safeStats({
        rank: { value: currentData.currenttier || 0, displayValue: currentData.currenttierpatched || "Unranked" },
        rr: { value: currentData.ranking_in_tier || 0, displayValue: `${currentData.ranking_in_tier || 0} RR` },
        elo: { value: currentData.elo || 0, displayValue: String(currentData.elo || 0) },
        level: { value: account.account_level || 0, displayValue: String(account.account_level || 0) }
      })
    }])
  });
}

export async function getValorantMatches(env, riotId, mode, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "HENRIK_API_KEY");
  const [name, tag] = riotId.split("#");
  
  const account = await getAccount(env, name, tag, apiKey);
  if (!account) return [];
  
  const region = account.region || "eu";
  
  const matchesUrl = new URL(`/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, ORIGIN);
  matchesUrl.searchParams.set("size", "25");
  if (mode && mode !== "all") {
    const slug = encodeURIComponent(mode);
    matchesUrl.searchParams.set("mode", slug);
    matchesUrl.searchParams.set("filter", slug);
  }

  const headers = {};
  if (apiKey) headers["Authorization"] = apiKey;

  const response = await requestExternal(matchesUrl, {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `henrik:matches:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${mode || "all"}:25`,
    headers,
    retries: 1,
    maxBytes: 4194304
  });
  
  const requestedMode = String(mode || "all").toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches = (response.data?.data || []).filter((match) => {
    if (requestedMode === "all") return true;
    const matchMode = String(match.metadata?.mode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return matchMode === requestedMode;
  });
  const agentCatalogue = await loadAgentCatalogue(env);
  
  return Object.freeze(matches.map((match) => {
    const meta = match.metadata || {};
    const players = match.players?.all_players || [];
    const me = players.find(p => p.name?.toLowerCase() === name.toLowerCase() && p.tag?.toLowerCase() === tag.toLowerCase()) || players[0];
    const mePartyId = safeText(me?.party_id);
    const partyMembers = mePartyId
      ? players.filter(p => safeText(p.party_id) === mePartyId && p !== me)
      : [];
    const stats = me?.stats || {};
    const teamKey = me?.team?.toLowerCase();
    const opponentKey = teamKey === "red" ? "blue" : teamKey === "blue" ? "red" : null;
    const teamRounds = teamKey ? Number(match.teams?.[teamKey]?.rounds_won) : NaN;
    const opponentRounds = opponentKey ? Number(match.teams?.[opponentKey]?.rounds_won) : NaN;
    const roundsPlayed = Number(meta.rounds_played);
    
    let result = "Draw";
    if (match.teams) {
      if (me?.team === "Red") result = match.teams.red?.has_won ? "Victory" : "Defeat";
      else if (me?.team === "Blue") result = match.teams.blue?.has_won ? "Victory" : "Defeat";
    }
    
    return Object.freeze({
      id: safeText(meta.matchid),
      scoreboard: Object.freeze({
        teams: Object.freeze({
          Red: Object.freeze({ roundsWon: Number.isFinite(Number(match.teams?.red?.rounds_won)) ? Number(match.teams.red.rounds_won) : null }),
          Blue: Object.freeze({ roundsWon: Number.isFinite(Number(match.teams?.blue?.rounds_won)) ? Number(match.teams.blue.rounds_won) : null })
        }),
        partyMembers: Object.freeze(partyMembers.map(p => Object.freeze({
          name: safeText(p.name),
          tag: safeText(p.tag)
        }))),
        players: players.map(p => Object.freeze({
          team: safeText(p.team),
          character: safeText(p.character),
          name: safeText(p.name),
          tag: safeText(p.tag),
          currenttier_patched: safeText(p.currenttier_patched),
          party_id: safeText(p.party_id),
          inParty: Boolean(safeText(p.party_id)),
          isMe: Boolean(me && p === me),
          isPartyMember: Boolean(mePartyId && p !== me && safeText(p.party_id) === mePartyId),
          assets: Object.freeze({
            agent: Object.freeze({
              small: resolveAgentImage(p.assets?.agent?.small, p.character, agentCatalogue)
            })
          }),
          stats: Object.freeze({
            score: Number(p.stats?.score) || 0,
            kills: Number(p.stats?.kills) || 0,
            deaths: Number(p.stats?.deaths) || 0,
            assists: Number(p.stats?.assists) || 0,
            headshots: Number(p.stats?.headshots) || 0,
            bodyshots: Number(p.stats?.bodyshots) || 0,
            legshots: Number(p.stats?.legshots) || 0,
            damageMade: Number(p.damage_made) || 0,
            damageReceived: Number(p.damage_received) || 0,
            adr: Number(p.damage_made) / Math.max(1, Number(meta.rounds_played) || 1) || 0
          })
        }))
      }),
      metadata: Object.freeze({
        modeName: safeText(meta.mode),
        result: safeText(result),
        mapName: safeText(meta.map),
        agentName: safeText(me?.character),
        agentImageUrl: resolveAgentImage(me?.assets?.agent?.small, me?.character, agentCatalogue),
        score: Object.freeze({
          team: Number.isFinite(teamRounds) ? teamRounds : null,
          opponent: Number.isFinite(opponentRounds) ? opponentRounds : null,
          roundsPlayed: Number.isFinite(roundsPlayed) ? roundsPlayed : null
        }),
        timestamp: safeText(new Date((meta.game_start || 0) * 1000).toISOString())
      }),
      segments: Object.freeze([{
        type: "overview",
        stats: safeStats({
          kills: { value: stats.kills || 0, displayValue: String(stats.kills || 0) },
          deaths: { value: stats.deaths || 0, displayValue: String(stats.deaths || 0) },
          assists: { value: stats.assists || 0, displayValue: String(stats.assists || 0) },
          score: { value: stats.score || 0, displayValue: String(stats.score || 0) },
          scorePerRound: { value: (stats.score || 0) / Math.max(1, meta.rounds_played || 1), displayValue: String(Math.round((stats.score || 0) / Math.max(1, meta.rounds_played || 1))) },
          headshotsPercentage: { value: ((stats.headshots || 0) / Math.max(1, (stats.headshots || 0) + (stats.bodyshots || 0) + (stats.legshots || 0))) * 100, displayValue: String(Math.round(((stats.headshots || 0) / Math.max(1, (stats.headshots || 0) + (stats.bodyshots || 0) + (stats.legshots || 0))) * 100)) },
          damageDeltaPerRound: { value: ((me?.damage_made || 0) - (me?.damage_received || 0)) / Math.max(1, meta.rounds_played || 1), displayValue: String(Math.round(((me?.damage_made || 0) - (me?.damage_received || 0)) / Math.max(1, meta.rounds_played || 1))) },
          adr: { value: (Number(me?.damage_made) || 0) / Math.max(1, meta.rounds_played || 1), displayValue: String(Math.round((Number(me?.damage_made) || 0) / Math.max(1, meta.rounds_played || 1))) }
        })
      }])
    });
  }));
}
