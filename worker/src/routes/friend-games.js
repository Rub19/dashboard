import { httpError } from "../middleware/errors.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

// raw.githubusercontent.com serves this as text/plain regardless of the
// file's actual content, so it can never be embedded directly as an iframe
// src — the Worker fetches it server-side and re-serves it with the right
// content-type instead. A plain fetch() is used (not utils/external-request.js's
// requestExternal) because that helper unconditionally JSON-parses the
// response body, which is wrong for raw HTML passthrough.
const REPO_OWNER = "Lehnoxzs";
const REPO_NAME = "HAARPE-DINO-GAME";
const REPO_BRANCH = "main";
// Absolute last resort if discovery has never once succeeded since this
// isolate started (see lastKnownGoodUrl below) — a filename guess that WILL
// go stale again whenever the friend renames the file, same as it already
// did once (dino.html -> majdino.html). Kept only so the game isn't fully
// broken on a cold isolate during a GitHub outage.
const FALLBACK_FILE = "majdino.html";
const GITHUB_API_HEADERS = { accept: "application/vnd.github+json", "user-agent": "ethone-worker" };

// Updated every time discovery (or a direct content fetch) succeeds, so a
// transient GitHub failure — an API rate limit, a blip — falls back to the
// URL that was actually working a moment ago instead of a guessed filename
// that may no longer exist. Lost on isolate restart; discovery just runs
// again from scratch on the next request.
let lastKnownGoodUrl = null;

// The listing's ETag from the last successful (200) discovery. Re-sent as
// If-None-Match on every subsequent call so GitHub can answer "nothing
// changed" with a 304 — and per GitHub's own docs, a 304 does NOT count
// against the unauthenticated 60 requests/hour rate limit. That's what lets
// discovery run on every single page load (always reflecting whatever the
// friend most recently pushed) instead of only once an hour: as long as the
// repo hasn't changed, repeated checks are free.
let listingEtag = null;

// Auto-discovers which .html file in the repo root is the current game, so
// a rename on the friend's side (this already happened twice: dino ->
// dino.html -> majdino.html) doesn't require a code change here again.
async function discoverHtmlSource() {
  const headers = listingEtag ? { ...GITHUB_API_HEADERS, "if-none-match": listingEtag } : GITHUB_API_HEADERS;
  const listRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/?ref=${REPO_BRANCH}`,
    { headers }
  );
  if (listRes.status === 304 && lastKnownGoodUrl) return lastKnownGoodUrl;
  if (!listRes.ok) throw new Error(`contents list ${listRes.status}`);
  const entries = await listRes.json();
  const htmlFiles = Array.isArray(entries)
    ? entries.filter((entry) => entry.type === "file" && /\.html?$/i.test(entry.name))
    : [];
  if (htmlFiles.length === 0) throw new Error("no .html file found in repo root");

  let resolvedUrl;
  if (htmlFiles.length === 1) {
    resolvedUrl = htmlFiles[0].download_url;
  } else {
    // Multiple .html candidates (mid-rename, friend left the old one behind)
    // — pick whichever was committed most recently. Only runs while the
    // listing actually has more than one file, which is rare and transient.
    const withDates = await Promise.all(
      htmlFiles.map(async (file) => {
        const res = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${encodeURIComponent(file.path)}&per_page=1&sha=${REPO_BRANCH}`,
          { headers: GITHUB_API_HEADERS }
        );
        if (!res.ok) return { file, date: 0 };
        const commits = await res.json();
        const isoDate = Array.isArray(commits) ? commits[0]?.commit?.author?.date : null;
        return { file, date: isoDate ? new Date(isoDate).getTime() : 0 };
      })
    );
    withDates.sort((a, b) => b.date - a.date);
    resolvedUrl = withDates[0].file.download_url;
  }

  listingEtag = listRes.headers.get("etag");
  return resolvedUrl;
}

async function resolveSourceUrl() {
  try {
    const data = await discoverHtmlSource();
    lastKnownGoodUrl = data;
    return data;
  } catch {
    // Discovery failed outright (GitHub API hiccup, rate limit, repo
    // restructured) — fall back to whatever last worked, or the guessed
    // filename as a last resort; self-heals on the next request.
    return lastKnownGoodUrl || `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${FALLBACK_FILE}`;
  }
}

function unavailablePage() {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jeu indisponible</title>
<style>
  html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;
    background:#0a0806;color:#e5e5e5;font-family:system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
  button{margin-top:16px;padding:10px 20px;border-radius:10px;border:1px solid #444;background:#1a1a1a;color:#fff;font-size:14px;cursor:pointer}
  button:active{transform:scale(0.97)}
</style></head><body><div>
  <p>Le jeu est temporairement indisponible.</p>
  <button onclick="location.reload()">Reessayer</button>
</div></body></html>`;
}

export async function friendGameDinoRoute() {
  const sourceUrl = await resolveSourceUrl();
  const loader = async () => {
    const res = await fetch(sourceUrl, { headers: { accept: "text/plain" } });
    if (!res.ok) throw httpError("UPSTREAM_UNAVAILABLE", 503);
    const text = await res.text();
    lastKnownGoodUrl = sourceUrl;
    return text;
  };
  try {
    const { data: html } = await cachedLoad(`friend-game:dino:${sourceUrl}`, 300, loader);
    return routeResult(null, {}, {
      raw: true,
      response: new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      }),
    });
  } catch {
    // Surface a small styled HTML page instead of raw JSON error text —
    // this response is rendered directly inside the game's iframe, and a
    // bare {"ok":false,...} blob on a black background looks broken rather
    // than temporarily unavailable.
    return routeResult(null, {}, {
      raw: true,
      response: new Response(unavailablePage(), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      }),
    });
  }
}
