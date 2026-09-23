/**
 * Construit le jeu d'icônes ETHONE (lib/ethone-icon-set.json) à partir de l'API publique Iconify.
 *
 * Les icônes sont téléchargées UNE FOIS ici, puis embarquées dans le projet : le site n'appelle jamais
 * l'API Iconify en production (pas de dépendance externe, pas de changement de CSP, aucune latence).
 *
 * Usage (depuis ethone-next/) : node scripts/build-icon-set.mjs
 * Configuration : scripts/icon-set.config.json (clé sémantique -> nom d'icône du jeu source).
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(resolve(root, "scripts/icon-set.config.json"), "utf8"));
const { source, style, icons: wanted } = config;

// Nom réel dans le jeu source (ex. "house" -> "house-duotone").
const remoteName = (name) => (style && style !== "regular" ? `${name}-${style}` : name);
const remoteNames = [...new Set(Object.values(wanted).map(remoteName))];

const collected = {};
let meta = { width: 256, height: 256 };
for (let i = 0; i < remoteNames.length; i += 25) {
  const chunk = remoteNames.slice(i, i + 25);
  const res = await fetch(`https://api.iconify.design/${source}.json?icons=${chunk.join(",")}`, {
    headers: { "User-Agent": "ethone-icon-build/1.0" },
  });
  if (!res.ok) throw new Error(`Iconify API : HTTP ${res.status}`);
  const json = await res.json();
  meta = { width: json.width ?? meta.width, height: json.height ?? meta.height };
  Object.assign(collected, json.icons || {});
  // Alias éventuels (l'API renvoie parfois un alias vers l'icône réelle).
  for (const [alias, def] of Object.entries(json.aliases || {})) {
    const target = json.icons?.[def.parent];
    if (target) collected[alias] = { ...target, ...Object.fromEntries(Object.entries(def).filter(([k]) => k !== "parent")) };
  }
}

const missing = [];
const out = {};
for (const [key, name] of Object.entries(wanted)) {
  const def = collected[remoteName(name)];
  if (!def) {
    missing.push(`${key} -> ${source}:${remoteName(name)}`);
    continue;
  }
  out[key] = def;
}
if (missing.length) {
  console.error("Icônes introuvables :\n  " + missing.join("\n  "));
  process.exit(1);
}

const set = { prefix: "ethone", width: meta.width, height: meta.height, icons: out };
await writeFile(resolve(root, "lib/ethone-icon-set.json"), JSON.stringify(set) + "\n");
console.log(`lib/ethone-icon-set.json : ${Object.keys(out).length} icônes (${source}, ${style})`);
