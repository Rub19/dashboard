import type { Image, SKRSContext2D } from '@napi-rs/canvas';

/** Petits outils de dessin partagés par les cartes image (bienvenue, rang). */
export type AvatarShape = 'circle' | 'rounded' | 'square';

export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function shapePath(c: SKRSContext2D, x: number, y: number, r: number, shape: AvatarShape): void {
  c.beginPath();
  if (shape === 'circle') c.arc(x, y, r, 0, Math.PI * 2);
  else c.roundRect(x - r, y - r, r * 2, r * 2, shape === 'rounded' ? r * 0.28 : r * 0.06);
  c.closePath();
}

/** Image en « cover » sur toute la zone W x H. */
export function drawCover(c: SKRSContext2D, img: Image, W: number, H: number): void {
  const s = Math.max(W / img.width, H / img.height);
  const w = img.width * s;
  const h = img.height * s;
  c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}
