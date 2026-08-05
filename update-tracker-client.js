
const fs = require('fs');
let code = fs.readFileSync('worker/src/services/tracker-client.js', 'utf-8');

// Replace getTrackerValorantMatches
const valorantFunc = export async function getTrackerValorantMatches(env, riotId, mode, apiKeyOverride) {
  const apiKey = apiKeyOverride || env.HENRIK_API_KEY;
  if (!apiKey) {
    throw new Error("HenrikDev API Key (HENRIK_API_KEY) manquant.");
  }
  const [name, tag] = riotId.split("%23");
  const path = \/valorant/v3/matches/eu/\/\?mode=\\;
  
  const response = await requestExternal(new URL(path, "https://api.henrikdev.xyz"), {
    env,
    expectedOrigin: "https://api.henrikdev.xyz",
    service: "henrik",
    dedupeKey: \alorant:matches:\:\:\\,
    headers: { "Authorization": apiKey },
    retries: 1
  });
  
  const matches = response.data?.data || [];
  
  // Transform to tracker.gg format, but with detailed scoreboard payload
  return Object.freeze(matches.map((match) => {
    // Find our player in all_players
    const myPlayer = match.players?.all_players?.find(p => p.name.toLowerCase() === name.toLowerCase() && p.tag.toLowerCase() === tag.toLowerCase()) || match.players?.all_players?.[0] || {};
    const teamColor = myPlayer.team || "Blue";
    const myTeam = match.teams?.[teamColor.toLowerCase()];
    
    return Object.freeze({
      id: safeText(match.metadata?.matchid),
      metadata: Object.freeze({
        modeName: safeText(match.metadata?.mode),
        result: myTeam?.has_won ? "Victory" : "Defeat",
        mapName: safeText(match.metadata?.map),
        agentName: safeText(myPlayer.character),
        agentImageUrl: safePublicUrl(myPlayer.assets?.agent?.small, ["henrikdev.xyz"]),
        timestamp: safeText(match.metadata?.game_start * 1000)
      }),
      // the new detailed scoreboard payload
      scoreboard: Object.freeze({
        teams: {
          red: match.teams?.red,
          blue: match.teams?.blue
        },
        players: match.players?.all_players?.map(p => ({
          name: p.name,
          tag: p.tag,
          team: p.team,
          party_id: p.party_id,
          character: p.character,
          currenttier_patched: p.currenttier_patched,
          stats: p.stats
        })) || []
      }),
      segments: Object.freeze([{
        type: "player-summary",
        stats: safeStats({
          kills: { value: myPlayer.stats?.kills },
          deaths: { value: myPlayer.stats?.deaths },
          assists: { value: myPlayer.stats?.assists },
          score: { value: myPlayer.stats?.score },
          headshotsPercentage: { value: Math.round((myPlayer.stats?.headshots / (myPlayer.stats?.headshots + myPlayer.stats?.bodyshots + myPlayer.stats?.legshots)) * 100) || 0 }
        })
      }])
    });
  }));
};

code = code.replace(/export function getTrackerValorantMatches[\s\S]*?}/, valorantFunc);

fs.writeFileSync('worker/src/services/tracker-client.js', code, 'utf-8');

