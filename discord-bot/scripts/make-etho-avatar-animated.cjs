// Avatar animé "Etho" : anneau circulaire au dégradé conique tournant (rouge/bordeaux, plus de RGB bleu/violet/
// vert), "E" condensé centré (même police que la bannière, pas la police arrondie de l'ancien avatar), fond
// nuit. GIF encodé via le GifEncoder intégré de @napi-rs/canvas (pas de dépendance en plus).
// Usage : node scripts/make-etho-avatar-animated.cjs [sortie.gif]
const { createCanvas, GlobalFonts, GifEncoder } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const FRAMES = 36; // pas de 10° — rotation complète fluide et bouclée sans à-coup
const DELAY_MS = 45; // ~1.6s par tour
const out = process.argv[2] || path.join(__dirname, 'etho-avatar-animated.gif');

const bg = '#14141a';
const text = '#ffffff';
// Peu de teintes, transitions franches : un anneau au rouge moyen avec UN seul arc plus sombre qui tourne.
// (l'ancien dégradé à 6 teintes proches produisait trop de couleurs uniques pour la palette 256 couleurs du
// GIF, d'où le grain/dithering visible tout autour de l'anneau)
const ringStops = [
  [0, '#c2304a'],
  [0.06, '#8a1530'],
  [0.16, '#4a0916'],
  [0.26, '#8a1530'],
  [0.32, '#c2304a'],
  [1, '#c2304a'],
];

// Même police condensée que la bannière (pas la police arrondie de l'ancien avatar).
GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\impact.ttf', 'EthoCondensed');

const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// L'anneau va jusqu'au bord du canevas (plus de découpe circulaire à ménager) : son bord extérieur touche
// exactement le cadre 512x512.
const ringWidth = SIZE * 0.042;
const ringRadius = SIZE / 2 - ringWidth / 2;

function drawFrame(rotation) {
  // Pas de découpe circulaire : carré plein et opaque, sans transparence. Discord masque déjà les avatars en
  // cercle à l'affichage — un canal alpha ici ne servait qu'à créer le grain (le GIF n'a qu'une transparence
  // binaire on/off, donc le bord anti-aliasé du cercle se retrouvait ditheré). Coins carrés = simplement de
  // la couleur de fond, invisibles une fois masqués par Discord.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // "E" condensé, même police que la bannière
  ctx.font = `${Math.round(SIZE * 0.52)}px EthoCondensed`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = text;
  ctx.fillText('E', SIZE / 2, SIZE / 2 + SIZE * 0.025);

  // Anneau au dégradé conique tournant, par-dessus
  ctx.save();
  const gradient = ctx.createConicGradient(rotation, SIZE / 2, SIZE / 2);
  for (const [stop, color] of ringStops) gradient.addColorStop(stop, color);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

(async () => {
  // quality basse = meilleure qualité de quantification NeuQuant (moins de grain/dithering sur le dégradé)
  const encoder = new GifEncoder(SIZE, SIZE, { repeat: 0, quality: 1 });
  for (let i = 0; i < FRAMES; i++) {
    const rotation = (i / FRAMES) * Math.PI * 2;
    drawFrame(rotation);
    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    encoder.addFrame(new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength), SIZE, SIZE, { delay: DELAY_MS });
  }
  const buffer = encoder.finish();
  fs.writeFileSync(out, buffer);
  console.log('Avatar animé écrit :', out, buffer.length, 'octets', `(${FRAMES} frames)`);
})();
