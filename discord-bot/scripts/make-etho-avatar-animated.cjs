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
const ringStops = [
  [0, '#6b0d24'],
  [0.15, '#c2304a'],
  [0.35, '#ff6b81'],
  [0.55, '#c2304a'],
  [0.85, '#6b0d24'],
  [1, '#6b0d24'],
];

// Même police condensée que la bannière (pas la police arrondie de l'ancien avatar).
GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\impact.ttf', 'EthoCondensed');

const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

const ringWidth = SIZE * 0.036;
const ringRadius = SIZE / 2 - ringWidth / 2 - SIZE * 0.01;

function drawFrame(rotation) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Cercle découpé (coins transparents, même raison que l'avatar statique)
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // "E" condensé, même police que la bannière
  ctx.font = `${Math.round(SIZE * 0.4)}px EthoCondensed`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = text;
  ctx.fillText('E', SIZE / 2, SIZE / 2 + SIZE * 0.02);

  ctx.restore();

  // Anneau au dégradé conique tournant, par-dessus (dans son propre clip en forme d'anneau pour ne pas
  // déborder même si le lineWidth met un pixel de trop à l'extérieur du cadre).
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
  const encoder = new GifEncoder(SIZE, SIZE, { repeat: 0, quality: 8 });
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
