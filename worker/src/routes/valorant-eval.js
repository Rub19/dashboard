import { assertAllowedQuery, PATTERNS, queryText } from "../middleware/validation.js";
import { httpError } from "../middleware/errors.js";
import { resolveAccount, syncMatches } from "../services/valorant-eval.js";
import { routeResult } from "../utils/response.js";

const PUUID = /^[A-Za-z0-9-]{20,80}$/;

function publicAccount(row, extra = {}) {
  return {
    puuid: row.puuid,
    name: row.name,
    tag: row.tag,
    region: row.region,
    level: row.level,
    card: row.card,
    title: row.title,
    tier: row.tier,
    mmr: row.mmr || {},
    matchesSyncedAt: row.matches_synced_at,
    ...extra
  };
}

/**
 * GET /api/valorant/eval/sync?name=&tag= (ou ?puuid=) : résout le compte et, si la dernière
 * synchro date de plus de 10 min, stocke ses 25 derniers matchs dans Supabase.
 * Les matchs eux-mêmes se lisent dans la table ethone_valorant_matches.
 */
export async function valorantEvalSyncRoute({ env, url }) {
  assertAllowedQuery(url, ["name", "tag", "puuid", "matches"]);
  const puuid = queryText(url, "puuid", { pattern: PUUID, max: 80, required: false });
  const name = puuid ? "" : queryText(url, "name", { pattern: PATTERNS.playerName, max: 32 });
  const tag = puuid ? "" : queryText(url, "tag", { pattern: PATTERNS.playerTag, max: 10 }).replace(/^#/, "");
  const account = await resolveAccount(env, puuid ? { puuid } : { name, tag });
  if (!account?.puuid) throw httpError("PROVIDER_NOT_FOUND", 404);
  // matches=0 : simple résolution de compte (amis, recherche) sans toucher aux matchs.
  const result = url.searchParams.get("matches") === "0"
    ? { synced: false, stored: 0 }
    : await syncMatches(env, account);
  return routeResult(publicAccount(account, result), { source: "henrikdev" });
}
