import { authenticateValorantRiot, fetchValorantStorefront, fetchValorantInventory } from "../services/riot-valorant-client.js";
import { routeResult } from "../utils/response.js";
import { httpError } from "../middleware/errors.js";

async function readJsonBody(request, maxFields = 10) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw httpError("INVALID_REQUEST", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    throw httpError("INVALID_REQUEST", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > maxFields) {
    throw httpError("INVALID_REQUEST", 400);
  }
  return body;
}

export async function valorantAuthRoute({ request }) {
  const body = await readJsonBody(request, 10);
  const { username, password, cookies, action, mfaCode } = body;

  if (action !== "mfa" && (!username || !password)) {
    throw httpError("INVALID_PARAMETER", 400, { detail: "username and password are required" });
  }

  const result = await authenticateValorantRiot({
    username,
    password,
    cookies,
    action,
    mfaCode,
  });

  return routeResult(result, { source: "riot", cached: false });
}

export async function valorantStorefrontRoute({ request }) {
  const body = await readJsonBody(request, 6);
  const { accessToken, entitlementsToken, puuid, shard } = body;

  if (!accessToken || !entitlementsToken || !puuid) {
    throw httpError("INVALID_PARAMETER", 400, { detail: "accessToken, entitlementsToken and puuid are required" });
  }

  const result = await fetchValorantStorefront({
    accessToken,
    entitlementsToken,
    puuid,
    shard: shard || "eu",
  });

  return routeResult(result, { source: "riot", cached: false });
}

export async function valorantInventoryRoute({ request }) {
  const body = await readJsonBody(request, 6);
  const { accessToken, entitlementsToken, puuid, shard } = body;

  if (!accessToken || !entitlementsToken || !puuid) {
    throw httpError("INVALID_PARAMETER", 400, { detail: "accessToken, entitlementsToken and puuid are required" });
  }

  const result = await fetchValorantInventory({
    accessToken,
    entitlementsToken,
    puuid,
    shard: shard || "eu",
  });

  return routeResult(result, { source: "riot", cached: false });
}
