/**
 * Génère l'identité Discord du bot. Deux créations distinctes (pas le logo du site) :
 *   - Avatar   : bouclier blanc sur fond violet-bleu uni ; l'intérieur dessine un « E » (clin d'œil à ETHONE) en
 *                négatif. Motif simple, centré, lisible jusqu'à 32 px, dans le cercle de sécurité de Discord.
 *                Version statique PNG et version animée GIF (fond qui tourne, reflet qui traverse le bouclier).
 *   - Bannière : 1500x600 (ratio 5:2 = celui du profil Discord), fond nuit vert-sarcelle à courbes de niveau, mot
 *                ETHONE tracé et rangée des fonctions du bot. Le coin bas-gauche reste libre : l'avatar le recouvre.
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
// Bouclier (repère 100x100) et « E » en négatif à l'intérieur : une tige et trois barres.
const SHIELD = "M50 9 L85 21 V47 C85 69 70 84 50 92 C30 84 15 69 15 47 V21 Z";
const E_BARS = `<rect x="35" y="33" width="9" height="39" rx="4.5"/><rect x="35" y="33" width="31" height="9" rx="4.5"/><rect x="35" y="47.5" width="24" height="9" rx="4.5"/><rect x="35" y="63" width="31" height="9" rx="4.5"/>`;

/** `t` ∈ [0,1[ : la boucle est continue (angle du fond et position du reflet sont périodiques). */
function avatarSvg(t = 0.12, animated = false) {
  const angle = animated ? t * 360 : 35;
  const glintX = animated ? -60 + t * 220 : -200;
  const breathe = animated ? 1 + 0.018 * Math.sin(t * Math.PI * 2) : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle.toFixed(2)} 0.5 0.5)">
      <stop offset="0" stop-color="#7c5cff"/><stop offset="0.55" stop-color="#5b46f0"/><stop offset="1" stop-color="#2f6bff"/>
    </linearGradient>
    <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe4ff"/></linearGradient>
    <linearGradient id="glint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="shieldClip"><path d="${SHIELD}"/></clipPath>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.2" stdDeviation="2.6" flood-color="#150c55" flood-opacity="0.45"/></filter>
    <mask id="ebars"><rect width="100" height="100" fill="#fff"/><g fill="#000">${E_BARS}</g></mask>
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-opacity="0.10" stroke-width="0.6"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="0.6"/>
  <g transform="translate(50 50) scale(${breathe.toFixed(4)}) translate(-50 -50)">
    <g filter="url(#shadow)"><path d="${SHIELD}" fill="url(#shield)" stroke="url(#shield)" stroke-width="3" stroke-linejoin="round" mask="url(#ebars)"/></g>
    <g clip-path="url(#shieldClip)"><rect x="${glintX.toFixed(1)}" y="-10" width="26" height="120" fill="url(#glint)" opacity="0.55" transform="rotate(20 50 50)"/></g>
  </g>
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
await sharp(Buffer.from(avatarSvg(0.12, false)), { density: 768 }).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-avatar-v2.png"));

// --- Bannière ----------------------------------------------------------------------------------------------------------
const W = 1500;
const H = 600;

// Courbes de niveau : lignes ondulées superposées, dégradé sarcelle → émeraude, opacité décroissante vers le bas.
const contours = [];
for (let i = 0; i < 16; i++) {
  const y0 = 40 + i * 38;
  const a1 = 26 + (i % 5) * 5;
  const a2 = 12 + (i % 3) * 4;
  const ph = i * 0.42;
  let d = "";
  for (let x = -20; x <= W + 20; x += 20) {
    const y = y0 + a1 * Math.sin(x / 210 + ph) + a2 * Math.sin(x / 95 + ph * 1.7);
    d += `${x === -20 ? "M" : "L"}${x} ${y.toFixed(1)} `;
  }
  contours.push(`<path d="${d}" fill="none" stroke="url(#contour)" stroke-width="${i % 4 === 0 ? 2.2 : 1.2}" opacity="${(0.55 - i * 0.025).toFixed(3)}"/>`);
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
const SCALE = 3.7;
const wordUnits = [...WORD].reduce((n, c) => n + LETTERS[c].w, 0) + GAP * (WORD.length - 1);
const WORD_X = 560;
const WORD_Y = 190;
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
  featureImages.push(`<image href="data:image/png;base64,${data}" x="${WORD_X + i * 100}" y="345" width="72" height="72"/>`);
}

const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1a1f"/><stop offset="0.6" stop-color="#08141a"/><stop offset="1" stop-color="#0a2019"/></linearGradient>
    <linearGradient id="contour" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.15"/><stop offset="0.55" stop-color="#2dd4bf"/><stop offset="1" stop-color="#34d399"/></linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.35" r="0.55"><stop offset="0" stop-color="#10b981" stop-opacity="0.34"/><stop offset="1" stop-color="#10b981" stop-opacity="0"/></radialGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c8fff0"/></linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#34d399"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgb)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${contours.join("\n  ")}
  <g transform="translate(${WORD_X} ${WORD_Y}) scale(${SCALE})" fill="none" stroke="url(#word)" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round">${glyphs}</g>
  <rect x="${WORD_X}" y="${WORD_Y + 26 * SCALE + 26}" width="${wordWidth.toFixed(0)}" height="4" rx="2" fill="url(#rule)"/>
  ${featureImages.join("\n  ")}
</svg>`;
await sharp(Buffer.from(bannerSvg), { density: 96 }).resize(W, H).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-banner.png"));

console.log("écrit dans public/branding : ethone-discord-avatar-v2.png, ethone-discord-avatar-animated.gif, ethone-discord-banner.png");
