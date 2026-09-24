/**
 * Génère l'identité Discord du bot à partir de l'emblème ETHONE (tuile sombre, monogramme « E » blanc, liseré
 * violet / bleu ciel / vert) posé sur des halos aurore :
 *   - ethone-discord-avatar-v2.png        photo de profil statique (1024)
 *   - ethone-discord-avatar-animated.gif  photo de profil animée (512, boucle de ~2 s : halos qui orbitent lentement,
 *                                         liseré qui tourne, reflet qui traverse la tuile)
 *   - ethone-discord-banner.png           bannière 1700x600 : mot ETHONE dessiné avec les mêmes traits que le « E »,
 *                                         rangée d'icônes des fonctions du bot, tuile à droite
 * Les lettres sont tracées (pas de police) pour un rendu identique partout.
 *
 * Usage (depuis ethone-next/) : node scripts/build-discord-profile.mjs
 */
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const branding = resolve(root, "public/branding");
await mkdir(branding, { recursive: true });

// Emblème : même tuile que public/icons/ethone-icon.svg (viewBox 64).
const E_PATH = "M21 19v26m0-26h22M21 32h16M21 45h22";

const GRADIENTS = `
    <linearGradient id="surface" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a1a26"/><stop offset="55%" stop-color="#101018"/><stop offset="100%" stop-color="#08080c"/></linearGradient>
    <filter id="blur-xl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
    <filter id="blur-md" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="#0b0b14" flood-opacity="0.55"/></filter>`;

/** Dégradé du liseré ; `angle` le fait tourner autour de la tuile (animation). */
const ringGradient = (id, angle = 0) =>
  `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle.toFixed(2)} 0.5 0.5)"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#34d399"/></linearGradient>`;

const tile = (ringId = "ring", extra = "") => `<g filter="url(#soft-shadow)">
    <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#${ringId})"/>
    <rect x="3.5" y="3.5" width="57" height="57" rx="16.5" fill="url(#surface)"/>
    <path d="M6 18C6 11.3726 11.3726 6 18 6H46C52.6274 6 58 11.3726 58 18V24C58 24 43 28 32 28C21 28 6 24 6 24V18Z" fill="white" fill-opacity="0.05"/>
    ${extra}
    <path d="${E_PATH}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

// --- Avatar statique -------------------------------------------------------------------------------------------------
const avatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>${GRADIENTS}${ringGradient("ring")}
    <radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0%" stop-color="#1b1b2e"/><stop offset="60%" stop-color="#0d0d16"/><stop offset="100%" stop-color="#07070c"/></radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g filter="url(#blur-xl)" opacity="0.85">
    <circle cx="330" cy="330" r="240" fill="#8b5cf6"/>
    <circle cx="720" cy="360" r="220" fill="#0ea5e9"/>
    <circle cx="520" cy="760" r="230" fill="#10b981"/>
  </g>
  <circle cx="512" cy="512" r="470" fill="none" stroke="url(#ring)" stroke-width="5" opacity="0.7"/>
  <circle cx="512" cy="512" r="440" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.10"/>
  <g transform="translate(512 512) scale(10.6) translate(-32 -32)">${tile()}</g>
</svg>`;

// --- Avatar animé : t ∈ [0,1[, la boucle est parfaitement continue (tout est périodique en 2π·t) --------------------------
function avatarFrame(t) {
  const a = t * Math.PI * 2;
  const orbit = (phase, r) => [512 + r * Math.cos(a + phase), 512 + r * Math.sin(a + phase)];
  const [px, py] = orbit(-2.3, 175);
  const [bx, by] = orbit(-0.2, 175);
  const [gx, gy] = orbit(1.9, 175);
  // reflet : une bande claire inclinée qui traverse la tuile de gauche à droite pendant la boucle
  const glintX = -30 + t * 124;
  const glint = `<clipPath id="tileClip"><rect x="3.5" y="3.5" width="57" height="57" rx="16.5"/></clipPath>
    <g clip-path="url(#tileClip)"><rect x="${glintX.toFixed(2)}" y="-10" width="14" height="90" fill="url(#glint)" transform="rotate(22 32 32)"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>${GRADIENTS}${ringGradient("ring", t * 360)}${ringGradient("ring2", -t * 360)}
    <radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0%" stop-color="#1b1b2e"/><stop offset="60%" stop-color="#0d0d16"/><stop offset="100%" stop-color="#07070c"/></radialGradient>
    <linearGradient id="glint" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fff" stop-opacity="0"/><stop offset="50%" stop-color="#fff" stop-opacity="0.16"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g filter="url(#blur-xl)" opacity="0.85">
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="235" fill="#8b5cf6"/>
    <circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="220" fill="#0ea5e9"/>
    <circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="230" fill="#10b981"/>
  </g>
  <circle cx="512" cy="512" r="470" fill="none" stroke="url(#ring2)" stroke-width="5" opacity="0.75"/>
  <circle cx="512" cy="512" r="440" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.10"/>
  <g transform="translate(512 512) scale(10.6) translate(-32 -32)">${tile("ring", glint)}</g>
</svg>`;
}

const SIZE = 512;
const FRAMES = 40;
const DELAY_MS = 50;
const frames = [];
for (let i = 0; i < FRAMES; i++) {
  frames.push(await sharp(Buffer.from(avatarFrame(i / FRAMES)), { density: 48 }).resize(SIZE, SIZE).png().toBuffer());
}
await sharp(frames, { join: { across: 1, animated: true } })
  .gif({ delay: new Array(FRAMES).fill(DELAY_MS), loop: 0, effort: 7, dither: 0.8, colours: 256 })
  .toFile(resolve(branding, "ethone-discord-avatar-animated.gif"));

// --- Bannière ----------------------------------------------------------------------------------------------------------
// Lettres tracées avec le même trait arrondi que le « E » (repère de 26 unités de haut).
const LETTERS = {
  E: { w: 18, d: "M0 0v26M0 0h18M0 13h13M0 26h18" },
  T: { w: 20, d: "M0 0h20M10 0v26" },
  H: { w: 18, d: "M0 0v26M18 0v26M0 13h18" },
  O: { w: 20, d: "M10 0a10 13 0 1 0 .01 0z" },
  N: { w: 18, d: "M0 26V0l18 26V0" },
};
const WORD = "ETHONE";
const GAP = 14;
const SCALE = 3.9;
const wordUnits = [...WORD].reduce((n, c) => n + LETTERS[c].w, 0) + GAP * (WORD.length - 1);
const WORD_X = 400;
const WORD_Y = 150;
let cursor = 0;
const glyphs = [...WORD]
  .map((c) => {
    const g = `<path transform="translate(${cursor} 0)" d="${LETTERS[c].d}"/>`;
    cursor += LETTERS[c].w + GAP;
    return g;
  })
  .join("");

const W = 1700;
const H = 600;
const dots = [];
for (let row = 0; row < 9; row++) {
  for (let col = 0; col < 27; col++) {
    const x = col * 66 + (row % 2 ? 33 : 0) + 20;
    const y = row * 66 + 20;
    dots.push(`<circle cx="${x}" cy="${y}" r="2.2" fill="#ffffff" opacity="${(0.05 + ((row * 7 + col * 3) % 5) * 0.012).toFixed(3)}"/>`);
  }
}

// rangée des fonctions du bot, avec les icônes déjà utilisées dans les embeds
const FEATURES = ["moderation", "music", "economy", "ticket", "level", "security"];
const featureImages = [];
for (let i = 0; i < FEATURES.length; i++) {
  const data = (await readFile(resolve(root, `public/bot-icons/${FEATURES[i]}.png`))).toString("base64");
  const x = WORD_X + i * 100;
  featureImages.push(`<image href="data:image/png;base64,${data}" x="${x}" y="360" width="76" height="76" opacity="0.95"/>`);
}

const wordWidth = wordUnits * SCALE;
const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>${GRADIENTS}${ringGradient("ring")}
    <linearGradient id="bgb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#14142a"/><stop offset="55%" stop-color="#0b0b15"/><stop offset="100%" stop-color="#08100f"/></linearGradient>
    <linearGradient id="arc" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0"/><stop offset="45%" stop-color="#38bdf8" stop-opacity="0.9"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient>
    <linearGradient id="word" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#c7d2fe"/></linearGradient>
    <linearGradient id="rule" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#34d399"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgb)"/>
  <g filter="url(#blur-xl)" opacity="0.8">
    <ellipse cx="260" cy="120" rx="330" ry="180" fill="#8b5cf6"/>
    <ellipse cx="900" cy="560" rx="380" ry="150" fill="#0ea5e9"/>
    <ellipse cx="1430" cy="300" rx="330" ry="230" fill="#10b981"/>
  </g>
  ${dots.join("")}
  <path d="M-40 470 C 420 330, 860 560, 1740 250" fill="none" stroke="url(#arc)" stroke-width="3" opacity="0.55"/>
  <path d="M-40 510 C 480 380, 900 600, 1740 300" fill="none" stroke="url(#arc)" stroke-width="1.5" opacity="0.3"/>
  <g transform="translate(${WORD_X} ${WORD_Y}) scale(${SCALE})" fill="none" stroke="url(#word)" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round">${glyphs}</g>
  <rect x="${WORD_X}" y="292" width="${wordWidth.toFixed(0)}" height="4" rx="2" fill="url(#rule)" opacity="0.9"/>
  ${featureImages.join("\n  ")}
  <g filter="url(#blur-md)" opacity="0.5"><g transform="translate(1390 300) scale(6.4) translate(-32 -32)">${tile()}</g></g>
  <g transform="translate(1390 300) scale(6.4) translate(-32 -32)">${tile()}</g>
</svg>`;

await sharp(Buffer.from(avatarSvg), { density: 96 }).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-avatar-v2.png"));
await sharp(Buffer.from(bannerSvg), { density: 96 }).resize(W, H).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-banner.png"));
console.log("écrit dans public/branding : ethone-discord-avatar-v2.png, ethone-discord-avatar-animated.gif, ethone-discord-banner.png");
