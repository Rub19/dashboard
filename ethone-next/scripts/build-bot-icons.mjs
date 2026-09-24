/**
 * Génère les icônes utilisées par les embeds du bot Discord (auteur / vignette / pied de page) :
 * pastille dégradée + pictogramme blanc, AUCUN texte. Servies par le site : https://ethone.dev/bot-icons/<nom>.png
 *
 * Usage (depuis ethone-next/) : node scripts/build-bot-icons.mjs
 * Pictogrammes : jeu Phosphor (@iconify-json/ph, licence MIT). Modifier ICONS ci-dessous puis relancer.
 */
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/bot-icons");
await mkdir(out, { recursive: true });
const ph = JSON.parse(await readFile(resolve(root, "node_modules/@iconify-json/ph/icons.json"), "utf8"));

// nom du fichier -> [pictogramme Phosphor, couleur haute, couleur basse]
const ICONS = {
  success: ["check-bold", "#4ade80", "#16a34a"],
  error: ["x-bold", "#f87171", "#dc2626"],
  warning: ["warning-bold", "#fbbf24", "#d97706"],
  info: ["info-bold", "#818cf8", "#4f46e5"],
  denied: ["lock-bold", "#fb7185", "#be123c"],
  neutral: ["dots-three-bold", "#94a3b8", "#475569"],
  music: ["music-notes-fill", "#a78bfa", "#7c3aed"],
  voice: ["microphone-fill", "#22d3ee", "#0891b2"],
  giveaway: ["gift-fill", "#f472b6", "#db2777"],
  ticket: ["ticket-fill", "#fb923c", "#ea580c"],
  moderation: ["gavel-fill", "#f87171", "#b91c1c"],
  ai: ["sparkle-fill", "#c084fc", "#9333ea"],
  welcome: ["hand-waving-fill", "#a3e635", "#65a30d"],
  economy: ["coins-fill", "#fde047", "#ca8a04"],
  security: ["shield-check-fill", "#34d399", "#059669"],
  logs: ["scroll-fill", "#94a3b8", "#475569"],
  event: ["calendar-star-fill", "#fb923c", "#c2410c"],
  level: ["medal-fill", "#fbbf24", "#b45309"],
  birthday: ["cake-fill", "#f9a8d4", "#be185d"],
  reminder: ["bell-ringing-fill", "#7dd3fc", "#0284c7"],
};

function glyph(name) {
  const def = ph.icons[name] || ph.icons[ph.aliases?.[name]?.parent];
  if (!def) throw new Error(`Pictogramme Phosphor introuvable : ${name}`);
  return def.body;
}

const svg = (icon, top, bottom) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <circle cx="64" cy="64" r="62" fill="url(#g)"/>
  <circle cx="64" cy="64" r="62" fill="url(#shine)"/>
  <g transform="translate(64 64) scale(0.27) translate(-128 -128)" fill="#ffffff" color="#ffffff">${glyph(icon)}</g>
</svg>`;

for (const [name, [icon, top, bottom]] of Object.entries(ICONS)) {
  await sharp(Buffer.from(svg(icon, top, bottom)), { density: 384 }).resize(128, 128).png({ compressionLevel: 9 }).toFile(resolve(out, `${name}.png`));
}
// logo de marque (pied de page des embeds) : le prisme, sans texte
await sharp(resolve(root, "public/icons/ethone-icon-192.png")).resize(128, 128).png().toFile(resolve(out, "ethone.png"));
console.log(`${Object.keys(ICONS).length + 1} icônes écrites dans public/bot-icons/`);
