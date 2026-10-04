#!/usr/bin/env node
// Génère les émojis animés du bot (GIF 128 px, fond transparent) dans public/bot-icons/a_*.gif.
// Le bot les envoie comme émojis d'application (`etho_a_*`) au démarrage (src/services/appEmojis.ts).
//   node scripts/build-bot-animated-icons.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const OUT = path.join(ROOT, "public/bot-icons");
const S = 128;
const C = S / 2;

// Courbes d'animation
const clamp = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => {
  const c1 = 1.70158, c3 = c1 + 1, x = clamp(t);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const seg = (t, a, b) => clamp((t - a) / (b - a)); // progression locale entre a et b

const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`);

async function writeGif(name, frames, delays) {
  const pngs = await Promise.all(frames.map((f) => sharp(svg(f)).png().toBuffer()));
  const out = await sharp(pngs, { join: { animated: true } })
    .gif({ delay: delays, loop: 0, effort: 10, dither: 0, interFrameMaxError: 2 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.gif`), out);
  const meta = await sharp(out, { animated: true }).metadata();
  console.log(`${name}.gif  ${meta.pages} images  ${(out.length / 1024).toFixed(1)} Ko`);
  if (out.length > 256 * 1024) throw new Error(`${name} dépasse 256 Ko (limite Discord)`);
}

/** Pastille qui « pop » puis un tracé qui se dessine, et une onde ; tient l'état final avant de boucler. */
function badgeDraw({ color, path: d, len, n = 34, extra = () => "" }) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const pop = backOut(seg(t, 0, 0.35));
    const draw = easeOut(seg(t, 0.28, 0.72));
    const ring = seg(t, 0.55, 1);
    const r = 52 * pop;
    frames.push(`
      ${ring > 0 && ring < 1 ? `<circle cx="${C}" cy="${C}" r="${52 + ring * 10}" fill="none" stroke="${color}" stroke-width="${4 * (1 - ring)}" opacity="${0.6 * (1 - ring)}"/>` : ""}
      <circle cx="${C}" cy="${C}" r="${r}" fill="${color}"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - draw)}" opacity="${draw > 0 ? 1 : 0}"/>
      ${extra(t)}`);
  }
  const delays = frames.map((_, i) => (i === frames.length - 1 ? 1800 : 30));
  return { frames, delays };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // ✅ Validation
  {
    const { frames, delays } = badgeDraw({ color: "#23a55a", path: "M38 66 L56 84 L91 46", len: 80 });
    await writeGif("a_check", frames, delays);
  }

  // ❌ Refus : le X se dessine en deux traits, puis un petit « non » de la tête
  {
    const n = 34, frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const pop = backOut(seg(t, 0, 0.35));
      const a = easeOut(seg(t, 0.28, 0.5));
      const b = easeOut(seg(t, 0.45, 0.67));
      const shake = Math.sin(seg(t, 0.68, 1) * Math.PI * 4) * 6 * (1 - seg(t, 0.68, 1));
      frames.push(`<g transform="translate(${shake} 0)">
        <circle cx="${C}" cy="${C}" r="${52 * pop}" fill="#f23f43"/>
        <path d="M44 44 L84 84" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-dasharray="57" stroke-dashoffset="${57 * (1 - a)}" opacity="${a > 0 ? 1 : 0}"/>
        <path d="M84 44 L44 84" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-dasharray="57" stroke-dashoffset="${57 * (1 - b)}" opacity="${b > 0 ? 1 : 0}"/>
      </g>`);
    }
    await writeGif("a_cross", frames, frames.map((_, i) => (i === n - 1 ? 1800 : 30)));
  }

  // ⚠️ Avertissement : triangle qui respire, point d'exclamation qui clignote doucement
  {
    const n = 30, frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const s = 1 + 0.06 * Math.sin(t * Math.PI * 2);
      const glow = 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
      frames.push(`<g transform="translate(${C} ${C + 4}) scale(${s}) translate(${-C} ${-C - 4})">
        <path d="M64 14 L120 110 L8 110 Z" fill="#f0b232" stroke="#f0b232" stroke-width="10" stroke-linejoin="round" opacity="${0.35 + glow}" transform="translate(64 66) scale(1.08) translate(-64 -66)"/>
        <path d="M64 14 L120 110 L8 110 Z" fill="#f0b232" stroke="#f0b232" stroke-width="8" stroke-linejoin="round"/>
        <rect x="58" y="42" width="12" height="38" rx="6" fill="#1e1f22"/>
        <circle cx="64" cy="94" r="7" fill="#1e1f22"/>
      </g>`);
    }
    await writeGif("a_warning", frames, frames.map(() => 45));
  }

  // ℹ️ Information : pastille bleue avec une onde qui se propage
  {
    const n = 30, frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const w = (t + 0.0) % 1;
      frames.push(`
        <circle cx="${C}" cy="${C}" r="${46 + w * 16}" fill="none" stroke="#5865f2" stroke-width="${6 * (1 - w)}" opacity="${0.7 * (1 - w)}"/>
        <circle cx="${C}" cy="${C}" r="46" fill="#5865f2"/>
        <circle cx="${C}" cy="40" r="7" fill="#fff"/>
        <rect x="57" y="54" width="14" height="38" rx="7" fill="#fff"/>`);
    }
    await writeGif("a_info", frames, frames.map(() => 45));
  }

  // ⏳ Chargement : arc qui tourne et s'allonge/raccourcit (rouge ETHONE)
  {
    const n = 30, frames = [];
    const r = 44, circ = 2 * Math.PI * r;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const len = circ * (0.18 + 0.5 * easeInOut(0.5 - 0.5 * Math.cos(t * Math.PI * 2)));
      frames.push(`
        <circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="#c1234f" stroke-opacity="0.18" stroke-width="12"/>
        <circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="#c1234f" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${len} ${circ}" transform="rotate(${t * 360 * 2 - 90} ${C} ${C})"/>`);
    }
    await writeGif("a_loading", frames, frames.map(() => 35));
  }

  // Logo ETHONE : « E » au centre, anneau dégradé qui tourne
  {
    const n = 36, frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      frames.push(`
        <defs><linearGradient id="g" gradientTransform="rotate(${t * 360} .5 .5)"><stop offset="0" stop-color="#ff5c8a"/><stop offset=".5" stop-color="#c1234f"/><stop offset="1" stop-color="#5b0f26"/></linearGradient></defs>
        <circle cx="${C}" cy="${C}" r="58" fill="url(#g)"/>
        <circle cx="${C}" cy="${C}" r="${49 - pulse}" fill="#121318"/>
        <path d="M46 36h40v12H59v10h24v12H59v10h27v12H46z" fill="#fff" opacity="${0.9 + 0.1 * pulse}"/>`);
    }
    await writeGif("a_logo", frames, frames.map(() => 50));
  }

  // 🎉 Fête : étincelles qui scintillent tour à tour
  {
    const n = 30, frames = [];
    const stars = [
      [64, 60, 30, 0], [30, 30, 14, 0.33], [100, 36, 12, 0.6], [96, 98, 16, 0.15], [28, 96, 11, 0.8],
    ];
    const star = (x, y, r) => `M${x} ${y - r} C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      frames.push(stars.map(([x, y, r, ph]) => {
        const k = 0.55 + 0.45 * Math.sin((t + ph) * Math.PI * 2);
        return `<path d="${star(x, y, r * k)}" fill="${r > 20 ? "#ffd166" : "#ff8fab"}" opacity="${0.5 + 0.5 * k}"/>`;
      }).join(""));
    }
    await writeGif("a_sparkles", frames, frames.map(() => 50));
  }

  // 🟢 En ligne : point vert avec halo qui respire
  {
    const n = 24, frames = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      frames.push(`<circle cx="${C}" cy="${C}" r="${30 + 22 * t}" fill="#23a55a" opacity="${0.45 * (1 - t)}"/><circle cx="${C}" cy="${C}" r="30" fill="#23a55a"/>`);
    }
    await writeGif("a_online", frames, frames.map(() => 55));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
