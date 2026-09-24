/**
 * Génère l'identité Discord du bot (avatar et bannière) :
 *   - Avatar   : l'esprit ETHONE d'origine, sans effets : fond sombre uni, « E » blanc franc et fin liseré circulaire
 *                dégradé violet / bleu ciel / vert. Version statique PNG et version animée GIF (seul le dégradé du
 *                liseré tourne lentement). Tout reste dans le cercle de sécurité de Discord, lisible jusqu'à 32 px.
 *   - Bannière : 1500x600 (ratio 5:2 = celui du profil Discord), fond sombre ETHONE à trame de points fine et deux arcs
 *                dégradés violet / bleu ciel / vert, mot ETHONE tracé et rangée des fonctions du bot. Le coin bas-gauche
 *                reste libre : l'avatar le recouvre.
 * Lettres et formes sont tracées (pas de police), donc identiques partout.
 *
 * Usage (depuis ethone-next/) : node scripts/build-discord-profile.mjs
 * Écrit dans public/branding/ : ethone-discord-avatar-v2.png, ethone-discord-avatar-animated.gif, ethone-discord-banner.png
 */
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const branding = resolve(root, "public/branding");
await mkdir(branding, { recursive: true });

// --- Avatar ------------------------------------------------------------------------------------------------------------
// Repère 100x100. « E » tracé comme celui du logo (tige + trois barres, extrémités arrondies).
const E_PATH = "M37 27v46m0-46h29M37 50h21M37 73h29";

/** `t` ∈ [0,1[ : l'angle du dégradé du liseré est périodique, donc la boucle est continue. */
function avatarSvg(t = 0, animated = false) {
  const angle = animated ? t * 360 : 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle.toFixed(2)} 0.5 0.5)">
      <stop offset="0" stop-color="#8b5cf6"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#34d399"/>
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171822"/><stop offset="1" stop-color="#0b0c12"/></linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#face)"/>
  <circle cx="50" cy="50" r="44" fill="none" stroke="url(#ring)" stroke-width="3.2"/>
  <path d="${E_PATH}" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const SIZE = 512;
const FRAMES = 40;
const DELAY_MS = 50;
const frames = [];
for (let i = 0; i < FRAMES; i++) {
  frames.push(await sharp(Buffer.from(avatarSvg(i / FRAMES, true)), { density: 384 }).resize(SIZE, SIZE).png().toBuffer());
}
await sharp(frames, { join: { across: 1, animated: true } })
  .gif({ delay: new Array(FRAMES).fill(DELAY_MS), loop: 0, effort: 7, dither: 0.6, colours: 256 })
  .toFile(resolve(branding, "ethone-discord-avatar-animated.gif"));
await sharp(Buffer.from(avatarSvg(0, false)), { density: 768 }).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-avatar-v2.png"));

// --- Bannière ----------------------------------------------------------------------------------------------------------
const W = 1500;
const H = 600;

// Trame de points très discrète.
const dots = [];
for (let row = 0; row < 10; row++) {
  for (let col = 0; col < 36; col++) {
    const x = col * 44 + (row % 2 ? 22 : 0) + 10;
    const y = row * 62 + 24;
    dots.push(`<circle cx="${x}" cy="${y}" r="1.6" fill="#ffffff" opacity="0.09"/>`);
  }
}

// Lettres tracées (repère de 26 unités de haut), trait arrondi.
const LETTERS = {
  E: { w: 18, d: "M0 0v26M0 0h18M0 13h13M0 26h18" },
  T: { w: 20, d: "M0 0h20M10 0v26" },
  H: { w: 18, d: "M0 0v26M18 0v26M0 13h18" },
  O: { w: 20, d: "M10 0a10 13 0 1 0 .01 0z" },
  N: { w: 18, d: "M0 26V0l18 26V0" },
};
const WORD = "ETHONE";
const GAP = 13;
const SCALE = 4.5;
const wordUnits = [...WORD].reduce((n, c) => n + LETTERS[c].w, 0) + GAP * (WORD.length - 1);
const WORD_X = 430;
const WORD_Y = 150;
let cursor = 0;
const glyphs = [...WORD]
  .map((c) => {
    const g = `<path transform="translate(${cursor} 0)" d="${LETTERS[c].d}"/>`;
    cursor += LETTERS[c].w + GAP;
    return g;
  })
  .join("");
const wordWidth = wordUnits * SCALE;

// rangée des fonctions du bot, avec les icônes déjà utilisées dans les embeds
const FEATURES = ["moderation", "music", "economy", "ticket", "level", "security"];
const featureImages = [];
for (let i = 0; i < FEATURES.length; i++) {
  const data = (await readFile(resolve(root, `public/bot-icons/${FEATURES[i]}.png`))).toString("base64");
  featureImages.push(`<image href="data:image/png;base64,${data}" x="${WORD_X + 10 + i * 130}" y="352" width="76" height="76"/>`);
}

const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171822"/><stop offset="0.55" stop-color="#0f1017"/><stop offset="1" stop-color="#0a0b10"/></linearGradient>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0"/><stop offset="0.35" stop-color="#8b5cf6"/><stop offset="0.65" stop-color="#38bdf8"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></linearGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4e7ff"/></linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.5" stop-color="#38bdf8"/><stop offset="1" stop-color="#34d399"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgb)"/>
  ${dots.join("")}
  <path d="M-40 520 C 380 380, 900 620, 1560 300" fill="none" stroke="url(#arc)" stroke-width="3"/>
  <path d="M-40 560 C 420 430, 940 650, 1560 350" fill="none" stroke="url(#arc)" stroke-width="1.4" opacity="0.5"/>
  <path d="M-40 90 C 420 200, 980 -20, 1560 150" fill="none" stroke="url(#arc)" stroke-width="1.4" opacity="0.35"/>
  <g transform="translate(${WORD_X} ${WORD_Y}) scale(${SCALE})" fill="none" stroke="url(#word)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">${glyphs}</g>
  <rect x="${WORD_X}" y="${WORD_Y + 26 * SCALE + 30}" width="${wordWidth.toFixed(0)}" height="4" rx="2" fill="url(#rule)"/>
  ${featureImages.join("\n  ")}
</svg>`;
await sharp(Buffer.from(bannerSvg), { density: 96 }).resize(W, H).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-banner.png"));

console.log("écrit dans public/branding : ethone-discord-avatar-v2.png, ethone-discord-avatar-animated.gif, ethone-discord-banner.png");
