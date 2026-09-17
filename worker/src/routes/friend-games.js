import { httpError } from "../middleware/errors.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";
import { DINO_FALLBACK_HTML } from "../assets/dinoFallback.js";
import { ADMIN_EMAILS } from "./admin.js";

// KV-backed manual override: lets the admin paste a known-good HTML file
// from the dashboard (/admin) when the friend's GitHub repo is broken,
// without needing a code change + redeploy each time (unlike
// DINO_FALLBACK_HTML below, which is static and baked into the Worker
// bundle). Sits between the live GitHub fetch and that static bundle in
// priority — see friendGameDinoRoute.
const OVERRIDE_KV_KEY = "dino";
const MAX_OVERRIDE_BYTES = 2 * 1024 * 1024;

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
// go stale again whenever the friend renames the file, as it already has
// twice (dino.html -> majdino.html -> dino.html). Barely matters now: even
// if this guess is wrong or the file it points to is incomplete,
// isCompleteHtml() below catches it and DINO_FALLBACK_HTML takes over.
const FALLBACK_FILE = "dino.html";
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

// Guards against exactly the failure mode that kept recurring: the friend's
// repo has now been observed with a truncated file (cut off mid-tag, no
// closing </html>) on three separate pushes. Rather than serve broken HTML
// into the game's iframe, anything that doesn't look like a complete
// document is treated as a fetch failure and falls through to
// DINO_FALLBACK_HTML below.
function isCompleteHtml(text) {
  if (typeof text !== "string" || text.length < 500) return false;
  return /<\/html\s*>\s*$/i.test(text.trim());
}

function requireAdmin(auth) {
  if (!auth?.userId) throw httpError("AUTH_REQUIRED", 401);
  if (!ADMIN_EMAILS.has(String(auth.email || "").toLowerCase())) throw httpError("FORBIDDEN", 403);
}

// Priority order: live GitHub (self-heals automatically the moment the
// friend pushes a complete file, no admin action needed) > the admin's
// KV-stored override (dashboard-editable, survives without a redeploy) >
// the static bundle baked into the Worker (last resort, never fails).
export async function friendGameDinoRoute({ env }) {
  const sourceUrl = await resolveSourceUrl();
  const loader = async () => {
    const res = await fetch(sourceUrl, { headers: { accept: "text/plain" } });
    if (!res.ok) throw httpError("UPSTREAM_UNAVAILABLE", 503);
    const text = await res.text();
    if (!isCompleteHtml(text)) throw httpError("UPSTREAM_INVALID_RESPONSE", 502);
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
    // The live file is unreachable or came back incomplete. Nothing here is
    // cached as a failure, so a properly re-pushed file on the friend's side
    // is picked up again automatically on the very next request.
    let overrideHtml = null;
    try {
      overrideHtml = await env.GAME_OVERRIDES?.get(OVERRIDE_KV_KEY);
    } catch {}
    const html = isCompleteHtml(overrideHtml) ? overrideHtml : DINO_FALLBACK_HTML;
    return routeResult(null, {}, {
      raw: true,
      response: new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      }),
    });
  }
}

export async function gameDinoOverrideSetRoute({ request, env, auth }) {
  requireAdmin(auth);
  const text = await request.text();
  if (!text || text.length > MAX_OVERRIDE_BYTES) throw httpError("INVALID_REQUEST", 413);
  if (!isCompleteHtml(text)) {
    throw httpError("INVALID_REQUEST", 400, {
      detail: "Fichier incomplet : il doit se terminer par une balise </html> fermante.",
    });
  }
  await env.GAME_OVERRIDES.put(OVERRIDE_KV_KEY, text, {
    metadata: { uploadedAt: new Date().toISOString(), uploadedBy: auth.email, sizeBytes: text.length },
  });
  return { data: { ok: true, sizeBytes: text.length } };
}

export async function gameDinoOverrideClearRoute({ env, auth }) {
  requireAdmin(auth);
  await env.GAME_OVERRIDES.delete(OVERRIDE_KV_KEY);
  return { data: { ok: true } };
}

export async function gameDinoOverrideStatusRoute({ env, auth }) {
  requireAdmin(auth);
  const { value, metadata } = await env.GAME_OVERRIDES.getWithMetadata(OVERRIDE_KV_KEY);
  return { data: { active: !!value, ...(metadata || {}) } };
}
