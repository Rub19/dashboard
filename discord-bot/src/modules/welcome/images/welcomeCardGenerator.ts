import { createCanvas, loadImage, type Image, type SKRSContext2D } from '@napi-rs/canvas';
import { CARD_SIZE_PX, CardBackground, CardLayer, WelcomeImageConfig, WelcomeImageConfigSchema } from '../types/welcomeConfig.js';
import { VariableContext } from '../types/variables.js';
import { VariableParser } from '../variables/variableParser.js';
import { logger } from '../../../utils/logger.js';
import { safeText } from '../../../utils/canvasText.js';
import { FONT_STACK, registerCardFonts } from '../../../utils/cardFonts.js';
import { fetchPublicImage } from '../../../utils/publicImageFetch.js';
import { drawCover, rgba, shapePath } from '../../../utils/cardDraw.js';
import { renderAnimatedCard } from './animatedCard.js';
import { readLocalAsset } from '../storage/welcomeAssets.js';

// Carte animée : rendu 1000 × 375 (au lieu de 1600 × 600) pour garder un GIF léger.
const ANIM_SCALE = 1.25;
// Position de l'avatar de chaque modèle (repère 800 × 300), pour le halo animé.
const AVATAR_POS = { default: { x: 150, y: 150, r: 80 }, modern: { x: 400, y: 86, r: 56 }, minimal: { x: 92, y: 92, r: 44 }, gaming: { x: 128, y: 142, r: 80 } } as const;

// Repère de dessin 800 x 300, rendu en 2x (1600 x 600) pour rester net dans Discord, y compris en plein écran.
const W = 800;
const H = 300;
const SCALE = 2;

type Ctx = SKRSContext2D;

/** Police à la plus grande taille (≤ max) qui fait tenir `text` dans `maxWidth`. */
function fitFont(c: Ctx, text: string, weight: string, family: string, max: number, min: number, maxWidth: number): void {
  let size = max;
  c.font = `${weight} ${size}px ${family}`;
  while (size > min && c.measureText(text).width > maxWidth) {
    size -= 2;
    c.font = `${weight} ${size}px ${family}`;
  }
}

/** Coupe le texte avec « … » s'il dépasse encore à la taille minimale. */
function ellipsize(c: Ctx, text: string, maxWidth: number): string {
  if (c.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && c.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function drawAvatar(c: Ctx, img: Image | null, x: number, y: number, r: number, cfg: WelcomeImageConfig, initial: string, ring = true): void {
  if (ring) {
    shapePath(c, x, y, r + 6, cfg.avatarShape);
    c.fillStyle = cfg.accentColor;
    c.fill();
    shapePath(c, x, y, r + 2, cfg.avatarShape);
    c.fillStyle = cfg.backgroundColor;
    c.fill();
  }
  c.save();
  shapePath(c, x, y, r, cfg.avatarShape);
  c.clip();
  if (img) {
    c.drawImage(img, x - r, y - r, r * 2, r * 2);
  } else {
    // Avatar injoignable : initiale sur l'accent plutôt qu'un trou.
    c.fillStyle = rgba(cfg.accentColor, 0.85);
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.fillStyle = cfg.textColor;
    c.font = `600 ${Math.round(r)}px ${FONT_STACK.poppins}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(initial, x, y + r * 0.04);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }
  c.restore();
}

function drawBackground(c: Ctx, cfg: WelcomeImageConfig, bg: Image | null): void {
  c.fillStyle = cfg.backgroundColor;
  c.fillRect(0, 0, W, H);
  if (bg) {
    // Couverture (cover) puis voile pour garder le texte lisible.
    drawCover(c, bg, W, H);
    c.fillStyle = rgba(cfg.backgroundColor, cfg.overlayOpacity / 100);
    c.fillRect(0, 0, W, H);
  }
}

interface Texts {
  title: string;
  name: string;
  tag: string;
  server: string;
}

function layoutDefault(c: Ctx, cfg: WelcomeImageConfig, t: Texts, avatar: Image | null, family: string): void {
  // Lumière d'accent douce derrière l'avatar + liseré à gauche.
  const g = c.createRadialGradient(150, 150, 20, 150, 150, 300);
  g.addColorStop(0, rgba(cfg.accentColor, 0.16));
  g.addColorStop(1, rgba(cfg.accentColor, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = cfg.accentColor;
  c.fillRect(0, 0, 6, H);

  drawAvatar(c, avatar, 150, 150, 80, cfg, t.name.charAt(0).toUpperCase());

  const x = 265;
  const maxW = W - x - 40;
  c.fillStyle = cfg.accentColor;
  fitFont(c, t.title, '600', family, 22, 14, maxW);
  c.fillText(t.title, x, 108);
  c.fillStyle = cfg.textColor;
  fitFont(c, t.name, '700', family, 52, 26, maxW);
  c.fillText(ellipsize(c, t.name, maxW), x, 166);
  c.fillStyle = rgba(cfg.textColor, 0.72);
  fitFont(c, t.tag, '400', family, 20, 13, maxW);
  c.fillText(ellipsize(c, t.tag, maxW), x, 204);
  if (t.server) {
    c.fillStyle = rgba(cfg.textColor, 0.4);
    c.font = `400 14px ${family}`;
    c.fillText(ellipsize(c, t.server, maxW), x, 236);
  }
}

function layoutModern(c: Ctx, cfg: WelcomeImageConfig, t: Texts, avatar: Image | null, family: string): void {
  c.textAlign = 'center';
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(cfg.accentColor, 0.18));
  g.addColorStop(0.55, rgba(cfg.accentColor, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  drawAvatar(c, avatar, W / 2, 86, 56, cfg, t.name.charAt(0).toUpperCase());

  const maxW = W - 80;
  c.fillStyle = cfg.accentColor;
  fitFont(c, t.title, '600', family, 18, 12, maxW);
  c.fillText(t.title, W / 2, 176);
  c.fillStyle = cfg.textColor;
  fitFont(c, t.name, '700', family, 40, 22, maxW);
  c.fillText(ellipsize(c, t.name, maxW), W / 2, 220);
  c.fillStyle = rgba(cfg.textColor, 0.7);
  fitFont(c, [t.tag, t.server].filter(Boolean).join('  •  '), '400', family, 17, 12, maxW);
  c.fillText(ellipsize(c, [t.tag, t.server].filter(Boolean).join('  •  '), maxW), W / 2, 254);
  c.fillStyle = cfg.accentColor;
  c.beginPath();
  c.roundRect(W / 2 - 28, 270, 56, 4, 2);
  c.fill();
  c.textAlign = 'left';
}

function layoutMinimal(c: Ctx, cfg: WelcomeImageConfig, t: Texts, avatar: Image | null, family: string): void {
  drawAvatar(c, avatar, 92, 92, 44, cfg, t.name.charAt(0).toUpperCase(), false);
  shapePath(c, 92, 92, 45, cfg.avatarShape);
  c.strokeStyle = rgba(cfg.textColor, 0.14);
  c.lineWidth = 1.5;
  c.stroke();

  const x = 160;
  const maxW = W - x - 48;
  c.fillStyle = rgba(cfg.textColor, 0.6);
  fitFont(c, t.title, '600', family, 16, 11, maxW);
  c.fillText(t.title, x, 82);
  c.fillStyle = cfg.accentColor;
  c.fillRect(x, 96, 40, 3);
  c.fillStyle = cfg.textColor;
  fitFont(c, t.name, '700', family, 64, 28, W - 96);
  c.fillText(ellipsize(c, t.name, W - 96), 48, 214);
  c.fillStyle = rgba(cfg.textColor, 0.6);
  c.font = `400 17px ${family}`;
  c.fillText(ellipsize(c, [t.tag, t.server].filter(Boolean).join('  ·  '), W - 96), 48, 252);
}

function layoutGaming(c: Ctx, cfg: WelcomeImageConfig, t: Texts, avatar: Image | null, family: string): void {
  // Bande diagonale d'accent + rayures fines.
  c.fillStyle = cfg.accentColor;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(290, 0);
  c.lineTo(220, H);
  c.lineTo(0, H);
  c.closePath();
  c.fill();
  c.save();
  c.clip();
  c.strokeStyle = rgba('#000000', 0.12);
  c.lineWidth = 10;
  for (let i = -H; i < 320; i += 26) {
    c.beginPath();
    c.moveTo(i, H);
    c.lineTo(i + H, 0);
    c.stroke();
  }
  c.restore();

  // Avatar avec ombre décalée (pas de halo).
  shapePath(c, 136, 150, 84, cfg.avatarShape);
  c.fillStyle = rgba('#000000', 0.35);
  c.save();
  c.translate(8, 8);
  c.fill();
  c.restore();
  drawAvatar(c, avatar, 128, 142, 80, { ...cfg, accentColor: cfg.backgroundColor }, t.name.charAt(0).toUpperCase());

  const x = 300;
  const maxW = W - x - 36;
  c.fillStyle = cfg.accentColor;
  fitFont(c, t.title.toUpperCase(), '400', family, 30, 18, maxW);
  c.fillText(t.title.toUpperCase(), x, 104);
  c.fillStyle = cfg.textColor;
  fitFont(c, t.name.toUpperCase(), '700', family, 64, 30, maxW);
  c.fillText(ellipsize(c, t.name.toUpperCase(), maxW), x, 172);
  c.fillStyle = rgba(cfg.textColor, 0.75);
  c.font = `400 18px ${FONT_STACK.mono}`;
  c.fillText(ellipsize(c, t.tag, maxW), x, 210);
  if (t.server) {
    c.fillStyle = rgba(cfg.textColor, 0.45);
    c.font = `400 14px ${FONT_STACK.mono}`;
    c.fillText(ellipsize(c, t.server, maxW), x, 238);
  }
}

const LAYOUTS = { default: layoutDefault, modern: layoutModern, minimal: layoutMinimal, gaming: layoutGaming };

async function loadRemote(url: string): Promise<Image | null> {
  if (!url) return null;
  const buf = readLocalAsset(url) ?? (await fetchPublicImage(url));
  if (!buf) return null;
  try {
    return await loadImage(buf);
  } catch {
    return null;
  }
}

function paintBackground(c: Ctx, bg: CardBackground, img: Image | null, w: number, h: number): void {
  if (bg.type === 'gradient') {
    const a = ((bg.angle - 90) * Math.PI) / 180;
    const r = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2;
    const g = c.createLinearGradient(w / 2 - Math.cos(a) * r, h / 2 - Math.sin(a) * r, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    g.addColorStop(0, bg.color);
    g.addColorStop(1, bg.color2);
    c.fillStyle = g;
  } else {
    c.fillStyle = bg.color;
  }
  c.fillRect(0, 0, w, h);
  if (bg.type === 'image' && img) {
    drawCover(c, img, w, h);
    if (bg.overlay > 0) {
      c.fillStyle = rgba(bg.color, bg.overlay / 100);
      c.fillRect(0, 0, w, h);
    }
  }
}

function paintLayer(c: Ctx, layer: CardLayer, avatar: Image | null, images: Map<string, Image | null>, ctx: VariableContext): void {
  c.save();
  if (layer.type === 'text') {
    const raw = safeText(VariableParser.parse(layer.text, { ...ctx, mentionUser: false }));
    const text = layer.uppercase ? raw.toUpperCase() : raw;
    c.globalAlpha = layer.opacity;
    c.fillStyle = layer.color;
    c.textAlign = layer.align;
    c.textBaseline = 'middle';
    fitFont(c, text, layer.weight, FONT_STACK[layer.font], layer.size, Math.max(8, Math.round(layer.size / 3)), layer.maxWidth);
    c.fillText(ellipsize(c, text, layer.maxWidth), layer.x, layer.y);
  } else if (layer.type === 'avatar') {
    const r = layer.size / 2;
    const cx = layer.x + r;
    const cy = layer.y + r;
    if (layer.borderWidth > 0) {
      shapePath(c, cx, cy, r + layer.borderWidth, layer.shape);
      c.fillStyle = layer.borderColor;
      c.fill();
    }
    shapePath(c, cx, cy, r, layer.shape);
    c.clip();
    if (avatar) c.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
    else {
      c.fillStyle = '#5865F2';
      c.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  } else if (layer.type === 'image') {
    const img = images.get(layer.url) ?? null;
    if (img) {
      c.globalAlpha = layer.opacity;
      c.beginPath();
      c.roundRect(layer.x, layer.y, layer.w, layer.h, Math.min(layer.radius, layer.w / 2, layer.h / 2));
      c.clip();
      const s = Math.max(layer.w / img.width, layer.h / img.height);
      c.drawImage(img, layer.x + (layer.w - img.width * s) / 2, layer.y + (layer.h - img.height * s) / 2, img.width * s, img.height * s);
    }
  } else {
    c.globalAlpha = layer.opacity;
    c.fillStyle = layer.color;
    c.beginPath();
    if (layer.shape === 'circle') c.ellipse(layer.x + layer.w / 2, layer.y + layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
    else c.roundRect(layer.x, layer.y, layer.w, layer.h, Math.min(layer.radius, layer.w / 2, layer.h / 2));
    c.fill();
  }
  c.restore();
}

async function renderLayered(cfg: WelcomeImageConfig, avatar: Image | null, ctx: VariableContext): Promise<Buffer> {
  const [w, h] = CARD_SIZE_PX[cfg.size ?? 'large'];
  const bg = cfg.background ?? { type: 'gradient' as const, color: cfg.backgroundColor, color2: cfg.accentColor, angle: 135, url: '', overlay: 0 };
  const layers = (cfg.layers ?? []).filter((l) => l.visible);
  const urls = [...new Set([bg.type === 'image' ? bg.url : '', ...layers.map((l) => (l.type === 'image' ? l.url : ''))].filter(Boolean))];
  const images = new Map(await Promise.all(urls.map(async (u) => [u, await loadRemote(u)] as const)));
  const canvas = createCanvas(w, h);
  const c = canvas.getContext('2d');
  paintBackground(c, bg, images.get(bg.url) ?? null, w, h);
  for (const layer of layers) paintLayer(c, layer, avatar, images, ctx);
  return canvas.toBuffer('image/png');
}

export class WelcomeCardGenerator {
  /** Avatar téléchargé une fois : sert à la carte ET en pièce jointe de l'embed (une URL d'avatar Discord expire
   * dès que le membre change d'avatar, d'où les « Image failed to load » sur les anciens messages). */
  public static async loadAvatar(url: string): Promise<Buffer | null> {
    if (!url) return null;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }

  public static async generateCard(
    imageConfig: Partial<WelcomeImageConfig>,
    avatarUrl: string,
    ctx: VariableContext,
    avatarBuffer?: Buffer | null
  ): Promise<Buffer> {
    registerCardFonts();
    const cfg = WelcomeImageConfigSchema.parse(imageConfig);
    const family = FONT_STACK[cfg.font];

    const canvas = createCanvas(W * SCALE, H * SCALE);
    const c = canvas.getContext('2d');
    c.scale(SCALE, SCALE);

    let avatar: Image | null = null;
    try {
      const buf = avatarBuffer ?? (await WelcomeCardGenerator.loadAvatar(avatarUrl));
      if (buf) avatar = await loadImage(buf);
    } catch (err) {
      logger.warn('[WelcomeCard] Avatar illisible, initiale utilisée :', err);
    }

    if (cfg.layers) return renderLayered(cfg, avatar, ctx);

    let bg: Image | null = null;
    if (cfg.customBackgroundUrl) {
      const buf = await fetchPublicImage(cfg.customBackgroundUrl);
      if (buf) {
        try {
          bg = await loadImage(buf);
        } catch {
          bg = null;
        }
      }
    }


    const texts: Texts = {
      title: safeText(VariableParser.parse(cfg.titleText, ctx), 'BIENVENUE'),
      name: safeText(VariableParser.parse(cfg.subtitleText, ctx), safeText(ctx.displayName, 'Nouveau membre')),
      tag: safeText(VariableParser.parse(cfg.tagText, ctx)),
      server: cfg.showServerName ? safeText(ctx.guildName) : '',
    };
    // Fond par défaut animé : premier plan dessiné une fois sur un calque transparent, fond recalculé à chaque image.
    if (cfg.animated && !bg) {
      const fg = createCanvas(W * ANIM_SCALE, H * ANIM_SCALE);
      const fc = fg.getContext('2d');
      fc.scale(ANIM_SCALE, ANIM_SCALE);
      LAYOUTS[cfg.template](fc, cfg, texts, avatar, family);
      return renderAnimatedCard({
        width: W,
        height: H,
        scale: ANIM_SCALE,
        backgroundColor: cfg.backgroundColor,
        accentColor: cfg.accentColor,
        avatar: AVATAR_POS[cfg.template],
        foreground: fg,
      });
    }

    drawBackground(c, cfg, bg);
    LAYOUTS[cfg.template](c, cfg, texts, avatar, family);

    return canvas.toBuffer('image/png');
  }
}
