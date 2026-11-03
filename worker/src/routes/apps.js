import { httpError } from "../middleware/errors.js";
import { assertAllowedQuery, queryText } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeText } from "../utils/normalize.js";
import { cachedLoad } from "../utils/cache.js";

export const APPS = Object.freeze([
  Object.freeze({ id: "kairo", name: "Kairo", summary: "Tracker League of Legends, VALORANT et TFT.", repo: "Rub19/ethra", page: "https://github.com/Rub19/ethra/releases" }),
  Object.freeze({ id: "hdv-tracker", name: "HDV Tracker", summary: "Carnet de prix du /ah de Rinaorc SkyBlock.", feed: "https://hdv.ethone.dev/updates/latest.json", page: "https://hdv.ethone.dev" }),
  Object.freeze({ id: "interior-studio", name: "Interior Studio", summary: "Conception d'intérieurs en 2D et 3D.", feed: "https://interior.ethone.dev/updates/latest.json", page: "https://interior.ethone.dev" }),
  Object.freeze({ id: "nova-pc-suite", name: "Nova PC Suite", summary: "Diagnostic, pilotes et maintenance de Windows.", repo: "Rub19/nova-pc-suite", page: "https://github.com/Rub19/nova-pc-suite/releases" })
]);

export function appFromFeed(app, data) {
  const version = safeText(String(data?.version ?? "").replace(/^v/, ""), 32);
  return Object.freeze({
    id: app.id,
    name: app.name,
    summary: app.summary,
    page: app.page,
    available: Boolean(version),
    version: version || null,
    notes: safeText(data?.notes, 2000) || null,
    date: safeText(data?.pub_date, 40) || null,
    download: safeText(data?.platforms?.["windows-x86_64"]?.url, 500) || null
  });
}

export function appFromRelease(app, release) {
  const asset = (release?.assets || []).find((item) => /\.(exe|msi)$/i.test(String(item?.name || "")));
  return appFromFeed(app, {
    version: release?.tag_name,
    notes: release?.body,
    pub_date: release?.published_at,
    platforms: { "windows-x86_64": { url: asset?.browser_download_url } }
  });
}

async function loadApp(env, app) {
  try {
    if (app.feed) {
      const origin = new URL(app.feed).origin;
      const response = await requestExternal(new URL(app.feed), { env, expectedOrigin: origin, service: "apps", dedupeKey: `apps:${app.id}`, retries: 1, timeoutMs: 8000 });
      return appFromFeed(app, response.data);
    }
    const origin = "https://api.github.com";
    const response = await requestExternal(new URL(`/repos/${app.repo}/releases/latest`, origin), { env, expectedOrigin: origin, service: "apps", dedupeKey: `apps:${app.id}`, headers: { "user-agent": "Ethone-Worker", accept: "application/vnd.github+json" }, retries: 1, timeoutMs: 8000 });
    return appFromRelease(app, response.data);
  } catch {
    return appFromFeed(app, null);
  }
}

export async function appsRoute({ env, url }) {
  assertAllowedQuery(url, ["id"]);
  const id = queryText(url, "id", { max: 32, required: false });
  const list = id ? APPS.filter((app) => app.id === id) : APPS;
  if (id && list.length === 0) throw httpError("NOT_FOUND", 404);
  const result = await cachedLoad(`apps:${id || "all"}`, 900, async () => Promise.all(list.map((app) => loadApp(env, app))));
  return { data: id ? result.data[0] : { apps: result.data } };
}
