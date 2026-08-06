import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const { V8_SOURCE_KEYS } = await import("../v8/i18n/catalog.mjs");
const sourceKeys = new Set(V8_SOURCE_KEYS);

const INVARIANTS = new Set([
  "ETHONE", "V8", "OS", "ESC", "Ctrl K", "Ctrl S", "Brain", "GitHub", "Discord",
  "Spotify", "YouTube", "Twitch", "Reddit", "Notion", "Todoist", "GitHub", "Google",
  "Lanyard", "Valorant", "League of Legends", "Apex Legends", "Riot", "Supabase", "Cloudflare",
  "Ctrl P", "Up/Down", "F2", "Ctrl+/", "neutral", "string", "string?"
]);
const SKIP_FILES = new Set([
  "v8/i18n/catalog.mjs",
  "v8/i18n/runtime.mjs",
  "v8/i18n/patches.mjs",
  "v8/data/changelog.mjs",
  "v8/data/activity-journal.mjs",
  "v8/data/integrations.mjs",
  "v8/entry/login.mjs",
  "v8/brain/action-registry.mjs",
  "v8/services/sound-manager.mjs"
]);

function normalizeText(value) {
  return String(value ?? "").replace(/\\\"/g, "\"").replace(/\\n/g, " ").replace(/\\t/g, " ").replace(/\s+/g, " ").trim();
}

function isSkipped(str) {
  if (!str) return true;
  if (sourceKeys.has(str)) return true;
  if (INVARIANTS.has(str)) return true;
  if (/^[\d\s\/\-:.,!?#$%&*()+=_~`|\\<>[\]{}]+$/.test(str)) return true;
  if (/^[a-z]+(\/[a-z]+)+$/.test(str)) return true;
  if (/^(https?:|data:|\/|#|v8\/|\.\/)/.test(str)) return true;
  if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(str) && str.length < 25) return true;
  if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw|s|ms|deg|fr)?$/.test(str)) return true;
  return false;
}

function extractStrings(file) {
  const source = fs.readFileSync(file, "utf8");
  const results = [];
  const patterns = [
    /text:\s*(?:translateSource\()?\s*"((?:[^"\\]|\\.){2,})"\s*\)?/g,
    /text:\s*(?:translateSource\()?\s*'((?:[^'\\]|\\.){2,})'\s*\)?/g,
    /title:\s*(?:translateSource\()?\s*"((?:[^"\\]|\\.){2,})"\s*\)?/g,
    /"aria-label":\s*(?:translateSource\()?\s*"((?:[^"\\]|\\.){2,})"\s*\)?/g,
    /placeholder:\s*(?:translateSource\()?\s*"((?:[^"\\]|\\.){2,})"\s*\)?/g,
    /data-tooltip:\s*(?:translateSource\()?\s*"((?:[^"\\]|\\.){2,})"\s*\)?/g,
    /\{ text:\s*(?:translateSource\()?\s*"((?:[^"\\]|\\.){2,})"\s*\)?\s*\}/g,
    /settingRow\([^,]+,\s*"((?:[^"\\]|\\.){2,})"(?:,\s*"((?:[^"\\]|\\.){2,})")?/g,
    /choice\([^,]+,\s*[^,]+,\s*"((?:[^"\\]|\\.){2,})"/g,
    /switchControl\([^,]+,\s*"((?:[^"\\]|\\.){2,})"/g,
    /label:\s*"((?:[^"\\]|\\.){2,})"/g,
    /copy:\s*"((?:[^"\\]|\\.){2,})"/g,
    /description:\s*"((?:[^"\\]|\\.){2,})"/g,
    /title:\s*"((?:[^"\\]|\\.){2,})"/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      results.push({ file, raw: match[1], text: normalizeText(match[1]), line: source.slice(0, match.index).split("\n").length });
    }
  }
  return results;
}

function walk(dir, relative = "") {
  const found = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.posix.join(relative.replace(/\\/g, "/"), entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "test" || entry.name === ".devin") continue;
      found.push(...walk(path.join(dir, entry.name), rel));
    } else if (/\.(mjs|js|css|html)$/.test(entry.name)) {
      if (SKIP_FILES.has(rel)) continue;
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

const files = walk(path.join(root, "v8"), "v8");
const matches = [];
for (const file of files) {
  matches.push(...extractStrings(file));
}

const missing = [];
const seen = new Set();
for (const m of matches) {
  if (isSkipped(m.text)) continue;
  const key = `${m.file}:${m.text}`;
  if (seen.has(key)) continue;
  seen.add(key);
  missing.push(m);
}

missing.sort((a, b) => a.file.localeCompare(b.file) || a.text.localeCompare(b.text));

if (!missing.length) {
  console.log("No untranslated strings found.");
} else {
  console.log(`Found ${missing.length} untranslated strings:\n`);
  for (const m of missing) {
    console.log(`${m.file}:${m.line}  "${m.text}"`);
  }
}
