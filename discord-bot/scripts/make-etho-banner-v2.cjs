// Bannière "Etho" v2 — typographie nette au lieu du mot-symbole en coup de pinceau lumineux (trop "IA générique"),
// même rangée d'icônes de modules (déjà de vrais badges dessinés, pas re-générés) sur 2 thèmes de couleurs réels.
// Usage : node scripts/make-etho-banner-v2.cjs <theme:asphalt|burgundy> [sortie.png]
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const W = 1500;
const H = 600;
const theme = process.argv[2] || 'asphalt';
const out = process.argv[3] || path.join(__dirname, `etho-banner-${theme}.png`);
const iconsDir = path.join(__dirname, '..', '..', 'ethone-next', 'public', 'bot-icons');

const THEMES = {
  // Palette "Asphalt / Paper" fournie par l'utilisateur.
  asphalt: {
    bg: '#302f2c',
    text: '#efede3',
    accent: '#efede3',
    sub: 'rgba(239,237,227,0.55)',
    font: 'EthoRounded',
    fontFile: fs.existsSync('C:\\Windows\\Fonts\\ARLRDBD.TTF') ? 'C:\\Windows\\Fonts\\ARLRDBD.TTF' : 'C:\\Windows\\Fonts\\arialbd.ttf',
    letterSpacing: 30,
    fontSize: 200,
  },
  // Palette "Burgundy / Night" fournie par l'utilisateur.
  burgundy: {
    bg: '#151515',
    text: '#f4e9ea',
    accent: '#c2304a',
    sub: 'rgba(244,233,234,0.5)',
    font: 'EthoCondensed',
    fontFile: 'C:\\Windows\\Fonts\\impact.ttf',
    letterSpacing: 14,
    fontSize: 210,
  },
};

const t = THEMES[theme];
if (!t) {
  console.error(`Thème inconnu : ${theme} (attendu: asphalt | burgundy)`);
  process.exit(1);
}

GlobalFonts.registerFromPath(t.fontFile, t.font);

(async () => {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond plat (pas de dégradé, pas de bruit de points) : moins "poster IA", plus carte de marque.
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // Mot-symbole en typographie nette, sans lueur/flou.
  const label = 'ETHO';
  ctx.font = `${t.fontSize}px ${t.font}`;
  ctx.textBaseline = 'alphabetic';
  let width = 0;
  for (const ch of label) width += ctx.measureText(ch).width + t.letterSpacing;
  width -= t.letterSpacing;
  let x = (W - width) / 2;
  const baseline = 268;
  ctx.fillStyle = t.text;
  for (const ch of label) {
    ctx.fillText(ch, x, baseline);
    x += ctx.measureText(ch).width + t.letterSpacing;
  }

  // Sous-texte
  ctx.font = '28px EthoSub';
  GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\segoeui.ttf', 'EthoSub');
  ctx.font = '28px EthoSub';
  const sub = 'MODÉRATION · MUSIQUE · TICKETS · NIVEAUX · ÉCONOMIE · SÉCURITÉ';
  const subWidth = ctx.measureText(sub).width;
  ctx.fillStyle = t.sub;
  ctx.fillText(sub, (W - subWidth) / 2, baseline + 46);

  // Barre pleine (2 tons, pas d'arc-en-ciel)
  const barWidth = width * 0.55;
  ctx.fillStyle = t.accent;
  ctx.beginPath();
  ctx.roundRect((W - barWidth) / 2, 340, barWidth, 5, 2.5);
  ctx.fill();

  // Rangée d'icônes de modules réelles (déjà de vrais badges dessinés, réutilisées telles quelles)
  const icons = ['moderation', 'music', 'ticket', 'level', 'economy', 'security'];
  const size = 78;
  const gap = 46;
  const total = icons.length * size + (icons.length - 1) * gap;
  let ix = (W - total) / 2;
  for (const name of icons) {
    const img = await loadImage(path.join(iconsDir, `${name}.png`));
    ctx.drawImage(img, ix, 420, size, size);
    ix += size + gap;
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('Bannière écrite :', out, fs.statSync(out).size, 'octets');
})();
