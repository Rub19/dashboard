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

const unescapeXml = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

export function appFromAtom(app, xml) {
  const entry = /<entry>([\s\S]*?)<\/entry>/.exec(String(xml || ""))?.[1] ?? "";
  const tag = /releases\/tag\/([^"<]+)/.exec(entry)?.[1];
  const notes = /<content[^>]*>([\s\S]*?)<\/content>/.exec(entry)?.[1] ?? "";
  const text = unescapeXml(unescapeXml(notes).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return appFromFeed(app, { version: tag ? decodeURIComponent(tag) : null, notes: text, pub_date: /<updated>([^<]+)<\/updated>/.exec(entry)?.[1] });
}

async function loadApp(env, app) {
  try {
    if (app.feed) {
      const origin = new URL(app.feed).origin;
      const response = await requestExternal(new URL(app.feed), { env, expectedOrigin: origin, service: "apps", dedupeKey: `apps:${app.id}`, retries: 1, timeoutMs: 8000 });
      return appFromFeed(app, response.data);
    }
    const response = await fetch(`https://github.com/${app.repo}/releases.atom`, { headers: { "user-agent": "Ethone-Worker" }, signal: AbortSignal.timeout(8000) });
    return response.ok ? appFromAtom(app, await response.text()) : appFromFeed(app, null);
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
