import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import { rgba } from '../../../utils/cardDraw.js';

/**
 * Carte de bienvenue / départ animée (GIF en boucle) pour les fonds par défaut : lueurs d'accent qui dérivent,
 * reflet lumineux qui balaie la carte, particules qui montent et halo qui pulse derrière l'avatar.
 * Le premier plan (avatar + textes) est dessiné une seule fois puis posé sur chaque image.
 * Tous les mouvements sont périodiques sur t ∈ [0, 1) : la boucle ne saute pas.
 */

export interface AnimatedCardOptions {
  /** Repère logique (800 × 300) et échelle de rendu. */
  width: number;
  height: number;
  scale: number;
  backgroundColor: string;
  accentColor: string;
  /** Centre et rayon de l'avatar dans le repère logique, pour le halo. */
  avatar: { x: number; y: number; r: number } | null;
  foreground: Canvas;
  frames?: number;
  delayMs?: number;
}

const TAU = Math.PI * 2;

// Particules déterministes (même carte = même animation).
function particles(count: number, w: number, h: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: count }, () => ({ x: rnd() * w, y: rnd() * h, r: 0.8 + rnd() * 2.2, phase: rnd(), speed: 1 }));
}

function drawFrame(c: SKRSContext2D, o: AnimatedCardOptions, t: number, dots: ReturnType<typeof particles>): void {
  const { width: W, height: H } = o;
  c.fillStyle = o.backgroundColor;
  c.fillRect(0, 0, W, H);

  // Deux lueurs d'accent qui dérivent lentement (ellipses périodiques).
  const blobs = [
    { x: W * 0.25 + Math.cos(t * TAU) * W * 0.12, y: H * 0.45 + Math.sin(t * TAU) * H * 0.18, r: H * 1.05, a: 0.2 },
    { x: W * 0.8 + Math.cos(t * TAU + Math.PI) * W * 0.1, y: H * 0.6 + Math.sin(t * TAU * 2) * H * 0.12, r: H * 0.9, a: 0.13 },
  ];
  for (const b of blobs) {
    const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, rgba(o.accentColor, b.a));
    g.addColorStop(1, rgba(o.accentColor, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  // Particules qui montent et réapparaissent en bas (boucle exacte : décalage entier de H par période).
  for (const d of dots) {
    const y = (((d.y - t * H * d.speed * 1) % H) + H) % H;
    const twinkle = 0.35 + 0.35 * Math.sin((t * 2 + d.phase) * TAU);
    c.fillStyle = rgba('#ffffff', twinkle * 0.5);
    c.beginPath();
    c.arc(d.x, y, d.r, 0, TAU);
    c.fill();
  }

  // Halo qui respire derrière l'avatar.
  if (o.avatar) {
    const { x, y, r } = o.avatar;
    const k = 0.5 + 0.5 * Math.sin(t * TAU);
    const g = c.createRadialGradient(x, y, r * 0.9, x, y, r * (1.45 + 0.25 * k));
    g.addColorStop(0, rgba(o.accentColor, 0.35 + 0.25 * k));
    g.addColorStop(1, rgba(o.accentColor, 0));
    c.fillStyle = g;
    c.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  }

  // Premier plan (avatar + textes).
  c.drawImage(o.foreground, 0, 0, W, H);

  // Reflet lumineux qui balaie la carte une fois par boucle (hors champ le reste du temps).
  const sweep = -W * 0.4 + t * W * 1.8;
  const g = c.createLinearGradient(sweep - 120, 0, sweep + 120, H);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// Tramage ordonné (Bayer 4 × 4) : une palette de 256 couleurs fait des aplats dans les dégradés ; ce léger bruit
// régulier les remplace par une transition fine, stable d'une image à l'autre (contrairement à un tramage aléatoire).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function orderedDither(data: Uint8ClampedArray, w: number, h: number, strength = 10): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = (BAYER[(x & 3) + ((y & 3) << 2)] / 16 - 0.5) * strength;
      const i = (y * w + x) * 4;
      data[i] += d;
      data[i + 1] += d;
      data[i + 2] += d;
    }
  }
}

/** Encode la carte animée en GIF. */
export function renderAnimatedCard(o: AnimatedCardOptions): Buffer {
  const frames = o.frames ?? 30;
  const delay = o.delayMs ?? 80;
  const pw = Math.round(o.width * o.scale);
  const ph = Math.round(o.height * o.scale);
  const canvas = createCanvas(pw, ph);
  const c = canvas.getContext('2d');
  c.scale(o.scale, o.scale);
  const dots = particles(28, o.width, o.height);

  const rgbaFrames: Uint8ClampedArray[] = [];
  for (let i = 0; i < frames; i++) {
    c.clearRect(0, 0, o.width, o.height);
    drawFrame(c, o, i / frames, dots);
    rgbaFrames.push(new Uint8ClampedArray(c.getImageData(0, 0, pw, ph).data));
  }

  // Une palette commune, calculée sur trois images réparties : couleurs stables d'une image à l'autre (pas de scintillement).
  const sample = new Uint8ClampedArray(pw * ph * 4 * 3);
  [0, Math.floor(frames / 3), Math.floor((2 * frames) / 3)].forEach((f, k) => sample.set(rgbaFrames[f], k * pw * ph * 4));
  const palette = gifenc.quantize(sample, 256);
  const gif = gifenc.GIFEncoder();
  for (const data of rgbaFrames) {
    orderedDither(data, pw, ph);
    gif.writeFrame(gifenc.applyPalette(data, palette), pw, ph, { palette, delay });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

/** Extension de fichier d'après la signature : les cartes animées sont des GIF. */
export function cardFileName(buf: Buffer, base = 'card'): string {
  return `${base}.${buf.subarray(0, 3).toString('ascii') === 'GIF' ? 'gif' : 'png'}`;
}
