import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";
import { BREACH_FALLBACK_HTML } from "../assets/breachFallback.js";
import { isCompleteHtml } from "./friend-games.js";

// ETHONE: BREACH is a multi-file HTML/CSS/JS game (unlike the single-file
// Dino game), so it can't be embedded as-is: the iframe only ever gets one
// URL, and the game's own <link>/<script src> tags are relative paths that
// wouldn't resolve against our route. Instead we fetch every source file
// from GitHub and inline them into index.html (css -> <style>, each
// js -> <script>) to produce one self-contained document, then cache the
// result. A GitHub push is picked up automatically on the next cache miss.
const REPO_OWNER = "Rub19";
const REPO_NAME = "ethone-breach";
const REPO_BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/`;

const CSS_PATH = "css/style.css";
// Order matters: mirrors index.html's own <script> tag order exactly
// (i18n engine and locale catalogs must load before anything that reads
// them, storage/missions before game.js, etc).
const SCRIPT_PATHS = [
  "js/i18n/i18n.js",
  "js/i18n/fr.js",
  "js/i18n/en.js",
  "js/audio.js",
  "js/storage.js",
  "js/missions.js",
  "js/achievements.js",
  "js/shop.js",
  "js/minigames/handshake.js",
  "js/minigames/firewall.js",
  "js/minigames/crypto.js",
  "js/minigames/sequence.js",
  "js/minigames/nodes.js",
  "js/minigames/extraction.js",
  "js/game.js",
];

// A literal "</script>" (or "</style>") inside the source text would close
// the inline tag early and truncate the page. Breaking the token with a
// backslash keeps it valid JS/CSS (identical string/content at runtime)
// while making it harmless as HTML.
function escapeClosing(text, tag) {
  return text.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);
}

async function fetchRaw(relativePath) {
  const res = await fetch(RAW_BASE + relativePath, { headers: { accept: "text/plain" } });
  if (!res.ok) throw new Error(`${relativePath} -> ${res.status}`);
  return res.text();
}

async function assembleBreachHtml() {
  const [html, cssRaw, ...scriptsRaw] = await Promise.all([
    fetchRaw("index.html"),
    fetchRaw(CSS_PATH),
    ...SCRIPT_PATHS.map(fetchRaw),
  ]);

  const fileMap = new Map();
  fileMap.set(CSS_PATH, escapeClosing(cssRaw, "style"));
  SCRIPT_PATHS.forEach((p, i) => fileMap.set(p, escapeClosing(scriptsRaw[i], "script")));

  let out = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g, (match, href) => {
    const css = fileMap.get(href);
    return css !== undefined ? `<style>${css}</style>` : match;
  });
  out = out.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (match, src) => {
    const js = fileMap.get(src);
    return js !== undefined ? `<script>${js}</script>` : match;
  });

  if (!isCompleteHtml(out)) throw new Error("assembled breach html incomplete");
  return out;
}

export async function gameBreachRoute() {
  try {
    const { data: html } = await cachedLoad("game:breach", 300, assembleBreachHtml);
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
    // Live assembly failed (GitHub hiccup, a file temporarily missing mid-push)
    // — serve the baked-in snapshot instead of a broken page. Not cached as a
    // failure, so a working GitHub state is picked up again on the next request.
    return routeResult(null, {}, {
      raw: true,
      response: new Response(BREACH_FALLBACK_HTML, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      }),
    });
  }
}
