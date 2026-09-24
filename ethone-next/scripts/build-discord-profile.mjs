/**
 * Génère l'image de profil et la bannière du bot Discord (sans aucun texte : uniquement l'emblème « prisme » et des
 * halos aurore violet / bleu ciel / vert).
 *
 * Usage (depuis ethone-next/) : node scripts/build-discord-profile.mjs
 * Écrit dans public/branding/ : ethone-discord-avatar-v2.png (1024), ethone-discord-banner.png (1700x600).
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const branding = resolve(root, "public/branding");
await mkdir(branding, { recursive: true });

// Emblème : hexagone (rayon 19 dans un repère 64) coupé en trois losanges, comme components/BrandMark.tsx.
const C = 32;
const R = 19;
const pt = (deg) => [C + R * Math.cos((deg * Math.PI) / 180), C + R * Math.sin((deg * Math.PI) / 180)];
const [top, ur, lr, bottom, ll, ul] = [-90, -30, 30, 90, 150, 210].map(pt);
const center = [C, C];
const FACETS = { top: [top, ur, center, ul], left: [ul, center, bottom, ll], right: [ur, lr, bottom, center] };
function inset(points, k) {
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
  const cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  return points.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}
const fmt = (points) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
const facet = (name, fill) => `<polygon points="${fmt(inset(FACETS[name], 0.93))}" fill="${fill}" stroke="${fill}" stroke-width="1.4" stroke-linejoin="round"/>`;

const GRADIENTS = `
    <linearGradient id="top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ddd6fe"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient>
    <linearGradient id="left" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient>
    <linearGradient id="right" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a7f3d0"/><stop offset="100%" stop-color="#10b981"/></linearGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="50%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#34d399"/></linearGradient>
    <filter id="blur-xl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
    <filter id="blur-md" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="#0b0b14" flood-opacity="0.55"/></filter>`;

const mark = `<g filter="url(#soft-shadow)">${facet("top", "url(#top)")}${facet("left", "url(#left)")}${facet("right", "url(#right)")}</g>`;

// --- Avatar : fond nuit, halo aurore derrière un prisme grand, anneau fin (Discord arrondit l'image).
const avatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>${GRADIENTS}
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
  <g transform="translate(512 512) scale(13.6) translate(-32 -32)">${mark}</g>
</svg>`;

// --- Bannière 1700x600 : halos, trame de losanges très discrète, prisme à droite, arcs lumineux.
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
const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>${GRADIENTS}
    <linearGradient id="bgb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#14142a"/><stop offset="55%" stop-color="#0b0b15"/><stop offset="100%" stop-color="#08100f"/></linearGradient>
    <linearGradient id="arc" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0"/><stop offset="45%" stop-color="#38bdf8" stop-opacity="0.9"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgb)"/>
  <g filter="url(#blur-xl)" opacity="0.8">
    <ellipse cx="260" cy="120" rx="330" ry="180" fill="#8b5cf6"/>
    <ellipse cx="900" cy="560" rx="380" ry="150" fill="#0ea5e9"/>
    <ellipse cx="1430" cy="300" rx="330" ry="230" fill="#10b981"/>
  </g>
  ${dots.join("")}
  <path d="M-40 470 C 420 330, 860 560, 1740 250" fill="none" stroke="url(#arc)" stroke-width="3" opacity="0.8"/>
  <path d="M-40 510 C 480 380, 900 600, 1740 300" fill="none" stroke="url(#arc)" stroke-width="1.5" opacity="0.45"/>
  <g filter="url(#blur-md)" opacity="0.55"><g transform="translate(1290 300) scale(9.4) translate(-32 -32)">${mark}</g></g>
  <g transform="translate(1290 300) scale(9.4) translate(-32 -32)">${mark}</g>
  <g opacity="0.5" transform="translate(1290 300) scale(9.4) translate(-32 -32)"><polygon points="${fmt(inset([top, ur, lr, bottom, ll, ul], 1.16))}" fill="none" stroke="url(#ring)" stroke-width="0.35"/></g>
</svg>`;

await sharp(Buffer.from(avatarSvg), { density: 96 }).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-avatar-v2.png"));
await sharp(Buffer.from(bannerSvg), { density: 96 }).resize(W, H).png({ compressionLevel: 9 }).toFile(resolve(branding, "ethone-discord-banner.png"));
console.log("écrit : public/branding/ethone-discord-avatar-v2.png, public/branding/ethone-discord-banner.png");
