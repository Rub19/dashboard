// Génère la bannière du bot « Etho » (1500x600, ratio 5:2 comme la bannière Discord), dans le style de l'ancienne bannière ETHONE :
// fond nuit, mot-symbole arrondi, liseré dégradé, six icônes de modules et deux courbes lumineuses.
// Usage : node scripts/make-etho-banner.cjs [sortie.png]
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const W = 1500;
const H = 600;
const out = process.argv[2] || path.join(__dirname, '..', '..', 'ethone-next', 'public', 'branding', 'etho-discord-banner.png');
const iconsDir = path.join(__dirname, '..', '..', 'ethone-next', 'public', 'bot-icons');

const rounded = 'C:\\Windows\\Fonts\\ARLRDBD.TTF';
if (fs.existsSync(rounded)) GlobalFonts.registerFromPath(rounded, 'ArialRounded');
else GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\arialbd.ttf', 'ArialRounded');

(async () => {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond nuit
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#15161F');
  bg.addColorStop(1, '#0E0F16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Points discrets
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = 30; x < W; x += 60) for (let y = 30; y < H; y += 60) ctx.fillRect(x, y, 2, 2);

  // Courbes lumineuses (violet -> bleu -> vert)
  function swoosh(y0, y1, y2, alpha, width) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, `rgba(139,92,246,${alpha * 0.3})`);
    g.addColorStop(0.5, `rgba(56,189,248,${alpha})`);
    g.addColorStop(1, `rgba(52,211,153,${alpha * 0.8})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(W * 0.3, y1, W * 0.6, y1 + 10, W, y2);
    ctx.stroke();
  }
  swoosh(500, 470, 330, 0.9, 4);
  swoosh(540, 515, 380, 0.28, 2);
  swoosh(105, 120, 130, 0.22, 2);

  // Mot-symbole
  const label = 'ETHO';
  ctx.font = '210px ArialRounded';
  ctx.textBaseline = 'alphabetic';
  const spacing = 34;
  let width = 0;
  for (const ch of label) width += ctx.measureText(ch).width + spacing;
  width -= spacing;
  let x = (W - width) / 2;
  const baseline = 292;
  const fill = ctx.createLinearGradient(x, 0, x + width, 0);
  fill.addColorStop(0, '#FFFFFF');
  fill.addColorStop(1, '#E4E4FF');
  ctx.fillStyle = fill;
  ctx.shadowColor = 'rgba(139,92,246,0.35)';
  ctx.shadowBlur = 40;
  for (const ch of label) {
    ctx.fillText(ch, x, baseline);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.shadowBlur = 0;

  // Liseré dégradé
  const line = ctx.createLinearGradient((W - width) / 2, 0, (W + width) / 2, 0);
  line.addColorStop(0, '#8B5CF6');
  line.addColorStop(0.5, '#38BDF8');
  line.addColorStop(1, '#34D399');
  ctx.fillStyle = line;
  ctx.beginPath();
  ctx.roundRect((W - width) / 2, 322, width, 6, 3);
  ctx.fill();

  // Six icônes de modules
  const icons = ['moderation', 'music', 'economy', 'ticket', 'level', 'security'];
  const size = 80;
  const gap = 50;
  const total = icons.length * size + (icons.length - 1) * gap;
  let ix = (W - total) / 2;
  for (const name of icons) {
    const img = await loadImage(path.join(iconsDir, `${name}.png`));
    ctx.drawImage(img, ix, 388, size, size);
    ix += size + gap;
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('Bannière écrite :', out, fs.statSync(out).size, 'octets');
})();
