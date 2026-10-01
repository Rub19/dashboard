// Avatar + bannière animés d'Etho (v3), dans la DA de la console : fond nuit, rouge Etho, lignes nettes.
//  - Avatar 512 : anneau sombre où circule une traînée lumineuse (comme la bordure des cartes du site) + un reflet
//    qui traverse le « E » une fois par boucle. Boucle de 4 s sans à-coup.
//  - Bannière 960x384 (5:2) : reflet sur ETHO, lumière qui court sur la barre, icônes de modules qui flottent en vague.
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

const C = {
  bg: '#131317',
  disc: '#18181e',
  track: '#2b0f17',
  red: '#c2304a',
  hot: '#ff7088',
  letter: '#e7dcdf',
  shine: '#ffffff',
  sub: '#8b8487',
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

function encode(ctx, w, h, frames, delay, draw) {
  const enc = new GifEncoder(w, h, { repeat: 0, quality: 1 });
  for (let i = 0; i < frames; i++) {
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

function avatar() {
  dumpPrefix = 'avatar';
  const S = 512;
  const FRAMES = 100; // 100 x 40 ms = 4 s
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');
  const layer = createCanvas(S, S);
  const lx = layer.getContext('2d');
  const ringW = S * 0.045;
  const ringR = S / 2 - ringW / 2;

  const buf = encode(ctx, S, S, FRAMES, 40, (t) => {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = C.disc;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, ringR - ringW * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Anneau : piste sombre + traînée lumineuse (2 tours par boucle). On fait tourner le canevas car l'angle de
    // départ de createConicGradient est ignoré par @napi-rs/canvas.
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(t * Math.PI * 4);
    ctx.translate(-S / 2, -S / 2);
    const g = ctx.createConicGradient(0, S / 2, S / 2);
    g.addColorStop(0, C.track);
    g.addColorStop(0.62, C.track);
    g.addColorStop(0.86, C.red);
    g.addColorStop(0.97, C.hot);
    g.addColorStop(1, C.track);
    ctx.strokeStyle = g;
    ctx.lineWidth = ringW;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // « E » + reflet qui le traverse pendant le premier quart de la boucle.
    lx.clearRect(0, 0, S, S);
    lx.font = `${Math.round(S * 0.5)}px EthoCondensed`;
    lx.textAlign = 'center';
    lx.textBaseline = 'middle';
    lx.fillStyle = C.letter;
    lx.fillText('E', S / 2, S / 2 + S * 0.024);
    const k = t / 0.28;
    if (k <= 1) sheen(lx, S, S, ease(k), S * 0.16);
    ctx.drawImage(layer, 0, 0);
  });
  return buf;
}

async function banner() {
  dumpPrefix = 'banner';
  const W = 960;
  const H = 384;
  const FRAMES = 60; // 60 x 50 ms = 3 s
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const layer = createCanvas(W, H);
  const lx = layer.getContext('2d');
  const names = ['moderation', 'music', 'ticket', 'level', 'economy', 'security'];
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
    ctx.drawImage(layer, 0, 0);

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
    ctx.font = '19px EthoSub';
    ctx.fillStyle = C.sub;
    const sub = 'MODÉRATION · MUSIQUE · TICKETS · NIVEAUX · ÉCONOMIE · SÉCURITÉ';
    ctx.fillText(sub, (W - ctx.measureText(sub).width) / 2, 262);

    // Icônes en vague (décalage de phase par icône, boucle parfaite).
    const size = 52;
    const gap = 30;
    const total = names.length * size + (names.length - 1) * gap;
    let ix = (W - total) / 2;
    icons.forEach((img, i) => {
      const y = 296 + Math.sin((t - i / names.length) * Math.PI * 2) * 5;
      ctx.drawImage(img, ix, y, size, size);
      ix += size + gap;
    });
  });
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
  fs.copyFileSync(outAvatar, path.join(ROOT, '..', 'ethone-next', 'public', 'branding', 'etho-avatar.gif'));

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
