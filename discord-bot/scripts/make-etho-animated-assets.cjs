// Avatar + bannière animés d'Etho (v4, haute définition), dans la DA de la console : fond nuit, rouge Etho, lignes nettes.
//  - Avatar 1024 : anneau épais où circule une traînée lumineuse + reflet qui traverse un grand « E ». Pensé pour
//    rester lisible à 32-40 px (liste des membres) : la v3 (512, « E » fin sur disque sombre) devenait floue.
//  - Bannière 960x384 (5:2, taille maximale stockée par Discord, au-delà il ré-encode) : sous-titre plus gros et en
//    semi-gras, 9 modules. Reflet sur ETHO, lumière sur la barre, icônes en vague.
// Tout est dessiné dans le repère d'origine puis mis à l'échelle (SCALE) : textes et formes tracés nets.
// Les images sont vérifiées après encodage : chaque frame doit être différente (piège déjà rencontré : un GIF
// « animé » dont toutes les frames étaient identiques).
// Usage : node scripts/make-etho-animated-assets.cjs
const { createCanvas, GlobalFonts, GifEncoder, loadImage } = require('@napi-rs/canvas');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ICONS = path.join(ROOT, '..', 'ethone-next', 'public', 'bot-icons');
GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\impact.ttf', 'EthoCondensed');
GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\segoeui.ttf', 'EthoSub');
GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\seguisb.ttf', 'EthoSubSemi');

const C = {
  bg: '#131317',
  disc: '#16161b',
  track: '#2b0f17',
  trackHi: '#4a1624',
  red: '#c2304a',
  hot: '#ff7088',
  letter: '#e7dcdf',
  shine: '#ffffff',
  sub: '#a8a0a3',
};

/** Retourne la liste des empreintes (md5) des données image de chaque frame d'un GIF. */
function frameHashes(buf) {
  let p = 13;
  const flags = buf[10];
  if (flags & 0x80) p += 3 * (1 << ((flags & 7) + 1));
  const hashes = [];
  while (p < buf.length) {
    const b = buf[p];
    if (b === 0x3b) break;
    if (b === 0x21) {
      p += 2;
      while (buf[p] !== 0) p += buf[p] + 1;
      p += 1;
    } else if (b === 0x2c) {
      const lflags = buf[p + 9];
      p += 10;
      if (lflags & 0x80) p += 3 * (1 << ((lflags & 7) + 1));
      const start = p;
      p += 1; // taille LZW minimale
      while (buf[p] !== 0) p += buf[p] + 1;
      p += 1;
      hashes.push(crypto.createHash('md5').update(buf.subarray(start, p)).digest('hex'));
    } else break;
  }
  return hashes;
}

// DUMP_DIR=<dossier> : enregistre aussi quelques frames en PNG pour les inspecter.
const DUMP_DIR = process.env.DUMP_DIR;
let dumpPrefix = '';

function encode(ctx, w, h, frames, delay, draw, scale = 1) {
  const enc = new GifEncoder(w, h, { repeat: 0, quality: 1 });
  for (let i = 0; i < frames; i++) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    draw(i / frames);
    if (DUMP_DIR && [0, Math.round(frames * 0.12), Math.round(frames * 0.3), Math.round(frames * 0.6)].includes(i)) {
      fs.writeFileSync(path.join(DUMP_DIR, `${dumpPrefix}-${String(i).padStart(3, '0')}.png`), ctx.canvas.toBuffer('image/png'));
    }
    const d = ctx.getImageData(0, 0, w, h);
    enc.addFrame(new Uint8Array(d.data.buffer, d.data.byteOffset, d.data.byteLength), w, h, { delay });
  }
  return enc.finish();
}

/** Reflet diagonal (3 tons) passé sur une forme déjà dessinée dans `layer`, à la position t (0..1 de gauche à droite). */
function sheen(layer, w, h, t, band) {
  const x = -band + t * (w + band * 2);
  layer.globalCompositeOperation = 'source-atop';
  const g = layer.createLinearGradient(x - band, 0, x + band, h * 0.35);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, C.shine);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  layer.fillStyle = g;
  layer.fillRect(0, 0, w, h);
  layer.globalCompositeOperation = 'source-over';
}

// Courbe douce pour le passage du reflet (accélère puis ralentit).
const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

function avatar(SCALE = 2) {
  dumpPrefix = SCALE === 2 ? 'avatar' : `avatar-x${SCALE}`;
  const S = 512; // repère de dessin ; SCALE 2 = 1024 px pour Discord, 0.5 = 256 px pour le site
  const FRAMES = 80; // 80 x 50 ms = 4 s
  const canvas = createCanvas(S * SCALE, S * SCALE);
  const ctx = canvas.getContext('2d');
  const layer = createCanvas(S * SCALE, S * SCALE);
  const lx = layer.getContext('2d');
  const ringW = S * 0.075;
  const ringR = S / 2 - ringW / 2;

  const buf = encode(ctx, S * SCALE, S * SCALE, FRAMES, 50, (t) => {
    // Disque plein (Discord découpe l'avatar en cercle) : plus de « disque dans le disque » qui mangeait la place.
    ctx.fillStyle = C.disc;
    ctx.fillRect(0, 0, S, S);

    // Anneau : piste rouge sombre bien visible + traînée lumineuse (2 tours par boucle). On fait tourner le canevas
    // car l'angle de départ de createConicGradient est ignoré par @napi-rs/canvas.
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(t * Math.PI * 4);
    ctx.translate(-S / 2, -S / 2);
    const g = ctx.createConicGradient(0, S / 2, S / 2);
    g.addColorStop(0, C.trackHi);
    g.addColorStop(0.55, C.trackHi);
    g.addColorStop(0.84, C.red);
    g.addColorStop(0.97, C.hot);
    g.addColorStop(1, C.trackHi);
    ctx.strokeStyle = g;
    ctx.lineWidth = ringW;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Grand « E » + reflet qui le traverse pendant le premier quart de la boucle.
    lx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    lx.clearRect(0, 0, S, S);
    lx.font = `${Math.round(S * 0.66)}px EthoCondensed`;
    lx.textAlign = 'center';
    lx.textBaseline = 'middle';
    lx.fillStyle = C.letter;
    lx.fillText('E', S / 2, S / 2 + S * 0.03);
    const k = t / 0.28;
    if (k <= 1) sheen(lx, S, S, ease(k), S * 0.16);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }, SCALE);
  return buf;
}

async function banner() {
  dumpPrefix = 'banner';
  const W = 960; // repère de dessin
  const H = 384;
  // Discord stocke les bannières en 960 x 384 au plus et ré-encode tout ce qui dépasse (vérifié sur le CDN : un
  // envoi en 1500 x 600 revient en 960 x 384, re-quantifié). On rend donc pile à cette taille.
  const SCALE = 1;
  const FRAMES = 60; // 60 x 50 ms = 3 s
  const canvas = createCanvas(Math.round(W * SCALE), Math.round(H * SCALE));
  const ctx = canvas.getContext('2d');
  const layer = createCanvas(Math.round(W * SCALE), Math.round(H * SCALE));
  const lx = layer.getContext('2d');
  const names = ['moderation', 'music', 'ticket', 'level', 'ai', 'voice', 'welcome', 'economy', 'security'];
  const icons = await Promise.all(names.map((n) => loadImage(path.join(ICONS, `${n}.png`))));

  const label = 'ETHO';
  const fontSize = 138;
  const spacing = 10;
  lx.font = `${fontSize}px EthoCondensed`;
  let textW = 0;
  for (const ch of label) textW += lx.measureText(ch).width + spacing;
  textW -= spacing;
  const baseline = 178;
  const barW = textW * 0.6;
  const barX = (W - barW) / 2;
  const barY = 222;

  const buf = encode(ctx, W, H, FRAMES, 50, (t) => {
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, W, H);

    // Mot-symbole + reflet pendant la première moitié de la boucle.
    lx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    lx.clearRect(0, 0, W, H);
    lx.font = `${fontSize}px EthoCondensed`;
    lx.textBaseline = 'alphabetic';
    lx.fillStyle = C.letter;
    let x = (W - textW) / 2;
    for (const ch of label) {
      lx.fillText(ch, x, baseline);
      x += lx.measureText(ch).width + spacing;
    }
    const k = t / 0.5;
    if (k <= 1) sheen(lx, W, H, ease(k), 90);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();

    // Barre : base sombre + segment lumineux qui la parcourt (une fois par boucle).
    ctx.fillStyle = C.track;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 4, 2);
    ctx.fill();
    const segW = barW * 0.32;
    const sx = barX - segW + t * (barW + segW);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 4, 2);
    ctx.clip();
    const sg = ctx.createLinearGradient(sx, 0, sx + segW, 0);
    sg.addColorStop(0, C.track);
    sg.addColorStop(0.7, C.red);
    sg.addColorStop(1, C.hot);
    ctx.fillStyle = sg;
    ctx.fillRect(sx, barY, segW, 4);
    ctx.restore();

    // Sous-titre
    ctx.font = '21px EthoSubSemi';
    ctx.fillStyle = C.sub;
    const sub = 'MODÉRATION · MUSIQUE · TICKETS · NIVEAUX · IA · ÉCONOMIE · SÉCURITÉ';
    ctx.fillText(sub, (W - ctx.measureText(sub).width) / 2, 262);

    // Icônes en vague (décalage de phase par icône, boucle parfaite).
    const size = 50;
    const gap = 22;
    const total = names.length * size + (names.length - 1) * gap;
    let ix = (W - total) / 2;
    icons.forEach((img, i) => {
      const y = 296 + Math.sin((t - i / names.length) * Math.PI * 2) * 5;
      ctx.drawImage(img, ix, y, size, size);
      ix += size + gap;
    });
  }, SCALE);
  // PNG statique (première frame) : repli si Discord refuse le GIF, et image Open Graph du site.
  return { gif: buf, png: canvas.toBuffer('image/png') };
}

(async () => {
  const av = avatar();
  const bn = await banner();
  const outAvatar = path.join(ROOT, 'assets', 'etho-avatar-animated.gif');
  const outBanner = path.join(ROOT, 'assets', 'etho-banner-animated.gif');
  fs.writeFileSync(outAvatar, av);
  fs.writeFileSync(outBanner, bn.gif);
  fs.writeFileSync(path.join(ROOT, 'assets', 'etho-banner.png'), bn.png);
  // Le site l'affiche entre 28 et 96 px : une version 256 px (au lieu de recopier les ~3 Mo destinés à Discord).
  const site = avatar(0.5);
  fs.writeFileSync(path.join(ROOT, '..', 'ethone-next', 'public', 'branding', 'etho-avatar.gif'), site);
  console.log(`avatar site : ${(site.length / 1024).toFixed(0)} Ko`);

  for (const [name, b] of [['avatar', av], ['banner', bn.gif]]) {
    const hashes = frameHashes(b);
    const distinct = new Set(hashes).size;
    console.log(`${name}: ${(b.length / 1024).toFixed(0)} Ko, ${hashes.length} frames, ${distinct} distinctes`);
    if (distinct < hashes.length * 0.5) {
      console.error(`ÉCHEC : ${name} a trop de frames identiques — l'animation ne serait pas visible.`);
      process.exit(1);
    }
  }
})();
