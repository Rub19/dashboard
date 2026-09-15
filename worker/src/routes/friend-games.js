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
// Used only if live discovery (below) fails outright — the last known
// filename, not a hardcoded requirement.
const FALLBACK_FILE = "dino.html";
const GITHUB_API_HEADERS = { accept: "application/vnd.github+json", "user-agent": "ethone-worker" };

// Auto-discovers which .html file in the repo root is the current game, so
// a rename on the friend's side (this already happened once: dino -> dino.html)
// doesn't require a code change here again. Cached for an hour, separately
// from the game content itself — GitHub's unauthenticated REST API caps
// unauthenticated callers at 60 requests/hour per source IP, shared across
// all Cloudflare Worker traffic hitting github.com, so discovery must stay
// rare regardless of how often the game page itself is loaded.
async function discoverHtmlSource() {
  const listRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/?ref=${REPO_BRANCH}`,
    { headers: GITHUB_API_HEADERS }
  );
  if (!listRes.ok) throw new Error(`contents list ${listRes.status}`);
  const entries = await listRes.json();
  const htmlFiles = Array.isArray(entries)
    ? entries.filter((entry) => entry.type === "file" && /\.html?$/i.test(entry.name))
    : [];
  if (htmlFiles.length === 0) throw new Error("no .html file found in repo root");
  if (htmlFiles.length === 1) return htmlFiles[0].download_url;

  // Multiple .html candidates: pick whichever was committed most recently.
  // Bounded by however many .html files exist (normally just one), and this
  // whole function only runs once per hour thanks to the cache below.
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
  return withDates[0].file.download_url;
}

async function resolveSourceUrl() {
  try {
    const { data } = await cachedLoad("friend-game:dino-source", 3600, discoverHtmlSource);
    return data;
  } catch {
    // Discovery failed (GitHub API hiccup, rate limit, repo restructured) —
    // fall back to the last known filename rather than breaking the game
    // entirely; self-heals on the next hourly discovery attempt.
    return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${FALLBACK_FILE}`;
  }
}

export async function friendGameDinoRoute() {
  const sourceUrl = await resolveSourceUrl();
  const loader = async () => {
    const res = await fetch(sourceUrl, { headers: { accept: "text/plain" } });
    if (!res.ok) throw httpError("UPSTREAM_UNAVAILABLE", 503);
    return res.text();
  };
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
}
