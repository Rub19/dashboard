import { httpError } from "../middleware/errors.js";
import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { cachedLoad } from "../utils/cache.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const HENRIK_ORIGIN = "https://api.henrikdev.xyz";
const VALORANT_API_ORIGIN = "https://valorant-api.com";
const DDRAGON_ORIGIN = "https://ddragon.leagueoflegends.com";
const REGIONS = new Set(["euw1", "eun1", "na1", "kr", "br1", "la1", "la2", "jp1", "oc1", "tr1", "ru"]);

async function loadValorantBundleCatalogue(env) {
  const result = await cachedLoad("valorant:bundles:catalogue", 3600, async () => {
    try {
      const response = await requestExternal(new URL("/v1/bundles?language=fr-FR", VALORANT_API_ORIGIN), {
        env,
        expectedOrigin: VALORANT_API_ORIGIN,
        service: "tracker",
        dedupeKey: "valorant:bundles:catalogue",
        retries: 1,
        maxBytes: 8388608
      });
      const bundles = Array.isArray(response.data?.data) ? response.data.data : [];
      return Object.freeze(new Map(bundles.map((bundle) => [
        safeText(bundle?.uuid, 64).toLowerCase(),
        {
          name: safeText(bundle?.displayName, 120),
          image: safePublicUrl(bundle?.displayIcon || bundle?.verticalPromoImage, ["valorant-api.com"])
        }
      ]).filter(([id]) => id)));
    } catch {
      return null;
    }
  });
  return result.data;
}

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

/** HenrikDev renvoie une fraction (0.34) ; on expose des pourcentages entiers (34). */
function normalizeDiscount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(Math.min(100, n <= 1 ? n * 100 : n));
}

function normalizeItem(item) {
  return {
    name: safeText(first(item?.name, item?.display_name, item?.displayName), 120),
    type: safeText(first(item?.type, item?.item_type), 60),
    image: safePublicUrl(first(item?.image, item?.icon, item?.displayIcon), ["valorant-api.com", "henrikdev.xyz"]),
    basePrice: safeNumber(first(item?.base_price, item?.basePrice), 0, 1_000_000),
    price: safeNumber(first(item?.discounted_price, item?.price, item?.base_price), 0, 1_000_000),
    discountPercent: normalizeDiscount(first(item?.discount_percent, item?.discountPercent))
  };
}

/**
 * Bundles à la une de la boutique Valorant (HenrikDev v2/store-featured, clé API requise).
 * La boutique quotidienne PERSONNELLE d'un joueur n'est pas disponible : Riot n'expose aucune API publique pour elle
 * (elle exige les jetons de connexion du joueur) et HenrikDev ne fournit que les bundles à la une et le catalogue des offres.
 */
export async function getValorantFeaturedStore(env, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "HENRIK_API_KEY");
  const response = await requestExternal(new URL("/valorant/v2/store-featured", HENRIK_ORIGIN), {
    env,
    expectedOrigin: HENRIK_ORIGIN,
    service: "tracker",
    dedupeKey: "henrik:store-featured:v2",
    headers: { Authorization: apiKey },
    retries: 1,
    maxBytes: 1048576
  });
  const raw = response.data?.data;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.bundles) ? raw.bundles : raw ? [raw] : [];
  const catalogue = await loadValorantBundleCatalogue(env);

  return list.slice(0, 10).map((bundle) => {
    const uuid = safeText(first(bundle?.bundle_uuid, bundle?.uuid, bundle?.bundleUuid), 64).toLowerCase();
    const known = catalogue?.get(uuid);
    const items = (Array.isArray(bundle?.items) ? bundle.items : []).slice(0, 40).map(normalizeItem);
    const seconds = Number(first(bundle?.seconds_remaining, bundle?.secondsRemaining));
    const expiresAt = first(bundle?.expires_at, bundle?.expiresAt);
    const expiry = Number.isFinite(Date.parse(expiresAt)) ? new Date(expiresAt).toISOString() : Number.isFinite(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
    return {
      uuid,
      name: known?.name || safeText(first(bundle?.name, bundle?.display_name), 120) || "Bundle",
      image: known?.image || safePublicUrl(first(bundle?.image, bundle?.displayIcon), ["valorant-api.com", "henrikdev.xyz"]),
      price: safeNumber(first(bundle?.bundle_price, bundle?.price, bundle?.total_discounted_cost), 0, 1_000_000),
      wholesaleOnly: Boolean(first(bundle?.whole_sale_only, bundle?.wholeSaleOnly)),
      expiresAt: expiry,
      items
    };
  });
}

async function loadChampionCatalogue(env) {
  const result = await cachedLoad("lol:champions:catalogue", 6 * 3600, async () => {
    const versions = await requestExternal(new URL("/api/versions.json", DDRAGON_ORIGIN), {
      env, expectedOrigin: DDRAGON_ORIGIN, service: "tracker", dedupeKey: "ddragon:versions", retries: 1, maxBytes: 262144
    });
    const version = safeText(Array.isArray(versions.data) ? versions.data[0] : "", 32);
    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) throw httpError("UPSTREAM_INVALID_RESPONSE", 502, { retryable: true });
    const champions = await requestExternal(new URL(`/cdn/${version}/data/fr_FR/champion.json`, DDRAGON_ORIGIN), {
      env, expectedOrigin: DDRAGON_ORIGIN, service: "tracker", dedupeKey: `ddragon:champions:${version}`, retries: 1, maxBytes: 4194304
    });
    const byKey = new Map();
    for (const champion of Object.values(champions.data?.data || {})) {
      const id = safeText(champion?.id, 40);
      byKey.set(String(champion?.key), {
        id: Number(champion?.key),
        name: safeText(champion?.name, 60),
        title: safeText(champion?.title, 80),
        icon: /^[A-Za-z0-9]+$/.test(id) ? `${DDRAGON_ORIGIN}/cdn/${version}/img/champion/${id}.png` : ""
      });
    }
    return Object.freeze({ version, byKey });
  });
  return result.data;
}

/**
 * Rotation gratuite hebdomadaire de League of Legends (API officielle Riot : champion-rotations).
 * La boutique (skins en promotion, packs) n'a pas d'API : seules la rotation et le catalogue de champions sont disponibles.
 */
export async function getLolRotation(env, region, apiKeyOverride) {
  const platform = String(region || "euw1").toLowerCase();
  if (!REGIONS.has(platform)) throw httpError("INVALID_PARAMETER", 400, { detail: "region" });
  const apiKey = apiKeyOverride || requireSecret(env, "RIOT_API_KEY");
  const origin = `https://${platform}.api.riotgames.com`;
  const [rotation, catalogue] = await Promise.all([
    requestExternal(new URL("/lol/platform/v3/champion-rotations", origin), {
      env, expectedOrigin: origin, service: "tracker", dedupeKey: `riot:rotation:${platform}`, headers: { "X-Riot-Token": apiKey }, retries: 1
    }),
    loadChampionCatalogue(env)
  ]);
  const describe = (ids) => (Array.isArray(ids) ? ids : []).slice(0, 60).map((id) => catalogue.byKey.get(String(id)) || { id: Number(id), name: `Champion ${id}`, title: "", icon: "" });
  // Deux formes existent : { freeChampionIds, freeChampionIdsForNewPlayers, maxNewPlayerLevel } (documentation) et
  // { sr, newplayer } (réponse observée en septembre 2026). On lit les deux.
  const data = rotation.data && typeof rotation.data === "object" ? rotation.data : {};
  const freeIds = first(data.freeChampionIds, data.sr);
  const newPlayerIds = first(data.freeChampionIdsForNewPlayers, data.newplayer);
  if (!Array.isArray(freeIds)) throw httpError("UPSTREAM_INVALID_RESPONSE", 502, { retryable: true, detail: { fields: Object.keys(data).slice(0, 8) } });
  return {
    region: platform,
    gameVersion: catalogue.version,
    free: describe(freeIds),
    freeForNewPlayers: describe(newPlayerIds),
    maxNewPlayerLevel: safeNumber(data.maxNewPlayerLevel, 0, 100)
  };
}
