// Avatar carré "Etho" assorti à la bannière v2 (même thème burgundy, même police condensée) :
// un seul glyphe "E" lisible même tout petit (avatar Discord affiché en rond dès 20px), plutôt
// que le mot complet "ETHO" qui deviendrait illisible à cette taille.
// Usage : node scripts/make-etho-avatar.cjs [sortie.png]
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const out = process.argv[2] || path.join(__dirname, 'etho-avatar.png');

const bg = '#151515';
const text = '#f5edee';
const accent = '#c2304a';

GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\impact.ttf', 'EthoCondensed');

const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// Discord recadre déjà l'avatar en rond à l'affichage, mais un PNG carré exporté tel quel laisse les coins
// plats visibles partout où ce recadrage automatique ne s'applique pas (aperçus, autres apps, l'image brute
// elle-même). On découpe donc le cercle nous-mêmes : tout ce qui est hors du disque reste transparent.
ctx.save();
ctx.beginPath();
ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
ctx.clip();

// Fond plat, identique à la bannière — pas de halo ni de dégradé.
ctx.fillStyle = bg;
ctx.fillRect(0, 0, SIZE, SIZE);

// Glyphe "E"
ctx.font = `${Math.round(SIZE * 0.56)}px EthoCondensed`;
ctx.textBaseline = 'alphabetic';
ctx.textAlign = 'center';
ctx.fillStyle = text;
const metrics = ctx.measureText('E');
const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
const baseline = SIZE / 2 + glyphHeight / 2 - metrics.actualBoundingBoxDescent - SIZE * 0.035;
ctx.fillText('E', SIZE / 2, baseline);

// Barre d'accent sous le glyphe, reprise de la bannière (même couleur, même proportion visuelle)
const barWidth = SIZE * 0.22;
ctx.fillStyle = accent;
ctx.beginPath();
ctx.roundRect(SIZE / 2 - barWidth / 2, SIZE * 0.74, barWidth, SIZE * 0.018, SIZE * 0.009);
ctx.fill();

ctx.restore();

fs.writeFileSync(out, canvas.toBuffer('image/png'));
console.log('Avatar écrit :', out, fs.statSync(out).size, 'octets');
