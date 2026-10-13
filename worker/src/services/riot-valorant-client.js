import { httpError } from "../middleware/errors.js";

const RIOT_AUTH_ORIGIN = "https://auth.riotgames.com";
const RIOT_ENTITLEMENTS_ORIGIN = "https://entitlements.auth.riotgames.com";
const VALORANT_CLIENT_PLATFORM = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";
const VALID_SHARDS = new Set(["eu", "na", "ap", "kr"]);

let cachedClientVersion = "release-13.06-shipping-18-5590001";
let clientVersionExpires = 0;

async function getLiveClientVersion() {
  if (Date.now() < clientVersionExpires) {
    return cachedClientVersion;
  }
  try {
    const res = await fetch("https://valorant-api.com/v1/version");
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.riotClientVersion) {
        cachedClientVersion = data.data.riotClientVersion;
        clientVersionExpires = Date.now() + 3600000;
        return cachedClientVersion;
      }
    }
  } catch {}
  return cachedClientVersion;
}

export async function authenticateValorantRiot({ username, password, cookies = "", action = "login", mfaCode = "" }) {
  if (action === "mfa") {
    if (!mfaCode) {
      throw httpError("INVALID_PARAMETER", 400, { detail: "mfaCode is required" });
    }
    const mfaRes = await fetch(`${RIOT_AUTH_ORIGIN}/api/v1/authorization`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "RiotClient/99.0.0.0 (rso-auth)",
        Cookie: cookies,
      },
      body: JSON.stringify({
        type: "multifactor",
        code: mfaCode,
        rememberDevice: true,
      }),
    });
    const mfaData = await mfaRes.json();
    return handleAuthResponse(mfaData, cookies);
  }

  const initRes = await fetch(`${RIOT_AUTH_ORIGIN}/api/v1/authorization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RiotClient/99.0.0.0 (rso-auth)",
    },
    body: JSON.stringify({
      client_id: "play-valorant-web-prod",
      nonce: "1",
      redirect_uri: "https://playvalorant.com/opt_in",
      response_type: "token id_token",
      scope: "account openid",
    }),
  });

  const rawCookies = initRes.headers.get("set-cookie") || "";
  const cookieHeader = extractCookieHeader(rawCookies);

  const authRes = await fetch(`${RIOT_AUTH_ORIGIN}/api/v1/authorization`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RiotClient/99.0.0.0 (rso-auth)",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      type: "auth",
      username,
      password,
      remember: true,
    }),
  });

  const authData = await authRes.json();
  const stepCookies = [cookieHeader, extractCookieHeader(authRes.headers.get("set-cookie") || "")].filter(Boolean).join("; ");

  if (authData?.type === "multifactor") {
    return {
      status: "mfa_required",
      method: authData?.multifactor?.method || "email",
      email: authData?.multifactor?.email || "",
      cookies: stepCookies,
    };
  }

  return handleAuthResponse(authData, stepCookies);
}

function extractCookieHeader(setCookieHeader) {
  if (!setCookieHeader) return "";
  return setCookieHeader
    .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
    .map((c) => c.trim().split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function handleAuthResponse(data, cookies) {
  if (data?.error) {
    throw httpError("AUTH_REJECTED", 401, { detail: data.error });
  }

  const uri = data?.response?.parameters?.uri;
  if (!uri) {
    if (data?.type === "multifactor") {
      return {
        status: "mfa_required",
        method: data?.multifactor?.method || "email",
        email: data?.multifactor?.email || "",
        cookies,
      };
    }
    throw httpError("AUTH_FAILED", 401, { detail: "Authentication failed. Please verify credentials." });
  }

  const fragment = uri.split("#")[1] || "";
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");

  if (!accessToken) {
    throw httpError("AUTH_FAILED", 401, { detail: "Missing access token from Riot." });
  }

  const entitlementsRes = await fetch(`${RIOT_ENTITLEMENTS_ORIGIN}/api/token/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  const entitlementsData = await entitlementsRes.json();
  const entitlementsToken = entitlementsData?.entitlements_token;

  const userInfoRes = await fetch(`${RIOT_AUTH_ORIGIN}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const userInfo = await userInfoRes.json();
  const puuid = userInfo?.sub;

  return {
    status: "authenticated",
    accessToken,
    idToken,
    entitlementsToken,
    puuid,
    userInfo: {
      sub: puuid,
      country: userInfo?.country || "FRA",
    },
  };
}

export async function fetchValorantStorefront({ accessToken, entitlementsToken, puuid, shard = "eu" }) {
  const cleanShard = VALID_SHARDS.has(shard.toLowerCase()) ? shard.toLowerCase() : "eu";
  const clientVersion = await getLiveClientVersion();
  const url = `https://pd.${cleanShard}.a.pvp.net/store/v2/storefront/${puuid}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Riot-Entitlements-JWT": entitlementsToken,
      "X-Riot-ClientPlatform": VALORANT_CLIENT_PLATFORM,
      "X-Riot-ClientVersion": clientVersion,
    },
  });

  if (!res.ok) {
    throw httpError("UPSTREAM_ERROR", res.status, { detail: `Storefront returned ${res.status}` });
  }

  const data = await res.json();
  const singleItemOffers = data?.SkinsPanelLayout?.SingleItemOffers || [];
  const remainingSeconds = data?.SkinsPanelLayout?.SingleItemOffersRemainingDurationInSeconds || 0;
  const bonusStore = data?.BonusStore?.BonusStoreOffers || [];

  return {
    dailyOffers: singleItemOffers,
    remainingSeconds,
    bonusStore: bonusStore.map((b) => ({
      itemId: b?.Offer?.Rewards?.[0]?.ItemID,
      discountPercent: b?.DiscountPercent || 0,
      discountCosts: b?.DiscountCosts || {},
      originalCost: b?.Offer?.Cost || {},
    })),
  };
}

export async function fetchValorantInventory({ accessToken, entitlementsToken, puuid, shard = "eu" }) {
  const cleanShard = VALID_SHARDS.has(shard.toLowerCase()) ? shard.toLowerCase() : "eu";
  const clientVersion = await getLiveClientVersion();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Riot-Entitlements-JWT": entitlementsToken,
    "X-Riot-ClientPlatform": VALORANT_CLIENT_PLATFORM,
    "X-Riot-ClientVersion": clientVersion,
  };

  const [skinsRes, buddiesRes, cardsRes, walletRes] = await Promise.allSettled([
    fetch(`https://pd.${cleanShard}.a.pvp.net/store/v1/entitlements/${puuid}/e7c633d8-87e2-40b4-8255-a228392576b9`, { headers }),
    fetch(`https://pd.${cleanShard}.a.pvp.net/store/v1/entitlements/${puuid}/dd3bf334-87f3-4070-b08d-11719c49d301`, { headers }),
    fetch(`https://pd.${cleanShard}.a.pvp.net/store/v1/entitlements/${puuid}/3f296c07-64c3-494c-923b-fe692a4fa1bd`, { headers }),
    fetch(`https://pd.${cleanShard}.a.pvp.net/store/v1/wallet/${puuid}`, { headers }),
  ]);

  const skins = skinsRes.status === "fulfilled" && skinsRes.value.ok ? (await skinsRes.value.json())?.Entitlements || [] : [];
  const buddies = buddiesRes.status === "fulfilled" && buddiesRes.value.ok ? (await buddiesRes.value.json())?.Entitlements || [] : [];
  const cards = cardsRes.status === "fulfilled" && cardsRes.value.ok ? (await cardsRes.value.json())?.Entitlements || [] : [];
  const wallet = walletRes.status === "fulfilled" && walletRes.value.ok ? (await walletRes.value.json())?.Balances || {} : {};

  return {
    skins: skins.map((s) => s?.ItemID).filter(Boolean),
    buddies: buddies.map((b) => b?.ItemID).filter(Boolean),
    cards: cards.map((c) => c?.ItemID).filter(Boolean),
    wallet: {
      vp: wallet["85ad13f7-3d1b-449e-bc71-32fe52c7780f"] || 0,
      radianite: wallet["e59aa87c-4c31-4c81-ab3d-ec93c9a34221"] || 0,
      kingdomCredits: wallet["85ca9543-7625-497e-ad57-974597dcacba"] || 0,
    },
  };
}
