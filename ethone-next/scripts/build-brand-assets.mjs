/**
 * Génère l'emblème ETHONE (monogramme « E » blanc sur tuile sombre à liseré violet / bleu ciel / vert) et toutes
 * ses variantes : SVG, favicons, icônes d'application (dont « maskable »), image de profil du bot Discord.
 * La photo de profil du bot (public/branding/ethone-discord-avatar-v2.png) et la bannière viennent de build-discord-profile.mjs.
 *
 * Usage (depuis ethone-next/) : node scripts/build-brand-assets.mjs
 * Écrit dans public/icons/ et public/branding/. La même géométrie est reprise dans components/BrandMark.tsx.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const icons = resolve(root, "public/icons");
const branding = resolve(root, "public/branding");
await mkdir(icons, { recursive: true });
await mkdir(branding, { recursive: true });

// --- monogramme « E » (viewBox 64), tracé en trait épais aux extrémités arrondies
const E_PATH = "M21 19v26m0-26h22M21 32h16M21 45h22";

const DEFS = `<defs>
    <linearGradient id="ethone-surface" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#181822"/><stop offset="50%" stop-color="#101018"/><stop offset="100%" stop-color="#08080c"/></linearGradient>
    <linearGradient id="ethone-signal" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#34d399"/></linearGradient>
    <filter id="ethone-glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#8b5cf6" flood-opacity="0.35"/></filter>
  </defs>`;

const MARK = `<path d="${E_PATH}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

const fullSvg = (extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="ETHONE" style="shape-rendering: geometricPrecision;">
  ${DEFS}
  <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#ethone-signal)" filter="url(#ethone-glow)"/>
  <rect x="3.5" y="3.5" width="57" height="57" rx="16.5" fill="url(#ethone-surface)"/>
  <path d="M6 18C6 11.3726 11.3726 6 18 6H46C52.6274 6 58 11.3726 58 18V24C58 24 43 28 32 28C21 28 6 24 6 24V18Z" fill="white" fill-opacity="0.04"/>
  ${MARK}${extra}
</svg>
`;

// Version « mask-icon » (Safari, monochrome) : le « E » en noir.
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="${E_PATH}" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;

// Version « maskable » : fond plein jusqu'aux bords, emblème réduit dans la zone de sécurité (80 %).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${DEFS}
  <rect width="64" height="64" fill="url(#ethone-surface)"/>
  <g transform="translate(32 32) scale(0.85) translate(-32 -32)">${MARK}</g>
</svg>
`;

// Image de profil du bot Discord : fond plein, emblème centré (Discord l'arrondit lui-même).
const avatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${DEFS}
  <rect width="64" height="64" fill="url(#ethone-surface)"/>
  <circle cx="32" cy="32" r="30" fill="none" stroke="url(#ethone-signal)" stroke-width="1.2" opacity="0.55"/>
  <g transform="translate(32 32) scale(1.18) translate(-32 -32)">${MARK}</g>
</svg>
`;

await writeFile(resolve(icons, "ethone-icon.svg"), fullSvg());
await writeFile(resolve(icons, "ethone-mask-icon.svg"), maskSvg);

const png = (svg, size, out) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
const full = fullSvg();
for (const s of [16, 32, 48, 64]) await png(full, s, resolve(icons, `ethone-favicon-${s}.png`));
await png(full, 180, resolve(icons, "ethone-apple-touch-180.png"));
await png(full, 192, resolve(icons, "ethone-icon-192.png"));
await png(full, 512, resolve(icons, "ethone-icon-512.png"));
await png(maskableSvg, 512, resolve(icons, "ethone-icon-maskable-512.png"));
await png(avatarSvg, 512, resolve(branding, "ethone-discord-avatar-512.png"));
await png(avatarSvg, 1024, resolve(branding, "ethone-discord-avatar.png"));
await png(avatarSvg, 512, resolve(branding, "ethone-discord-avatar-solid.png"));

// favicon.ico : conteneur ICO avec des images PNG (16, 32, 48).
const icoSizes = [16, 32, 48];
const bufs = await Promise.all(icoSizes.map((s) => sharp(Buffer.from(full), { density: 384 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const entries = bufs.map((b, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0);
  e.writeUInt8(icoSizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(b.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += b.length;
  return e;
});
await writeFile(resolve(icons, "favicon.ico"), Buffer.concat([header, ...entries, ...bufs]));

console.log("assets écrits dans public/icons et public/branding");
