import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const ORIGIN = "https://api.henrikdev.xyz";

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
  
  let path = `/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  if (mode && mode !== "all") {
    path += `?filter=${encodeURIComponent(mode)}`;
  }
  
  const headers = {};
  if (apiKey) headers["Authorization"] = apiKey;

  const response = await requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `henrik:matches:${region}:${name.toLowerCase()}:${tag.toLowerCase()}:${mode || "all"}`,
    headers,
    retries: 1,
    maxBytes: 4194304
  });
  
  const matches = response.data?.data || [];
  
  return Object.freeze(matches.map((match) => {
    const meta = match.metadata || {};
    const players = match.players?.all_players || [];
    const me = players.find(p => p.name.toLowerCase() === name.toLowerCase() && p.tag.toLowerCase() === tag.toLowerCase()) || players[0];
    const stats = me?.stats || {};
    
    let result = "Draw";
    if (match.teams) {
      if (me?.team === "Red") result = match.teams.red?.has_won ? "Victory" : "Defeat";
      else if (me?.team === "Blue") result = match.teams.blue?.has_won ? "Victory" : "Defeat";
    }
    
    return Object.freeze({
      id: safeText(meta.matchid),
      scoreboard: Object.freeze({
        players: players.map(p => Object.freeze({
          team: safeText(p.team),
          character: safeText(p.character),
          name: safeText(p.name),
          tag: safeText(p.tag),
          currenttier_patched: safeText(p.currenttier_patched),
          party_id: safeText(p.party_id),
          stats: Object.freeze({
            score: Number(p.stats?.score) || 0,
            kills: Number(p.stats?.kills) || 0,
            deaths: Number(p.stats?.deaths) || 0,
            assists: Number(p.stats?.assists) || 0,
            headshots: Number(p.stats?.headshots) || 0,
            bodyshots: Number(p.stats?.bodyshots) || 0,
            legshots: Number(p.stats?.legshots) || 0
          })
        }))
      }),
      metadata: Object.freeze({
        modeName: safeText(meta.mode),
        result: safeText(result),
        mapName: safeText(meta.map),
        agentName: safeText(me?.character),
        agentImageUrl: safePublicUrl(me?.assets?.agent?.small, ["henrikdev.xyz", "valorant-api.com"]),
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
          damageDeltaPerRound: { value: ((me?.damage_made || 0) - (me?.damage_received || 0)) / Math.max(1, meta.rounds_played || 1), displayValue: String(Math.round(((me?.damage_made || 0) - (me?.damage_received || 0)) / Math.max(1, meta.rounds_played || 1))) }
        })
      }])
    });
  }));
}
